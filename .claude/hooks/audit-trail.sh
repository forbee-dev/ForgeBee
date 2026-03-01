#!/bin/bash
# audit-trail.sh — Append-only governance audit log
# Records every permission decision, debate ruling, verification result,
# and escalation with timestamp, actor, and context
#
# Provides accountability and traceability for all agent actions

set -euo pipefail

# ── Bootstrap ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

AUDIT_DIR="$PROJECT_DIR/.claude/audit"
mkdir -p "$AUDIT_DIR" 2>/dev/null || true

# Rotate audit files monthly
AUDIT_FILE="$AUDIT_DIR/audit-$(date +%Y-%m).jsonl"

INPUT=$(cat)
EVENT_TYPE=$(echo "$INPUT" | jq -r '.event_type // "unknown"')

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# ── PERMISSION DECISION ────────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "permission" ]]; then
  COMMAND=$(echo "$INPUT" | jq -r '.command // ""')
  DECISION=$(echo "$INPUT" | jq -r '.decision // ""')
  TIER=$(echo "$INPUT" | jq -r '.tier // ""')
  REASON=$(echo "$INPUT" | jq -r '.reason // ""')

  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg sid "$SESSION_ID" \
    --arg type "permission" \
    --arg command "$COMMAND" \
    --arg decision "$DECISION" \
    --arg tier "$TIER" \
    --arg reason "$REASON" \
    '{
      timestamp: $ts,
      session: $sid,
      type: $type,
      command: $command,
      decision: $decision,
      tier: $tier,
      reason: $reason
    }' >> "$AUDIT_FILE"
  exit 0
fi

# ── DEBATE RULING ──────────────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "debate" ]]; then
  DEBATE_TYPE=$(echo "$INPUT" | jq -r '.debate_type // ""')
  ITEM=$(echo "$INPUT" | jq -r '.item // ""')
  RULING=$(echo "$INPUT" | jq -r '.ruling // ""')
  SEVERITY=$(echo "$INPUT" | jq -r '.severity // ""')
  JUDGE=$(echo "$INPUT" | jq -r '.judge // ""')
  FEATURE=$(echo "$INPUT" | jq -r '.feature // ""')

  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg sid "$SESSION_ID" \
    --arg type "debate" \
    --arg debate "$DEBATE_TYPE" \
    --arg item "$ITEM" \
    --arg ruling "$RULING" \
    --arg severity "$SEVERITY" \
    --arg judge "$JUDGE" \
    --arg feature "$FEATURE" \
    '{
      timestamp: $ts,
      session: $sid,
      type: $type,
      debate_type: $debate,
      item: $item,
      ruling: $ruling,
      severity: $severity,
      judge: $judge,
      feature: $feature
    }' >> "$AUDIT_FILE"
  exit 0
fi

# ── VERIFICATION RESULT ────────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "verification" ]]; then
  FEATURE=$(echo "$INPUT" | jq -r '.feature // ""')
  VERDICT=$(echo "$INPUT" | jq -r '.verdict // ""')
  EVIDENCE=$(echo "$INPUT" | jq -r '.evidence // ""')
  AGENT=$(echo "$INPUT" | jq -r '.agent // "verification-enforcer"')

  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg sid "$SESSION_ID" \
    --arg type "verification" \
    --arg feature "$FEATURE" \
    --arg verdict "$VERDICT" \
    --arg evidence "$EVIDENCE" \
    --arg agent "$AGENT" \
    '{
      timestamp: $ts,
      session: $sid,
      type: $type,
      feature: $feature,
      verdict: $verdict,
      evidence: $evidence,
      agent: $agent
    }' >> "$AUDIT_FILE"
  exit 0
fi

