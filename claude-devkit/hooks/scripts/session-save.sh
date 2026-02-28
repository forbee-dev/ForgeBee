#!/bin/bash
# session-save.sh — Persist session state on Stop event
# Captures: timestamp, working dir, git state, session summary

set -euo pipefail

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

INPUT=$(cat)

# Prevent infinite loop if stop_hook_active
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

SESSIONS_DIR="$PROJECT_DIR/.claude/sessions"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FILENAME=$(date +"%Y-%m-%d-%H%M%S")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Gather git context (if in a git repo)
GIT_BRANCH=""
GIT_STATUS=""
GIT_LAST_COMMITS=""

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
  GIT_STATUS=$(git status --short 2>/dev/null | head -20 || echo "")
  GIT_LAST_COMMITS=$(git log --oneline -5 2>/dev/null || echo "")
fi

# Build session state JSON
jq -n \
  --arg sid "$SESSION_ID" \
  --arg ts "$TIMESTAMP" \
  --arg cwd "$(pwd)" \
  --arg branch "$GIT_BRANCH" \
  --arg status "$GIT_STATUS" \
  --arg commits "$GIT_LAST_COMMITS" \
  '{
    sessionId: $sid,
    timestamp: $ts,
    workingDirectory: $cwd,
    git: {
      branch: $branch,
      uncommittedChanges: ($status | split("\n") | map(select(length > 0))),
      recentCommits: ($commits | split("\n") | map(select(length > 0)))
    }
  }' > "$SESSIONS_DIR/$FILENAME.json"

# Maintain symlink to latest session
ln -sf "$FILENAME.json" "$SESSIONS_DIR/latest.json"

# Cleanup: keep only last 20 sessions
ls -t "$SESSIONS_DIR"/*.json 2>/dev/null | grep -v latest.json | tail -n +21 | xargs rm -f 2>/dev/null || true

exit 0
