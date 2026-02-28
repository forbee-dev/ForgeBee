#!/bin/bash
# pm-sync.sh — Project Management state sync on SessionStart and Stop
# Ensures PM dashboards stay current and state.yaml timestamps are updated
#
# On SessionStart: validates state.yaml exists, reports active feature count
# On Stop: updates timestamps and flags stale features

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

STATE_FILE="$PROJECT_DIR/docs/pm/state.yaml"
INDEX_FILE="$PROJECT_DIR/docs/pm/index.md"
DECISIONS_FILE="$PROJECT_DIR/docs/pm/decisions.md"

# Exit silently if no PM system is set up
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Count active features (features not in "done" phase)
# Simple grep-based counting — works without yq
TOTAL_FEATURES=$(grep -c "^  - id: feat-" "$STATE_FILE" 2>/dev/null || echo "0")
DONE_FEATURES=$(grep -c "phase: done" "$STATE_FILE" 2>/dev/null || echo "0")
ACTIVE_FEATURES=$((TOTAL_FEATURES - DONE_FEATURES))

# Count blocked stories
BLOCKED_STORIES=$(grep -c "status: blocked" "$STATE_FILE" 2>/dev/null || echo "0")

# Report summary (this output is shown to Claude at session start/stop)
if [[ "$ACTIVE_FEATURES" -gt 0 ]]; then
  echo "PM State: $ACTIVE_FEATURES active feature(s), $DONE_FEATURES done"
  if [[ "$BLOCKED_STORIES" -gt 0 ]]; then
    echo "WARNING: $BLOCKED_STORIES blocked story/stories — run /pm for details"
  fi
else
  if [[ "$TOTAL_FEATURES" -gt 0 ]]; then
    echo "PM State: All $TOTAL_FEATURES feature(s) completed"
  fi
fi

# Check for stale features (updated more than 7 days ago)
# Only do this check if date command supports -d flag (Linux)
if date -d "2020-01-01" +%s &>/dev/null 2>&1; then
  NOW=$(date +%s)
  SEVEN_DAYS_AGO=$((NOW - 604800))

  while IFS= read -r line; do
    # Extract ISO date from updated field
    UPDATED=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1)
    if [[ -n "$UPDATED" ]]; then
      UPDATED_TS=$(date -d "$UPDATED" +%s 2>/dev/null || echo "0")
      if [[ "$UPDATED_TS" -lt "$SEVEN_DAYS_AGO" && "$UPDATED_TS" -gt 0 ]]; then
        echo "NOTICE: Stale feature detected (not updated in 7+ days) — run /pm to review"
        break
      fi
    fi
  done < <(grep "updated:" "$STATE_FILE" 2>/dev/null)
fi
