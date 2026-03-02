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
const common = require('./_common.js');

// ── Bootstrap: resolve paths for both plugin and legacy installs ──────
const PROJECT_DIR = common.getProjectDir();
const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/permissions.json');

// ── Read stdin JSON ───────────────────────────────────────────────────
async function main() {
  const input = await common.readStdinJson();

  if (!input) {
    process.exit(0);
  }

  const TOOL_NAME = input.tool_name;
  const COMMAND = input.tool_input?.command;

  // Only process Bash commands
  if (TOOL_NAME !== 'Bash' || !COMMAND) {
    process.exit(0);
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
    /^mv /i,
  ];

  for (const pattern of ALLOWLIST_PATTERNS) {
    if (pattern.test(COMMAND)) {
      // Auto-approve
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: 'Allowlisted safe command',
          },
        })
      );
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
    /pip install.*--break-system/i,
  ];

  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(COMMAND)) {
      console.error(`BLOCKED: Command matches dangerous pattern: ${pattern}`);
      process.exit(2);
    }
  }

  // Special check: DELETE FROM without WHERE clause
  if (/DELETE FROM/i.test(COMMAND) && !/DELETE FROM.*WHERE/i.test(COMMAND)) {
    console.error('BLOCKED: DELETE FROM without WHERE clause');
    process.exit(2);
  }

  // ── TIER 3: CACHE LOOKUP ─────────────────────────────────────────────
  // Normalize command for cache key (strip variable parts like paths)
  const CACHE_KEY = COMMAND.replace(/\/[^ ]*/g, '<path>').replace(/\d+/g, '<n>');

  let cachedDecision = null;
  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(cacheContent);
    const cached = cache[CACHE_KEY];

    if (cached) {
      const CACHED_DECISION = cached.decision;
      const CACHED_EXPIRES = cached.expires;
      const NOW = Math.floor(Date.now() / 1000);
      let EXPIRE_TS = 0;

      // Parse ISO 8601 date
      try {
        EXPIRE_TS = Math.floor(new Date(CACHED_EXPIRES).getTime() / 1000);
      } catch (e) {
        EXPIRE_TS = 999999999999;
      }

      if (NOW < EXPIRE_TS) {
        if (CACHED_DECISION === 'allow') {
          console.log(
            JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Previously approved (cached)',
              },
            })
          );
          process.exit(0);
        } else if (CACHED_DECISION === 'deny') {
          console.error('BLOCKED: Previously denied command pattern (cached)');
          process.exit(2);
        }
      }
    }
  } catch (e) {
    // Ignore cache errors
  }

  // ── TIER 4: ASK USER ─────────────────────────────────────────────────
  // Command not in allowlist or blocklist — defer to user
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: 'Unrecognized command — requesting user approval',
      },
    })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
