#!/bin/bash
# checkpoint.sh - Phase-level checkpointing for durability
# Saves workflow/growth pipeline state at each phase transition
# Enables crash recovery: resume from last completed phase instead of restarting

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

CHECKPOINT_DIR="$PROJECT_DIR/.claude/checkpoints"
mkdir -p "$CHECKPOINT_DIR" 2>/dev/null || true

INPUT=$(cat)
ACTION=$(echo "$INPUT" | jq -r '.action // "save"')

case "$ACTION" in

save)
  PIPELINE=$(echo "$INPUT" | jq -r '.pipeline // "workflow"')
  FEATURE=$(echo "$INPUT" | jq -r '.feature // "unknown"')
  PHASE=$(echo "$INPUT" | jq -r '.phase // "unknown"')
  PHASE_NUM=$(echo "$INPUT" | jq -r '.phase_number // 0')
  CP_STATUS=$(echo "$INPUT" | jq -r '.status // "completed"')
  ARTIFACTS=$(echo "$INPUT" | jq -r '.artifacts // "[]"')
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  SAFE_FEATURE=$(echo "$FEATURE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
  CHECKPOINT_FILE="$CHECKPOINT_DIR/${PIPELINE}-${SAFE_FEATURE}.json"

  if [[ -f "$CHECKPOINT_FILE" ]]; then
    EXISTING=$(cat "$CHECKPOINT_FILE")
  else
    EXISTING=$(jq -n \
      --arg pipeline "$PIPELINE" \
      --arg feature "$FEATURE" \
      --arg started "$TIMESTAMP" \
      '{pipeline: $pipeline, feature: $feature, started: $started, phases: [], current_phase: 0, status: "in-progress"}')
  fi

  RESULT=$(echo "$EXISTING" | jq \
    --arg phase "$PHASE" \
    --argjson phase_num "$PHASE_NUM" \
    --arg cp_status "$CP_STATUS" \
    --arg ts "$TIMESTAMP" \
    --argjson artifacts "$ARTIFACTS" \
    '.phases += [{name: $phase, number: $phase_num, status: $cp_status, completed_at: $ts, artifacts: $artifacts}] | .current_phase = $phase_num | .last_updated = $ts | .status = (if $cp_status == "failed" then "needs-recovery" else "in-progress" end)')

  echo "$RESULT" | jq '.' > "$CHECKPOINT_FILE"
  echo "Checkpoint saved: $PIPELINE/$FEATURE - Phase $PHASE_NUM ($PHASE) $CP_STATUS"
  ;;

load)
  PIPELINE=$(echo "$INPUT" | jq -r '.pipeline // "workflow"')
  FEATURE=$(echo "$INPUT" | jq -r '.feature // "unknown"')
  SAFE_FEATURE=$(echo "$FEATURE" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
  CHECKPOINT_FILE="$CHECKPOINT_DIR/${PIPELINE}-${SAFE_FEATURE}.json"

  if [[ -f "$CHECKPOINT_FILE" ]]; then
    CHECKPOINT=$(cat "$CHECKPOINT_FILE")
    CP_STATUS=$(echo "$CHECKPOINT" | jq -r '.status')
    CURRENT=$(echo "$CHECKPOINT" | jq -r '.current_phase')
    LAST_PHASE=$(echo "$CHECKPOINT" | jq -r '.phases[-1].name // "none"')
    LAST_STATUS=$(echo "$CHECKPOINT" | jq -r '.phases[-1].status // "none"')

    echo "=== Pipeline Checkpoint Found ==="
    echo "Pipeline: $PIPELINE"
    echo "Feature: $FEATURE"
    echo "Status: $CP_STATUS"
    echo "Last completed phase: $CURRENT ($LAST_PHASE) - $LAST_STATUS"
    echo ""

    case "$CP_STATUS" in
      needs-recovery)
        echo "WARNING: RECOVERY NEEDED - Phase $LAST_PHASE failed."
        echo "Recommendation: Resume from phase $CURRENT"
        ;;
      in-progress)
        NEXT=$((CURRENT + 1))
        echo "Resume from phase $NEXT (last completed: $LAST_PHASE)"
        ;;
      done)
        echo "Pipeline completed. No recovery needed."
        ;;
    esac

    echo ""
    echo "=== Phase History ==="
    echo "$CHECKPOINT" | jq -r '.phases[] | "  Phase \(.number): \(.name) - \(.status) at \(.completed_at)"'
  else
    echo "No checkpoint found for $PIPELINE/$FEATURE"
    echo "Starting fresh from Phase 1"
  fi
  ;;

list)
  echo "=== Active Pipeline Checkpoints ==="
  for f in "$CHECKPOINT_DIR"/*.json; do
    [[ -f "$f" ]] || continue
    PIPELINE=$(jq -r '.pipeline' "$f")
    FEATURE=$(jq -r '.feature' "$f")
    CP_STATUS=$(jq -r '.status' "$f")
    PHASE=$(jq -r '.current_phase' "$f")
    UPDATED=$(jq -r '.last_updated // "unknown"' "$f")
    echo "  [$CP_STATUS] $PIPELINE: $FEATURE - Phase $PHASE (updated: $UPDATED)"
  done
  ;;

cleanup)
  for f in "$CHECKPOINT_DIR"/*.json; do
    [[ -f "$f" ]] || continue
    if [[ -n "$(find "$f" -mtime +7 2>/dev/null)" ]]; then
      file_status=$(jq -r '.status' "$f" 2>/dev/null)
      if [[ "$file_status" == "done" ]]; then
        rm -f "$f"
        echo "Cleaned: $(basename "$f")"
      fi
    fi
  done
  ;;

*)
  echo "Unknown action: $ACTION (expected: save, load, list, cleanup)"
  exit 1
  ;;

esac

exit 0
