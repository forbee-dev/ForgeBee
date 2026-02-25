#!/bin/bash
# session-load.sh — Restore previous session context on SessionStart
# Reads latest session file and outputs context for Claude

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
SESSIONS_DIR="$PROJECT_DIR/.claude/sessions"
LATEST="$SESSIONS_DIR/latest.json"

# No previous session? Exit silently
if [[ ! -f "$LATEST" ]]; then
  exit 0
fi

# Read session data
SESSION=$(cat "$LATEST")
TIMESTAMP=$(echo "$SESSION" | jq -r '.timestamp // "unknown"')
BRANCH=$(echo "$SESSION" | jq -r '.git.branch // "unknown"')
CWD=$(echo "$SESSION" | jq -r '.workingDirectory // "unknown"')

# Format uncommitted changes
CHANGES=$(echo "$SESSION" | jq -r '.git.uncommittedChanges[]? // empty' 2>/dev/null | head -10)
COMMITS=$(echo "$SESSION" | jq -r '.git.recentCommits[]? // empty' 2>/dev/null | head -5)

# Check learnings file
LEARNINGS_FILE="$PROJECT_DIR/.claude/learnings/learnings.md"
RECENT_LEARNINGS=""
if [[ -f "$LEARNINGS_FILE" ]]; then
  RECENT_LEARNINGS=$(tail -20 "$LEARNINGS_FILE" 2>/dev/null || echo "")
fi

# Output session context (stdout gets injected into Claude's context)
echo "=== Previous Session Context ==="
echo "Last active: $TIMESTAMP"
echo "Branch: $BRANCH"
echo "Working directory: $CWD"

if [[ -n "$CHANGES" ]]; then
  echo ""
  echo "Uncommitted changes:"
  echo "$CHANGES"
fi

if [[ -n "$COMMITS" ]]; then
  echo ""
  echo "Recent commits:"
  echo "$COMMITS"
fi

if [[ -n "$RECENT_LEARNINGS" ]]; then
  echo ""
  echo "Recent learnings:"
  echo "$RECENT_LEARNINGS"
fi

echo "=== End Previous Session ==="

exit 0
