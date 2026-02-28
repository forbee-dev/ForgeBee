#!/bin/bash
# permission-guard.sh — Smart permission system for Claude Code
# Tiered: Allowlist → Blocklist → Cache → Ask User
#
# Exit codes:
#   0 = allow (with JSON permissionDecision)
#   2 = block (dangerous command)
#   0 + "ask" = defer to user

set -euo pipefail

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

INPUT=$(cat)
CACHE_FILE="$PROJECT_DIR/.claude/session-cache/permissions.json"
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only process Bash commands
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi



# ── TIER 1: ALLOWLIST (instant approve) ──────────────────────────────
# Safe read-only and standard dev commands
ALLOWLIST_PATTERNS=(
  # Git read operations
  "^git (status|diff|log|show|branch|tag|remote|stash list|blame|shortlog)"
  "^git fetch"
  "^git pull$"
  "^git pull --rebase"
  "^git checkout [a-zA-Z]"
  "^git switch "
  "^git merge "
  "^git rebase [a-zA-Z]"
  "^git rebase$"
  "^git rebase --continue"
  "^git rebase --abort"
  "^git add "
  "^git commit "
  "^git stash"
  "^git push.*--force-with-lease"
  # File reading
  "^(ls|cat|head|tail|wc|file|stat|find|which|where|type|readlink)"
  "^(pwd|echo|printf|date|whoami|hostname|uname)"
  # Package managers (read/install)
  "^(npm|npx|yarn|pnpm|bun) (test|run|install|ci|list|outdated|audit|info|view|exec)"
  "^(pip|pip3) (install|list|show|freeze|check)"
  "^(cargo) (test|build|check|clippy|fmt|run|bench)"
  "^(go) (test|build|vet|fmt|run|mod)"
  "^(mvn|gradle) (test|build|compile|check)"
  "^(make|cmake)"
  # Linting & formatting
  "^(eslint|prettier|black|ruff|flake8|pylint|rubocop|stylelint|biome)"
  "^(tsc|tsconfig)"
  # Testing
  "^(pytest|jest|vitest|mocha|rspec|phpunit|go test|cargo test|dotnet test)"
  "^(playwright|cypress)"
  # Docker read operations
  "^docker (ps|images|logs|inspect|stats|top|port|version|info)"
  "^docker-compose (ps|logs|config)"
  # Build tools
  "^(webpack|vite|rollup|esbuild|turbo|nx)"
  # Misc safe
  "^(curl|wget) .*(--head|-I|--dry-run)"
  "^(grep|rg|ag|ack|sed -n|awk)"
  "^(tree|du|df|free|top -b -n1)"
  "^(jq|yq|xmllint)"
  "^(node|python3?|ruby|php) -e "
  "^(node|python3?|ruby|php) -c "
  "^(sort|uniq|cut|tr|tee|xargs|column)"
  "^mkdir "
  "^touch "
  "^cp "
  "^mv "
)

for pattern in "${ALLOWLIST_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern"; then
    # Auto-approve
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Allowlisted safe command"}}'
    exit 0
  fi
done

# ── TIER 2: BLOCKLIST (instant deny) ─────────────────────────────────
# Dangerous/destructive patterns
BLOCKLIST_PATTERNS=(
  "rm -rf /$"
  "rm -rf ~"
  "rm -rf /\\*"
  "rm -rf \\."
  "rm -rf /home"
  "rm -rf /etc"
  "rm -rf /usr"
  "rm -rf /var"
  "git push.*--force[^-]"
  "git push.*--force$"
  "git push .* -f "
  "git push .* -f$"
  "git reset --hard origin"
  "git clean -fd"
  "DROP TABLE"
  "DROP DATABASE"
  "DELETE FROM.*WHERE 1"
  "TRUNCATE "
  "chmod 777"
  "chmod -R 777"
  "chown.*root"
  "mkfs\\."
  "dd if=.*/dev/"
  "curl.*\\| *(bash|sh|zsh)"
  "wget.*\\| *(bash|sh|zsh)"
  "eval.*\\$\\("
  "sudo rm"
  "sudo chmod"
  "sudo chown"
  "--no-verify"
  "npm publish"
  "pip install.*--break-system"
)

for pattern in "${BLOCKLIST_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern"; then
    echo "BLOCKED: Command matches dangerous pattern: $pattern" >&2
    exit 2
  fi
done

# Special check: DELETE FROM without WHERE clause (can't express as ERE negative lookahead)
if echo "$COMMAND" | grep -qEi "DELETE FROM" && ! echo "$COMMAND" | grep -qEi "DELETE FROM.*WHERE"; then
  echo "BLOCKED: DELETE FROM without WHERE clause" >&2
  exit 2
fi

# ── TIER 3: CACHE LOOKUP ─────────────────────────────────────────────
# Normalize command for cache key (strip variable parts like paths)
CACHE_KEY=$(echo "$COMMAND" | sed 's|/[^ ]*|<path>|g' | sed 's|[0-9]\+|<n>|g')
CACHED=$(jq -r --arg key "$CACHE_KEY" '.[$key] // empty' "$CACHE_FILE" 2>/dev/null)

if [[ -n "$CACHED" ]]; then
  CACHED_DECISION=$(echo "$CACHED" | jq -r '.decision // empty')
  CACHED_EXPIRES=$(echo "$CACHED" | jq -r '.expires // empty')
  NOW=$(date -u +%s 2>/dev/null || echo "0")
  # macOS (BSD) uses -jf, GNU uses -d
  EXPIRE_TS=$(date -d "$CACHED_EXPIRES" +%s 2>/dev/null \
    || date -jf "%Y-%m-%dT%H:%M:%SZ" "$CACHED_EXPIRES" +%s 2>/dev/null \
    || echo "999999999999")

  if [[ "$NOW" -lt "$EXPIRE_TS" ]]; then
    if [[ "$CACHED_DECISION" == "allow" ]]; then
      echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Previously approved (cached)"}}'
      exit 0
    elif [[ "$CACHED_DECISION" == "deny" ]]; then
      echo "BLOCKED: Previously denied command pattern (cached)" >&2
      exit 2
    fi
  fi
fi

# ── TIER 4: ASK USER ─────────────────────────────────────────────────
# Command not in allowlist or blocklist — defer to user
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Unrecognized command — requesting user approval"}}'
exit 0
