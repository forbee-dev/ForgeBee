#!/usr/bin/env node
/**
 * permission-guard.js — Smart permission system for Claude Code
 * Tiered: Blocklist → Allowlist → Cache → Ask User
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

  // ── Pattern definitions ─────────────────────────────────────────────

  const ALLOWLIST_PATTERNS = [
    // Shell builtins & scripting constructs
    /^cd( |$)/i,
    /^[a-zA-Z_][a-zA-Z0-9_]*=[^$`]*$/,   // variable assignment WITHOUT command substitution
    /^(local|readonly|declare) /i,         // variable declarations (not export — see blocklist)
    /^(true|false|:)$/,                    // no-ops
    /^\[+ /,                               // test: [ -f ... ] or [[ ... ]]
    /^test /i,                             // test command
    /^(return|exit|break|continue)( |$)/i, // flow control
    /^(basename|dirname|realpath) /i,      // path helpers
    /^(set|unset|shift) /i,               // shell builtins (not source/. — can execute files)
    // Git safe operations
    /^git (status|diff|log|show|branch|tag|remote|stash list|stash show|blame|shortlog)/i,
    /^git fetch/i,
    /^git pull$/i,
    /^git pull --rebase( |$)/i,
    /^git switch /i,
    /^git rebase --continue/i,
    /^git rebase --abort/i,
    /^git add /i,
    /^git commit /i,
    /^git stash$/i,
    /^git stash (push|save|apply|pop|list|show)/i,
    /^git push( |$)/i,                    // non-force push (force is blocklisted)
    // File reading & inspection (NOT find — supports -exec/-delete)
    /^(ls|cat|head|tail|wc|file|stat|which|where|type|readlink)/i,
    /^(pwd|echo|printf|date|whoami|hostname|uname)/i,
    // Package managers (read/install — NOT exec)
    /^(npm|npx|yarn|pnpm|bun) (test|run|install|ci|list|outdated|audit|info|view)/i,
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
    // Docker operations
    /^docker (ps|images|logs|inspect|stats|top|port|version|info|run|build|exec)/i,
    /^docker[ -]compose (ps|logs|config|up|down|build|exec|run)/i,
    // Build tools
    /^(webpack|vite|rollup|esbuild|turbo|nx)/i,
    // GitHub CLI (read-only)
    /^gh (pr|issue|repo|run) (list|view|status|checks|diff)/i,
    // Misc safe
    /^(curl|wget) .*(--head|-I|--dry-run)/i,
    /^(grep|rg|ag|ack|sed -n)/i,          // NOT awk (has system())
    /^(tree|du|df|free|top -b -n1)/i,
    /^(jq|yq|xmllint)/i,
    /^(node|python3?|ruby|php) [^-]/i,
    /^(diff|cmp|comm) /i,
    /^(sort|uniq|cut|tr|tee|column)/i,
    /^mkdir /i,
    /^touch /i,
  ];

  const BLOCKLIST_PATTERNS = [
    // Destructive filesystem
    /rm -rf \/$/i,
    /rm -rf ~/i,
    /rm -rf \/\*/i,
    /rm -rf \./i,
    /rm -rf \/home/i,
    /rm -rf \/etc/i,
    /rm -rf \/usr/i,
    /rm -rf \/var/i,
    // Git destructive
    /git push.*--force[^-]/i,
    /git push.*--force$/i,
    /git push .* -f /i,
    /git push .* -f$/i,
    /git reset --hard origin/i,
    /git clean -fd/i,
    /git.*--no-verify/i,
    // Database destructive
    /DROP TABLE/i,
    /DROP DATABASE/i,
    /DELETE FROM.*WHERE\s+(1|true|1\s*=\s*1)/i,
    /TRUNCATE /i,
    // System destructive
    /chmod 777/i,
    /chmod -R 777/i,
    /chown.*root/i,
    /mkfs\./i,
    /dd if=.*\/dev\//i,
    // Code execution via pipe/eval
    /curl.*\| *(bash|sh|zsh)/i,
    /wget.*\| *(bash|sh|zsh)/i,
    /eval.*\$\(/i,
    // Sudo escalation
    /sudo rm/i,
    /sudo chmod/i,
    /sudo chown/i,
    // Package publishing
    /npm publish/i,
    /pip install.*--break-system/i,
    // Inline code execution
    /node -e /i,
    /node --eval /i,
    /python3? -c /i,
    /ruby -e /i,
    /php -r /i,
    // Environment hijacking
    /^export\s+(PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH|RUBYLIB)=/i,
    // Process substitution (exfiltration vector)
    />\s*\(/,
    /<\s*\(/,
    // find with dangerous flags
    /find\s.*-exec/i,
    /find\s.*-execdir/i,
    /find\s.*-delete/i,
  ];

  // ── Helper functions ────────────────────────────────────────────────

  function splitCommands(cmd) {
    return cmd
      .split(/\s*(?:&&|\|\||;)\s*/)
      .flatMap(part => part.split(/\s*\|\s*/))
      .map(part => part.trim())
      .filter(Boolean);
  }

  function isAllowlisted(cmd) {
    return ALLOWLIST_PATTERNS.some(pattern => pattern.test(cmd));
  }

  function isBlocklisted(cmd) {
    return BLOCKLIST_PATTERNS.some(pattern => pattern.test(cmd));
  }

  function allow(reason) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: reason,
      },
    }));
    process.exit(0);
  }

  // ── TIER 0: BLOCKLIST (always check first) ──────────────────────────
  // Dangerous patterns block regardless of other rules
  if (isBlocklisted(COMMAND)) {
    console.error(`BLOCKED: Command matches dangerous pattern`);
    process.exit(2);
  }

  // Special check: DELETE FROM without WHERE clause
  if (/DELETE FROM/i.test(COMMAND) && !/DELETE FROM.*WHERE/i.test(COMMAND)) {
    console.error('BLOCKED: DELETE FROM without WHERE clause');
    process.exit(2);
  }

  // ── TIER 1: ALLOWLIST (instant approve) ─────────────────────────────
  // For simple commands, check directly
  // For chained/piped commands, check each subcommand
  const subcommands = splitCommands(COMMAND);
  if (subcommands.length > 0 && subcommands.every(isAllowlisted)) {
    allow('Allowlisted safe command');
  }

  // ── TIER 2: CACHE LOOKUP ────────────────────────────────────────────
  const CACHE_KEY = COMMAND.replace(/\/[^ ]*/g, '<path>').replace(/\d+/g, '<n>');

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache = JSON.parse(cacheContent);
    const cached = cache[CACHE_KEY];

    if (cached) {
      const NOW = Math.floor(Date.now() / 1000);
      let EXPIRE_TS = 0;

      try {
        EXPIRE_TS = Math.floor(new Date(cached.expires).getTime() / 1000);
      } catch (e) {
        EXPIRE_TS = 999999999999;
      }

      if (NOW < EXPIRE_TS) {
        if (cached.decision === 'allow') {
          allow('Previously approved (cached)');
        } else if (cached.decision === 'deny') {
          console.error('BLOCKED: Previously denied command pattern (cached)');
          process.exit(2);
        }
      }
    }
  } catch (e) {
    // Ignore cache errors
  }

  // ── TIER 3: ASK USER ───────────────────────────────────────────────
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: 'Unrecognized command — requesting user approval',
    },
  }));
  process.exit(0);
}

main().catch(() => process.exit(0));
