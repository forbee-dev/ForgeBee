#!/bin/bash
# skill-activator.sh — Analyze user prompts and recommend relevant skills
# Runs on UserPromptSubmit event
# Outputs additionalContext with skill recommendations
# v2: Added intent detection — intercepts build/implement intent to suggest /plan or /workflow

set -euo pipefail

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

if [[ -z "$PROMPT" ]]; then
  exit 0
fi

CACHE_FILE="$PROJECT_DIR/.claude/session-cache/skill-manifest.json"
CACHE_TTL=300  # 5 minutes

# ── Build/refresh skill manifest cache ────────────────────────────────
REBUILD_CACHE=false
if [[ ! -f "$CACHE_FILE" ]]; then
  REBUILD_CACHE=true
else
  CACHE_AGE=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0) ))
  if [[ "$CACHE_AGE" -gt "$CACHE_TTL" ]]; then
    REBUILD_CACHE=true
  fi
fi

if [[ "$REBUILD_CACHE" == "true" ]]; then
  SKILLS_JSON="[]"

  # Use dynamic skill directory resolution (works for both plugin and legacy)
  IFS=' ' read -ra SKILL_DIRS <<< "$(find_skills_dirs)"

  for SKILL_DIR in "${SKILL_DIRS[@]}"; do
    if [[ ! -d "$SKILL_DIR" ]]; then
      continue
    fi

    for SKILL_PATH in "$SKILL_DIR"/*/SKILL.md; do
      if [[ ! -f "$SKILL_PATH" ]]; then
        continue
      fi

      SKILL_NAME=$(basename "$(dirname "$SKILL_PATH")")

      # Extract description from YAML frontmatter
      DESCRIPTION=""
      if head -1 "$SKILL_PATH" | grep -q "^---"; then
        DESCRIPTION=$(sed -n '/^---$/,/^---$/p' "$SKILL_PATH" | grep "^description:" | sed 's/^description:\s*//' | head -1)
      fi

      # Extract trigger keywords (from MANDATORY TRIGGERS line or description)
      TRIGGERS=""
      if grep -q "MANDATORY TRIGGERS" "$SKILL_PATH"; then
        TRIGGERS=$(grep "MANDATORY TRIGGERS" "$SKILL_PATH" | sed 's/.*MANDATORY TRIGGERS:\s*//' | tr ',' '\n' | sed 's/^[[:space:]]*//' | tr '\n' ',' | sed 's/,$//')
      fi

      # Build skill entry
      ENTRY=$(jq -n \
        --arg name "$SKILL_NAME" \
        --arg desc "$DESCRIPTION" \
        --arg triggers "$TRIGGERS" \
        --arg path "$SKILL_PATH" \
        '{name: $name, description: $desc, triggers: $triggers, path: $path}')

      SKILLS_JSON=$(echo "$SKILLS_JSON" | jq --argjson entry "$ENTRY" '. + [$entry]')
    done
  done

  echo "$SKILLS_JSON" > "$CACHE_FILE"
fi

# ── Intent Detection — intercept build/implement requests ─────────────
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')
INTENT_CONTEXT=""