# ── ESCALATION ─────────────────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "escalation" ]]; then
  SOURCE=$(echo "$INPUT" | jq -r '.source // ""')
  SEVERITY=$(echo "$INPUT" | jq -r '.severity // ""')
  REASON=$(echo "$INPUT" | jq -r '.reason // ""')
  RESOLUTION=$(echo "$INPUT" | jq -r '.resolution // "pending"')

  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg sid "$SESSION_ID" \
    --arg type "escalation" \
    --arg source "$SOURCE" \
    --arg severity "$SEVERITY" \
    --arg reason "$REASON" \
    --arg resolution "$RESOLUTION" \
    '{
      timestamp: $ts,
      session: $sid,
      type: $type,
      source: $source,
      severity: $severity,
      reason: $reason,
      resolution: $resolution
    }' >> "$AUDIT_FILE"
  exit 0
fi

# ── AGENT DISPATCH ─────────────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "dispatch" ]]; then
  AGENT=$(echo "$INPUT" | jq -r '.agent // ""')
  TASK=$(echo "$INPUT" | jq -r '.task // ""')
  PIPELINE=$(echo "$INPUT" | jq -r '.pipeline // ""')
  PHASE=$(echo "$INPUT" | jq -r '.phase // ""')

  jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg sid "$SESSION_ID" \
    --arg type "dispatch" \
    --arg agent "$AGENT" \
    --arg task "$TASK" \
    --arg pipeline "$PIPELINE" \
    --arg phase "$PHASE" \
    '{
      timestamp: $ts,
      session: $sid,
      type: $type,
      agent: $agent,
      task: $task,
      pipeline: $pipeline,
      phase: $phase
    }' >> "$AUDIT_FILE"
  exit 0
fi

# ── QUERY (read audit log) ────────────────────────────────────────────
if [[ "$EVENT_TYPE" == "query" ]]; then
  FILTER_TYPE=$(echo "$INPUT" | jq -r '.filter_type // ""')
  FILTER_FEATURE=$(echo "$INPUT" | jq -r '.filter_feature // ""')
  LIMIT=$(echo "$INPUT" | jq -r '.limit // "50"')

  echo "=== Audit Trail ==="

  if [[ -n "$FILTER_TYPE" ]]; then
    grep "\"type\":\"$FILTER_TYPE\"" "$AUDIT_FILE" 2>/dev/null | tail -"$LIMIT" | jq -r '
      "\(.timestamp) [\(.type)] \(
        if .type == "permission" then "\(.decision): \(.command) (tier: \(.tier))"
        elif .type == "debate" then "\(.ruling): \(.item) (judge: \(.judge), severity: \(.severity))"
        elif .type == "verification" then "\(.verdict): \(.feature) (agent: \(.agent))"
        elif .type == "escalation" then "\(.severity): \(.reason) (source: \(.source))"
        elif .type == "dispatch" then "\(.agent) → \(.task) (pipeline: \(.pipeline), phase: \(.phase))"
        else "unknown event"
        end
      )"'
  elif [[ -n "$FILTER_FEATURE" ]]; then
    grep "\"feature\":\"$FILTER_FEATURE\"" "$AUDIT_FILE" 2>/dev/null | tail -"$LIMIT" | jq -r '
      "\(.timestamp) [\(.type)] \(
        if .type == "debate" then "\(.ruling): \(.item)"
        elif .type == "verification" then "\(.verdict)"
        elif .type == "dispatch" then "\(.agent) → \(.task)"
        else .type
        end
      )"'
  else
    tail -"$LIMIT" "$AUDIT_FILE" 2>/dev/null | jq -r '
      "\(.timestamp) [\(.type)] \(
        if .type == "permission" then "\(.decision): \(.command)"
        elif .type == "debate" then "\(.ruling): \(.item)"
        elif .type == "verification" then "\(.verdict): \(.feature)"
        elif .type == "escalation" then "\(.severity): \(.reason)"
        elif .type == "dispatch" then "\(.agent) → \(.task)"
        else "event"
        end
      )"'
  fi
  exit 0
fi

echo "Unknown event type: $EVENT_TYPE"
exit 1
