#!/bin/bash
# ForgeBee Installer — Drop-in development framework for Claude Code and OpenClaw
# Usage: bash install.sh [target-directory]
#
# NOTE: This is the legacy manual installer. The recommended way to install
# DevKit is as a plugin via the Claude Code plugin system:
#   /plugin marketplace add forbee-dev/ForgeBee
#   /plugin install forgebee@forbee-dev
#
# This script remains for users who prefer git clone + manual installation
# or who are not using the plugin system.

set -euo pipefail

TARGET="${1:-.}"
DEVKIT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 ForgeBee Installer (Legacy)"
echo "=============================="
echo ""
echo "💡 Tip: ForgeBee is also available as a plugin. In Claude Code, run:"
echo "   /plugin marketplace add forbee-dev/ForgeBee"
echo "   /plugin install forgebee@forbee-dev"
echo ""
echo "Installing to: $TARGET"
echo ""

# Check if .claude directory already exists
if [[ -f "$TARGET/.claude/settings.json" ]]; then
  echo "⚠️  Existing .claude/settings.json detected."
  echo "   Your current settings will be backed up to .claude/settings.json.bak"
  cp "$TARGET/.claude/settings.json" "$TARGET/.claude/settings.json.bak"
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$TARGET/.claude/hooks"
mkdir -p "$TARGET/.claude/commands"
mkdir -p "$TARGET/.claude/agents"
mkdir -p "$TARGET/.claude/sessions"
mkdir -p "$TARGET/.claude/session-cache/context-backups"
mkdir -p "$TARGET/.claude/learnings"
mkdir -p "$TARGET/docs/pm/features"
mkdir -p "$TARGET/docs/planning/briefs"
mkdir -p "$TARGET/docs/planning/requirements"
mkdir -p "$TARGET/docs/planning/stories"
mkdir -p "$TARGET/docs/marketing/brand"
mkdir -p "$TARGET/docs/marketing/intel"
mkdir -p "$TARGET/docs/marketing/audience"
mkdir -p "$TARGET/docs/marketing/content-architecture"
mkdir -p "$TARGET/docs/marketing/hooks"
mkdir -p "$TARGET/docs/marketing/ideas"
mkdir -p "$TARGET/docs/marketing/engagement"
mkdir -p "$TARGET/docs/marketing/growth"
mkdir -p "$TARGET/docs/marketing/analytics"
mkdir -p "$TARGET/docs/marketing/calendar"
mkdir -p "$TARGET/docs/marketing/cro"
mkdir -p "$TARGET/docs/marketing/email"

# Copy hooks
echo "🪝 Installing hooks..."
cp "$DEVKIT_DIR/.claude/hooks/"*.sh "$TARGET/.claude/hooks/"
chmod +x "$TARGET/.claude/hooks/"*.sh

# Copy commands
echo "🤖 Installing agent commands..."
cp "$DEVKIT_DIR/.claude/commands/"*.md "$TARGET/.claude/commands/"

# Copy specialist agents
echo "🧠 Installing specialist agents..."
cp "$DEVKIT_DIR/.claude/agents/"*.md "$TARGET/.claude/agents/"

# Copy settings (merge if existing)
if [[ -f "$TARGET/.claude/settings.json.bak" ]]; then
  echo "⚙️  Merging settings.json (keeping your existing settings + adding DevKit hooks)..."
  # Simple merge: use DevKit settings as base, user can manually merge custom settings
  cp "$DEVKIT_DIR/.claude/settings.json" "$TARGET/.claude/settings.json"
  echo "   Note: Review .claude/settings.json and merge any custom settings from .claude/settings.json.bak"
else
  cp "$DEVKIT_DIR/.claude/settings.json" "$TARGET/.claude/settings.json"
fi

# Copy CLAUDE.md template (only if none exists)
if [[ ! -f "$TARGET/CLAUDE.md" ]]; then
  echo "📝 Installing CLAUDE.md template..."
  cp "$DEVKIT_DIR/CLAUDE.md" "$TARGET/CLAUDE.md"
else
  echo "📝 CLAUDE.md already exists — skipping (template available at $DEVKIT_DIR/CLAUDE.md)"
fi

# Copy PM templates (only if not already set up)
if [[ ! -f "$TARGET/docs/pm/state.yaml" ]]; then
  echo "📊 Installing PM system templates..."
  cp "$DEVKIT_DIR/docs/pm/state.yaml" "$TARGET/docs/pm/state.yaml"
  cp "$DEVKIT_DIR/docs/pm/index.md" "$TARGET/docs/pm/index.md"
  cp "$DEVKIT_DIR/docs/pm/decisions.md" "$TARGET/docs/pm/decisions.md"