# Detect implementation intent (build, implement, create feature, add feature, etc.)
# Skip if the user is already using a command (starts with /)
if [[ ! "$PROMPT" =~ ^/ ]]; then

  # Strong implementation signals — suggest /workflow
  BUILD_PATTERNS="build a |build the |implement |create a new |add a new feature|develop a |ship a |code a |make a new |architect a |set up a new |scaffold "
  if echo "$PROMPT_LOWER" | grep -qE "$BUILD_PATTERNS"; then
    INTENT_CONTEXT="🎯 **Implementation intent detected.** Before jumping into code, consider:\n- \`/workflow\` — Full pipeline with planning, debate, and delivery\n- \`/plan\` — Lightweight planning (brief → requirements → architecture → stories)\n- \`/team\` — Quick multi-agent delegation without ceremony\n\nPlanning first catches design issues before they become code rewrites.\n"
  fi

  # Debug/fix signals — suggest /debug
  DEBUG_PATTERNS="fix this bug|debug |broken |not working|crashes when|error when|fails to |throwing an error|can.t figure out why"
  if [[ -z "$INTENT_CONTEXT" ]] && echo "$PROMPT_LOWER" | grep -qE "$DEBUG_PATTERNS"; then
    INTENT_CONTEXT="🔍 **Debug intent detected.** Consider using \`/debug\` for systematic debugging (reproduce → isolate → diagnose → fix) instead of ad-hoc investigation.\n"
  fi

  # Refactor signals — suggest /refactor
  REFACTOR_PATTERNS="refactor |clean up |restructure |reorganize |simplify |extract |decouple |split this "
  if [[ -z "$INTENT_CONTEXT" ]] && echo "$PROMPT_LOWER" | grep -qE "$REFACTOR_PATTERNS"; then
    INTENT_CONTEXT="🔧 **Refactor intent detected.** Consider using \`/refactor\` for safe refactoring with test verification and behavior preservation checks.\n"
  fi

  # TDD signals — suggest tdd-enforcer
  TDD_PATTERNS="test.first|test.driven|tdd|write tests before|red.green.refactor"
  if echo "$PROMPT_LOWER" | grep -qE "$TDD_PATTERNS"; then
    INTENT_CONTEXT="${INTENT_CONTEXT}🧪 **TDD mode available.** The \`tdd-enforcer\` agent can enforce RED-GREEN-REFACTOR discipline throughout implementation.\n"
  fi
fi

# ── Match prompt against skills ───────────────────────────────────────
MATCHED_SKILLS=""

while IFS= read -r SKILL; do
  NAME=$(echo "$SKILL" | jq -r '.name')
  TRIGGERS=$(echo "$SKILL" | jq -r '.triggers')
  DESC=$(echo "$SKILL" | jq -r '.description')

  # Check trigger keywords
  if [[ -n "$TRIGGERS" ]]; then
    IFS=',' read -ra TRIGGER_LIST <<< "$TRIGGERS"
    for trigger in "${TRIGGER_LIST[@]}"; do
      trigger_clean=$(echo "$trigger" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')
      if [[ -n "$trigger_clean" ]] && echo "$PROMPT_LOWER" | grep -qi "$trigger_clean"; then
        MATCHED_SKILLS="$MATCHED_SKILLS- Use the **$NAME** skill: $DESC\n"
        break
      fi
    done
  fi

  # Check description keywords as fallback
  if [[ -z "$MATCHED_SKILLS" ]] || ! echo -e "$MATCHED_SKILLS" | grep -q "$NAME"; then
    DESC_LOWER=$(echo "$DESC" | tr '[:upper:]' '[:lower:]')
    # Extract significant words from description (>6 chars, skip common English words)
    STOP_WORDS="using|these|about|which|where|their|would|could|should|there|through|between|before|after|other|under|during|without|within|including|building|working|following"
    for word in $(echo "$DESC_LOWER" | tr -cs '[:alpha:]' '\n' | awk 'length > 6' | grep -Evw "$STOP_WORDS"); do
      if echo "$PROMPT_LOWER" | grep -qw "$word"; then
        MATCHED_SKILLS="$MATCHED_SKILLS- Consider the **$NAME** skill: $DESC\n"
        break
      fi
    done
  fi
done < <(jq -c '.[]' "$CACHE_FILE" 2>/dev/null)

# ── Output recommendations ────────────────────────────────────────────
CONTEXT=""

if [[ -n "$INTENT_CONTEXT" ]]; then
  CONTEXT="$INTENT_CONTEXT"
fi

if [[ -n "$MATCHED_SKILLS" ]]; then
  CONTEXT="${CONTEXT}📌 Skill Recommendations:\n$MATCHED_SKILLS"
fi

if [[ -n "$CONTEXT" ]]; then
  echo "{\"additionalContext\": \"$(echo -e "$CONTEXT" | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
fi

exit 0
