#!/usr/bin/env node
/**
 * permission-guard.js — Smart permission system for Claude Code
 * Tiered: Allowlist → Blocklist → Cache → Ask User
 *
 * Exit codes:
 *   0 = allow (with JSON permissionDecision)
 *   2 = block (dangerous command)
 *   0 + "ask" = defer to user
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs, readStdinSync } = require('./_common.js');

initDirs();

const input = readStdinSync();

let inputData = {};
try {
  inputData = JSON.parse(input);
} catch {
  process.exit(0);
}

const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/permissions.json');
const TOOL_NAME = inputData.tool_name || '';
const COMMAND = inputData.tool_input?.command || '';

// Only process Bash commands
if (TOOL_NAME !== 'Bash' || !COMMAND) {
  process.exit(0);
}

/**
 * Audit trail helper
 */
function logPermission(decision, tier, reason) {
  const auditData = {
    event_type: 'permission',
    command: COMMAND,
    decision,
    tier,
    reason
  };
  // Fire and forget audit trail
  const auditPath = path.join(__dirname, 'audit-trail.js');
  require('child_process').spawn('node', [auditPath], {
    stdio: ['pipe', 'ignore', 'ignore']
  }).stdin.write(JSON.stringify(auditData));
}

// ── TIER 1: ALLOWLIST (instant approve) ──────────────────────────────
// Safe read-only and standard dev commands
const ALLOWLIST_PATTERNS = [
  // Git read operations
  /^git (status|diff|log|show|branch|tag|remote|stash list|blame|shortlog)/i,
  /^git fetch/i,
  /^git pull$/i,
  /^git pull --rebase/i,
  /^git checkout [a-zA-Z]/i,
  /^git switch /i,
  /^git merge /i,
  /^git rebase [a-zA-Z]/i,
  /^git rebase$/i,
  /^git rebase --continue/i,
  /^git rebase --abort/i,
  /^git add /i,
  /^git commit /i,
  /^git stash/i,
  /^git push.*--force-with-lease/i,
  // File reading
  /^(ls|cat|head|tail|wc|file|stat|find|which|where|type|readlink)/i,
  /^(pwd|echo|printf|date|whoami|hostname|uname)/i,
  // Package managers (read/install)
  /^(npm|npx|yarn|pnpm|bun) (test|run|install|ci|list|outdated|audit|info|view|exec)/i,
  /^(pip|pip3) (install|list|show|freeze|check)/i,
  /^(cargo) (test|build|check|clippy|fmt|run|bench)/i,
  /^(go) (test|build|vet|fmt|run|mod)/i,
  /^(mvn|gradle) (test|build|compile|check)/i,
  /^(make|cmake)/i,
  // Linting & formatting
  /^(eslint|prettier|black|ruff|flake8|pylint|rubocop|stylelint|biome)/i,
  /^(tsc|tsconfig)/i,
  // Testing
  /^(pytest|jest|vitest|mocha|rspec|phpunit|go test|cargo test|dotnet test)/i,
  /^(playwright|cypress)/i,
  // Docker read operations
  /^docker (ps|images|logs|inspect|stats|top|port|version|info)/i,
  /^docker-compose (ps|logs|config)/i,
  // Build tools
  /^(webpack|vite|rollup|esbuild|turbo|nx)/i,
  // Misc safe
  /^(curl|wget) .*(--head|-I|--dry-run)/i,
  /^(grep|rg|ag|ack|sed -n|awk)/i,
  /^(tree|du|df|free|top -b -n1)/i,
  /^(jq|yq|xmllint)/i,
  /^(node|python3?|ruby|php) -e /i,
  /^(node|python3?|ruby|php) -c /i,
  /^(sort|uniq|cut|tr|tee|xargs|column)/i,
  /^mkdir /i,
  /^touch /i,
  /^cp /i,
  /^mv /i
];

for (const pattern of ALLOWLIST_PATTERNS) {
  if (pattern.test(COMMAND)) {
    logPermission('allow', 'allowlist', 'Matched safe pattern');
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'Allowlisted safe command'
      }
    }));
    process.exit(0);
  }
}

// ── TIER 2: BLOCKLIST (instant deny) ─────────────────────────────────
// Dangerous/destructive patterns
const BLOCKLIST_PATTERNS = [
  /rm -rf \/$/i,
  /rm -rf ~/i,
  /rm -rf \/\*/i,
  /rm -rf \./i,
  /rm -rf \/home/i,
  /rm -rf \/etc/i,
  /rm -rf \/usr/i,
  /rm -rf \/var/i,
  /git push.*--force[^-]/i,
  /git push.*--force$/i,
  /git push .* -f /i,
  /git push .* -f$/i,
  /git reset --hard origin/i,
  /git clean -fd/i,
  /DROP TABLE/i,
  /DROP DATABASE/i,
  /DELETE FROM.*WHERE 1/i,
  /TRUNCATE /i,
  /chmod 777/i,
  /chmod -R 777/i,
  /chown.*root/i,
  /mkfs\./i,
  /dd if=.*\/dev\//i,
  /curl.*\| *(bash|sh|zsh)/i,
  /wget.*\| *(bash|sh|zsh)/i,
  /eval.*\$\(/i,
  /sudo rm/i,
  /sudo chmod/i,
  /sudo chown/i,
  /--no-verify/i,
  /npm publish/i,
  /pip install.*--break-system/i
];

for (const pattern of BLOCKLIST_PATTERNS) {
  if (pattern.test(COMMAND)) {
    logPermission('deny', 'blocklist', 'Matched dangerous pattern');
    console.error(`BLOCKED: Command matches dangerous pattern: ${pattern}`);
    process.exit(2);
  }
}

// Special check: DELETE FROM without WHERE clause
if (/DELETE FROM/i.test(COMMAND) && !/DELETE FROM.*WHERE/i.test(COMMAND)) {
  logPermission('deny', 'blocklist', 'DELETE FROM without WHERE');
  console.error('BLOCKED: DELETE FROM without WHERE clause');
  process.exit(2);
}

// ── TIER 3: CACHE LOOKUP ─────────────────────────────────────────────
// Normalize command for cache key (strip variable parts like paths)
const cacheKey = COMMAND
  .replace(/\/[^\s]*/g, '<path>')
  .replace(/\d+/g, '<n>');

let cacheData = {};
try {
  cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
} catch {
  // empty
}

const cached = cacheData[cacheKey];
if (cached) {
  const cachedDecision = cached.decision || '';
  const cachedExpires = cached.expires || '';

  const now = Math.floor(Date.now() / 1000);
  let expireTs = 999999999999;

  try {
    expireTs = Math.floor(new Date(cachedExpires).getTime() / 1000);
  } catch {
    // ignore
  }

  if (now < expireTs) {
    if (cachedDecision === 'allow') {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: 'Previously approved (cached)'
        }
      }));
      process.exit(0);
    } else if (cachedDecision === 'deny') {
      console.error('BLOCKED: Previously denied command pattern (cached)');
      process.exit(2);
    }
  }
}

// ── TIER 4: ASK USER ─────────────────────────────────────────────────
// Command not in allowlist or blocklist — defer to user
logPermission('ask', 'user-prompt', 'Unrecognized command');
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'ask',
    permissionDecisionReason: 'Unrecognized command — requesting user approval'
  }
}));
process.exit(0);