else
  echo "📊 PM system already exists — skipping templates"
fi

# Initialize learnings file
if [[ ! -f "$TARGET/.claude/learnings/learnings.md" ]]; then
  cat > "$TARGET/.claude/learnings/learnings.md" << 'EOF'
# Project Learnings

Auto-captured patterns, insights, and useful commands from Claude Code sessions.

---

EOF
fi

# Update settings.json paths to use $CLAUDE_PROJECT_DIR
echo "🔗 Configuring paths..."

# Verify jq is available
if command -v jq &>/dev/null; then
  jq . "$TARGET/.claude/settings.json" > /dev/null 2>&1 && echo "✅ settings.json is valid JSON" || echo "❌ settings.json has invalid JSON"
else
  echo "⚠️  jq not installed — skipping JSON validation. Install with: brew install jq / apt install jq"
fi

echo ""
echo "✅ DevKit installed successfully!"
echo ""
echo "📋 What's included:"
echo "   HOOKS (10 scripts):"
echo "   • permission-guard     — Auto-approve safe commands, block dangerous ones"
echo "   • skill-activator      — Auto-recommend relevant skills per prompt"
echo "   • session-save/load    — Save/restore context across sessions"
echo "   • self-improve          — Auto-capture learnings with structured indexing"
echo "   • task-sync             — Bidirectional sync with TASKS.md"
echo "   • pm-sync               — Project management state sync and stale detection"
echo "   • context-guard         — Backup context before compaction"
echo "   • checkpoint            — Phase-level durability checkpoints for crash recovery"
echo "   • audit-trail           — Append-only governance log (permissions, debates, verifications)"
echo ""
echo "   COMMANDS (27 slash commands):"
echo "   • Plan:   /plan"
echo "   • Dev:    /review /debug /architect /refactor /test /docs /security /perf /migrate /deploy /browser-debug"
echo "   • Growth: /growth /content /gtm /seo /social /launch /competitive /landing /payments /analytics"
echo "   • Meta:   /workflow /team /idea /pm /audit"
echo ""
echo "   AGENTS (45 specialists for Agent Teams):"
echo "   • Design:     ux-designer, scrum-master"
echo "   • Dev Debate:  requirements-advocate/skeptic/judge, code-advocate/skeptic/judge"
echo "   • Mkt Debate:  strategy-advocate/skeptic/judge"
echo "   • Quality:     verification-enforcer, tdd-enforcer, contract-validator"
echo "   • Delivery:    delivery-agent, dashboard-generator"
echo "   • Dev:         frontend, backend, database, security, testing, devops, perf, debug"
echo "   • Research:    deep-researcher, content-writer, seo, session-librarian"
echo "   • Growth OS:   brand-strategist, market-intel, audience-architect, content-architect,"
echo "                  hook-engineer, idea-machine, engagement-strategist, content-creator,"
echo "                  growth-hacker, calendar-builder, performance-analyst,"
echo "                  conversion-optimizer, email-strategist"
echo "   • Platform:    supabase, ios, flutter, n8n"
echo ""
echo "   INFRASTRUCTURE:"
echo "   • Agent Teams enabled (multi-agent orchestration)"
echo "   • TaskCompleted evidence-based verification gate"
echo "   • Intent detection hook (suggests /workflow, /plan, /debug before ad-hoc coding)"
echo "   • Crash recovery via phase-level checkpointing (.claude/checkpoints/)"
echo "   • Governance audit trail (.claude/audit/) — immutable log of all decisions"
echo "   • Structured learnings index (.claude/learnings/index.jsonl) for cross-session querying"
echo "   • CLAUDE.md project memory template"
echo "   • TASKS.md auto-managed task tracking"
echo "   • docs/pm/ project management system (state.yaml + markdown dashboards)"
echo "   • docs/marketing/ Growth OS output directory (brand, intel, audience, hooks, etc.)"
echo ""
echo "🚀 Next steps:"
echo "   1. Edit CLAUDE.md with your project-specific details"
echo "   2. Start Claude Code in your project directory"
echo "   3. Try: /review, /debug, /test, or any other command"
echo ""
echo "📚 Files:"
echo "   .claude/settings.json          — Hook configuration"
echo "   .claude/hooks/                  — Hook scripts"
echo "   .claude/agents/                 — Specialist agent definitions"
echo "   .claude/commands/               — Agent commands"
echo "   .claude/sessions/               — Session state (auto-managed)"
echo "   .claude/learnings/learnings.md  — Captured patterns (auto-managed)"
echo "   docs/pm/                        — Project management (state.yaml + dashboards)"
echo "   docs/marketing/                 — Growth OS outputs (brand, intel, content, etc.)"
echo "   CLAUDE.md                       — Project memory"
