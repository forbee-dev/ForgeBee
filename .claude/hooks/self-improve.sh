#!/bin/bash
# self-improve.sh — Capture learnings and patterns on session Stop
# Appends insights to learnings.md + structured index.jsonl for querying

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
INDEX_FILE="$LEARNINGS_DIR/index.jsonl"

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Gather what happened this session
GIT_DIFF_STAT=""
FILES_CHANGED=""
TOPICS=()
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_DIFF_STAT=$(git diff --stat HEAD~1 2>/dev/null | tail -1 || echo "")
  FILES_CHANGED=$(git diff --name-only HEAD~1 2>/dev/null | head -20 | tr '\n' ',' || echo "")

  # Auto-detect topics from changed files
  if echo "$FILES_CHANGED" | grep -qiE "test|spec|__test"; then TOPICS+=("testing"); fi
  if echo "$FILES_CHANGED" | grep -qiE "auth|login|session|token"; then TOPICS+=("auth"); fi
  if echo "$FILES_CHANGED" | grep -qiE "api|route|endpoint|controller"; then TOPICS+=("api"); fi
  if echo "$FILES_CHANGED" | grep -qiE "migration|schema|model|database"; then TOPICS+=("database"); fi
  if echo "$FILES_CHANGED" | grep -qiE "component|page|layout|style|css"; then TOPICS+=("frontend"); fi
  if echo "$FILES_CHANGED" | grep -qiE "deploy|docker|ci|cd|pipeline"; then TOPICS+=("devops"); fi
  if echo "$FILES_CHANGED" | grep -qiE "security|audit|permission|rbac"; then TOPICS+=("security"); fi
  if echo "$FILES_CHANGED" | grep -qiE "marketing|brand|content|seo"; then TOPICS+=("marketing"); fi
  if echo "$FILES_CHANGED" | grep -qiE "hook|agent|command|workflow"; then TOPICS+=("forgebee"); fi
fi

# Check permission cache for new entries
CACHE_FILE="$PROJECT_DIR/.claude/session-cache/permissions.json"
NEW_PERMISSIONS=""
if [[ -f "$CACHE_FILE" ]]; then
  CACHE_SIZE=$(wc -c < "$CACHE_FILE")
  if [[ "$CACHE_SIZE" -gt 3 ]]; then
    NEW_PERMISSIONS=$(jq -r 'keys[]' "$CACHE_FILE" 2>/dev/null | head -5 | tr '\n' ', ')
  fi
fi

# Check for active pipeline context
PIPELINE_CONTEXT=""
for f in "$PROJECT_DIR/.claude/checkpoints"/*.json; do
  [[ -f "$f" ]] || continue
  STATUS=$(jq -r '.status' "$f" 2>/dev/null)
  if [[ "$STATUS" == "in-progress" ]]; then
    PIPELINE=$(jq -r '.pipeline' "$f" 2>/dev/null)
    PHASE=$(jq -r '.current_phase' "$f" 2>/dev/null)
    FEATURE=$(jq -r '.feature' "$f" 2>/dev/null)
    PIPELINE_CONTEXT="$PIPELINE/$FEATURE (phase $PHASE)"
    break
  fi
done

TOPICS_STR=""
if [[ ${#TOPICS[@]} -gt 0 ]]; then
  TOPICS_STR=$(IFS=','; echo "${TOPICS[*]}")
fi

# ── Append to human-readable learnings.md ──────────────────────────────
cat >> "$LEARNINGS_FILE" << EOF
### Session: $TIMESTAMP
- Session ID: \`$SESSION_ID\`
${GIT_DIFF_STAT:+- Changes: $GIT_DIFF_STAT}
${FILES_CHANGED:+- Files: $FILES_CHANGED}
${TOPICS_STR:+- Topics: $TOPICS_STR}
${NEW_PERMISSIONS:+- Permission patterns learned: $NEW_PERMISSIONS}
${PIPELINE_CONTEXT:+- Pipeline: $PIPELINE_CONTEXT}

EOF

# ── Append to structured index (JSONL for fast querying) ───────────────
jq -nc \
  --arg ts "$TIMESTAMP" \
  --arg sid "$SESSION_ID" \
  --arg changes "$GIT_DIFF_STAT" \
  --arg files "$FILES_CHANGED" \
  --arg topics "$TOPICS_STR" \
  --arg permissions "$NEW_PERMISSIONS" \
  --arg pipeline "$PIPELINE_CONTEXT" \
  '{
    timestamp: $ts,
    session: $sid,
    changes: $changes,
    files: ($files | split(",") | map(select(length > 0))),
    topics: ($topics | split(",") | map(select(length > 0))),
    permissions: $permissions,
    pipeline: $pipeline
  }' >> "$INDEX_FILE"

# Trim learnings file if it gets too long (keep last 200 lines + header)
if [[ $(wc -l < "$LEARNINGS_FILE") -gt 250 ]]; then
  HEADER_LINES=$(head -6 "$LEARNINGS_FILE")
  RECENT_LINES=$(tail -200 "$LEARNINGS_FILE")
  echo "$HEADER_LINES" > "$LEARNINGS_FILE"
  echo "" >> "$LEARNINGS_FILE"
  echo "*[Older entries archived — see index.jsonl for full history]*" >> "$LEARNINGS_FILE"
  echo "" >> "$LEARNINGS_FILE"
  echo "$RECENT_LINES" >> "$LEARNINGS_FILE"
fi

# Trim index if over 500 entries (keep most recent)
if [[ -f "$INDEX_FILE" ]] && [[ $(wc -l < "$INDEX_FILE") -gt 500 ]]; then
  tail -400 "$INDEX_FILE" > "$INDEX_FILE.tmp"
  mv "$INDEX_FILE.tmp" "$INDEX_FILE"
fi

exit 0
