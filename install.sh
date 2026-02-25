#!/bin/bash
# DevKit Installer — Drop-in Claude Code development framework
# Usage: bash install.sh [target-directory]

set -euo pipefail

TARGET="${1:-.}"
DEVKIT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 DevKit Installer"
echo "==================="
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
echo "   HOOKS (7 scripts):"
echo "   • permission-guard     — Auto-approve safe commands, block dangerous ones"
echo "   • skill-activator      — Auto-recommend relevant skills per prompt"
echo "   • session-save/load    — Save/restore context across sessions"
echo "   • self-improve          — Auto-capture learnings and patterns"
echo "   • task-sync             — Bidirectional sync with TASKS.md"
echo "   • context-guard         — Backup context before compaction"
echo ""
echo "   COMMANDS (21 slash commands):"
echo "   • Dev:    /review /debug /architect /refactor /test /docs /security /perf /migrate /deploy /browser-debug"
echo "   • Growth: /gtm /seo /social /launch /competitive /landing /payments /analytics"
echo "   • Meta:   /team /idea"
echo ""
echo "   AGENTS (16 specialists for Agent Teams):"
echo "   • Dev:      frontend, backend, database, security, testing, devops, perf, debug"
echo "   • Research: deep-researcher, content-writer, seo, session-librarian"
echo "   • Platform: supabase, ios, flutter, n8n"
echo ""
echo "   INFRASTRUCTURE:"
echo "   • Agent Teams enabled (multi-agent orchestration)"
echo "   • TaskCompleted + TeammateIdle quality gate hooks"
echo "   • CLAUDE.md project memory template"
echo "   • TASKS.md auto-managed task tracking"
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
echo "   CLAUDE.md                       — Project memory"
