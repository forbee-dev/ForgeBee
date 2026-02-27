#!/bin/bash
# self-improve.sh — Capture learnings and patterns on session Stop
# Appends insights to learnings.md for future reference

set -euo pipefail

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

INPUT=$(cat)

# Prevent infinite loop
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

LEARNINGS_DIR="$PROJECT_DIR/.claude/learnings"
LEARNINGS_FILE="$LEARNINGS_DIR/learnings.md"


fi

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Gather what happened this session
GIT_DIFF_STAT=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_DIFF_STAT=$(git diff --stat HEAD~1 2>/dev/null | tail -1 || echo "")
fi

# Check permission cache for new entries (commands we learned about)
CACHE_FILE="$PROJECT_DIR/.claude/session-cache/permissions.json"
NEW_PERMISSIONS=""
if [[ -f "$CACHE_FILE" ]]; then
  CACHE_SIZE=$(wc -c < "$CACHE_FILE")
  if [[ "$CACHE_SIZE" -gt 3 ]]; then
    NEW_PERMISSIONS=$(jq -r 'keys[]' "$CACHE_FILE" 2>/dev/null | head -5 | tr '\n' ', ')
  fi
fi

# Append session entry
cat >> "$LEARNINGS_FILE" << EOF
### Session: $TIMESTAMP
- Session ID: \`$SESSION_ID\`
${GIT_DIFF_STAT:+- Changes: $GIT_DIFF_STAT}
${NEW_PERMISSIONS:+- Permission patterns learned: $NEW_PERMISSIONS}

EOF

# Trim learnings file if it gets too long (keep last 200 lines + header)
if [[ $(wc -l < "$LEARNINGS_FILE") -gt 250 ]]; then
  # Keep the header (first 6 lines) and last 200 lines
  HEADER_LINES=$(head -6 "$LEARNINGS_FILE")
  RECENT_LINES=$(tail -200 "$LEARNINGS_FILE")
  echo "$HEADER_LINES" > "$LEARNINGS_FILE"
  echo "" >> "$LEARNINGS_FILE"
  echo "*[Older entries archived]*" >> "$LEARNINGS_FILE"
  echo "" >> "$LEARNINGS_FILE"
  echo "$RECENT_LINES" >> "$LEARNINGS_FILE"
fi

exit 0
