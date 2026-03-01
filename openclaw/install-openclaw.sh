#!/bin/bash
# ForgeBee → OpenClaw Installer
# Converts ForgeBee agents and commands into OpenClaw-compatible skills
#
# Usage: bash install-openclaw.sh [workspace-dir]
# Default workspace: ~/.openclaw/workspace

set -euo pipefail

DEVKIT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="${1:-$HOME/.openclaw/workspace}"
SKILLS_DIR="$WORKSPACE/skills"

echo "🐝 ForgeBee → OpenClaw Installer"
echo "================================="
echo ""
echo "Source:    $DEVKIT_DIR"
echo "Target:    $SKILLS_DIR"
echo ""

# ── Create skills directory ──────────────────────────────────────────
mkdir -p "$SKILLS_DIR"

# ── Convert agents to OpenClaw skills ────────────────────────────────
AGENT_COUNT=0
for agent_file in "$DEVKIT_DIR/.claude/agents/"*.md; do
  if [[ ! -f "$agent_file" ]]; then continue; fi

  AGENT_NAME=$(basename "$agent_file" .md)
  SKILL_DIR="$SKILLS_DIR/forgebee-$AGENT_NAME"
  mkdir -p "$SKILL_DIR"

  # Extract frontmatter fields
  NAME=$(sed -n 's/^name: *//p' "$agent_file" | head -1)
  DESC=$(sed -n 's/^description: *//p' "$agent_file" | head -1)
  MODEL=$(sed -n 's/^model: *//p' "$agent_file" | head -1)

  # Map Claude Code model names to OpenClaw-compatible names
  case "$MODEL" in
    opus)  OC_MODEL="claude-opus-4-5-20250501" ;;
    haiku) OC_MODEL="claude-haiku-4-5-20251001" ;;
    *)     OC_MODEL="claude-sonnet-4-5-20250929" ;;
  esac

  # Extract body (everything after second ---)
  BODY=$(sed -n '/^---$/,/^---$/!p' "$agent_file" | tail -n +1)

  # Write OpenClaw SKILL.md
  cat > "$SKILL_DIR/SKILL.md" << SKILLEOF
---
name: forgebee-$AGENT_NAME
description: "[ForgeBee] $DESC"
version: 2.3.0
metadata:
  openclaw:
    emoji: "🐝"
    homepage: https://github.com/forbee-dev/ForgeBee
---

$BODY
SKILLEOF

  AGENT_COUNT=$((AGENT_COUNT + 1))
done

echo "✅ Converted $AGENT_COUNT agents → OpenClaw skills"

# ── Convert commands to OpenClaw skills ──────────────────────────────
CMD_COUNT=0
for cmd_file in "$DEVKIT_DIR/.claude/commands/"*.md; do
  if [[ ! -f "$cmd_file" ]]; then continue; fi

  CMD_NAME=$(basename "$cmd_file" .md)
  SKILL_DIR="$SKILLS_DIR/forgebee-cmd-$CMD_NAME"
  mkdir -p "$SKILL_DIR"

  # Extract frontmatter fields
  NAME=$(sed -n 's/^name: *//p' "$cmd_file" | head -1)
  DESC=$(sed -n 's/^description: *//p' "$cmd_file" | head -1)

  # Extract body
  BODY=$(sed -n '/^---$/,/^---$/!p' "$cmd_file" | tail -n +1)

  # Write OpenClaw SKILL.md
  cat > "$SKILL_DIR/SKILL.md" << SKILLEOF
---
name: forgebee-$CMD_NAME
description: "[ForgeBee] $DESC"
version: 2.3.0
user-invocable: true
metadata:
  openclaw:
    emoji: "🐝"
    homepage: https://github.com/forbee-dev/ForgeBee
---

$BODY
SKILLEOF

  CMD_COUNT=$((CMD_COUNT + 1))
done

echo "✅ Converted $CMD_COUNT commands → OpenClaw skills (user-invocable)"

# ── Install AGENTS.md overlay ────────────────────────────────────────
if [[ -f "$WORKSPACE/AGENTS.md" ]]; then
  # Append ForgeBee section if not already there
  if ! grep -q "ForgeBee" "$WORKSPACE/AGENTS.md"; then
    cat >> "$WORKSPACE/AGENTS.md" << 'AGENTSEOF'

## ForgeBee Specialist Agents

ForgeBee provides 44 specialist agents organized by function. Each agent is available as an OpenClaw skill prefixed with `forgebee-`.

**Development:** forgebee-frontend-specialist, forgebee-backend-engineer, forgebee-database-specialist, forgebee-security-auditor, forgebee-test-engineer, forgebee-devops-engineer, forgebee-performance-optimizer, forgebee-debugger-detective

**Quality Gates:** forgebee-verification-enforcer, forgebee-tdd-enforcer, forgebee-delivery-agent

**Debate System:** forgebee-requirements-advocate, forgebee-requirements-skeptic, forgebee-requirements-judge, forgebee-code-advocate, forgebee-code-skeptic, forgebee-code-judge, forgebee-strategy-advocate, forgebee-strategy-skeptic, forgebee-strategy-judge

**Growth OS:** forgebee-brand-strategist, forgebee-market-intel, forgebee-audience-architect, forgebee-content-architect, forgebee-hook-engineer, forgebee-idea-machine, forgebee-engagement-strategist, forgebee-content-creator, forgebee-growth-hacker, forgebee-calendar-builder, forgebee-performance-analyst, forgebee-conversion-optimizer, forgebee-email-strategist

**Commands (user-invocable):** forgebee-cmd-workflow, forgebee-cmd-team, forgebee-cmd-plan, forgebee-cmd-growth, forgebee-cmd-review, forgebee-cmd-debug, forgebee-cmd-test, forgebee-cmd-security, forgebee-cmd-perf, and more.
AGENTSEOF
    echo "✅ Added ForgeBee section to AGENTS.md"
  else
    echo "⏭️  ForgeBee section already exists in AGENTS.md"
  fi
else
  echo "⚠️  No AGENTS.md found at $WORKSPACE/AGENTS.md — create one to reference ForgeBee skills"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "🐝 ForgeBee installed for OpenClaw!"
echo ""
echo "   Skills:   $((AGENT_COUNT + CMD_COUNT)) total"
echo "   Agents:   $AGENT_COUNT specialist agents (forgebee-*)"
echo "   Commands: $CMD_COUNT slash commands (forgebee-cmd-*)"
echo "   Location: $SKILLS_DIR/forgebee-*"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart OpenClaw gateway to pick up new skills"
echo "   2. Try: 'use forgebee-cmd-review to review my code'"
echo "   3. Skills auto-trigger based on their descriptions"
echo ""
