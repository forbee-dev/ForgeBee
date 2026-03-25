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

// ── S-006: Load user-configurable glob allowlist from settings ──────
function loadCustomAllowlist() {
  try {
    const settingsPath = path.join(PROJECT_DIR, '.claude/settings.json');
    if (!fs.existsSync(settingsPath)) return [];
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const patterns = settings?.forgebee?.permissionAllowlist;
    if (!Array.isArray(patterns)) return [];
    return patterns.filter(p => typeof p === 'string' && p.length > 0);
  } catch (e) {
    return [];
  }
}

/**
 * Simple glob matcher — supports * (any chars) and ? (single char)
 * No dependencies required.
 */
function globMatch(pattern, str) {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regex}$`, 'i').test(str);
}

const CUSTOM_ALLOWLIST = loadCustomAllowlist();

// ── Read stdin JSON ───────────────────────────────────────────────────
async function main() {
  // S-007: Cache flush (must be inside main, not at module load time)
  if (process.env.FORGEBEE_FLUSH_CACHE === '1') {
    try { fs.unlinkSync(CACHE_FILE); } catch (e) { /* already gone */ }
    console.error('[permission-guard] cache flushed');
  }

  const PERMISSION_MODE = common.detectPermissionMode();
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
    // Command substitution (arbitrary execution inside $(...) or backticks)
    /\$\([^)]*rm\s/i,
    /\$\([^)]*curl\s/i,
    /\$\([^)]*wget\s/i,
    /\$\([^)]*dd\s/i,
    /\$\([^)]*chmod\s/i,
    /`[^`]*rm\s/i,
    /`[^`]*curl\s/i,
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

  /**
   * Normalizes a command for cache key matching.
   * Preserves command verb and flags, normalizes paths and standalone numbers.
   */
  function normalizeCacheKey(cmd) {
    const parts = cmd.split(/\s+/);
    const normalized = parts.map((p) => {
      // Preserve flags
      if (p.startsWith('-')) return p;
      // Normalize absolute paths
      if (p.startsWith('/')) return '<path>';
      // Normalize relative paths (./... and ../...)
      if (p.startsWith('./') || p.startsWith('../')) return '<path>';
      // Normalize home-relative paths
      if (p.startsWith('~/')) return '<path>';
      // Normalize standalone numbers (not embedded in words)
      if (/^\d+$/.test(p)) return '<n>';
      // Normalize numbers prefixed with # (issue references)
      return p.replace(/#\d+/g, '#<n>');
    });
    return normalized.join(' ');
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

  // ── TIER 0: BLOCKLIST (always active in ALL modes — non-negotiable) ──
  if (isBlocklisted(COMMAND)) {
    console.error(`BLOCKED: Command matches dangerous pattern`);
    process.exit(2);
  }

  // Special check: DELETE FROM without WHERE clause
  if (/DELETE FROM/i.test(COMMAND) && !/DELETE FROM.*WHERE/i.test(COMMAND)) {
    console.error('BLOCKED: DELETE FROM without WHERE clause');
    process.exit(2);
  }

  // ── MODE-AWARE FAST PATH ────────────────────────────────────────────
  // In bypass mode: only Tier 0 blocklist runs, everything else passes through
  if (PERMISSION_MODE === 'bypassPermissions') {
    process.exit(0);
  }

  // In auto mode: skip Tier 1 (allowlist) and Tier 3 (ask) — let Claude's
  // AI safety classifier handle non-blocklisted commands. Keep Tier 2 (cache)
  // for ForgeBee's own patterns.
  if (PERMISSION_MODE === 'auto') {
    // Tier 2 cache still runs in auto mode for audit/tracking purposes
    const CACHE_KEY = normalizeCacheKey(COMMAND);
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
        if (NOW < EXPIRE_TS && cached.decision === 'deny') {
          console.error('BLOCKED: Previously denied command pattern (cached)');
          process.exit(2);
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    // Pass through to Claude's AI safety classifier
    process.exit(0);
  }

  // ── DEFAULT MODE: Full tier cascade ─────────────────────────────────

  // ── TIER 1: ALLOWLIST (instant approve) ─────────────────────────────
  const subcommands = splitCommands(COMMAND);
  if (subcommands.length > 0 && subcommands.every(isAllowlisted)) {
    allow('Allowlisted safe command');
  }

  // ── TIER 1b: CUSTOM GLOB ALLOWLIST (from settings.json) ───────────
  if (CUSTOM_ALLOWLIST.length > 0 && CUSTOM_ALLOWLIST.some(p => globMatch(p, COMMAND))) {
    allow('Custom allowlist match (settings.json)');
  }

  // ── TIER 2: CACHE LOOKUP ────────────────────────────────────────────
  const CACHE_KEY = normalizeCacheKey(COMMAND);

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
