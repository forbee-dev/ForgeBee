#!/bin/bash
# _common.sh — Shared bootstrap for all DevKit hook scripts
# Sources this at the top of every hook to get consistent path resolution
# Works in both plugin install and legacy install contexts

# ── Resolve project directory ─────────────────────────────────────────
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# ── Resolve plugin root (only set when running as a plugin) ───────────
# CLAUDE_PLUGIN_ROOT is set by Claude Code when running plugin hooks
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"

# ── Ensure project-level directories exist ────────────────────────────
# When installed as a plugin, these won't exist until first run
mkdir -p "$PROJECT_DIR/.claude/sessions" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/.claude/session-cache/context-backups" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/.claude/learnings" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/.claude/checkpoints" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/.claude/audit" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/docs/pm/features" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/docs/planning/briefs" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/docs/planning/requirements" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/docs/planning/stories" 2>/dev/null || true

# ── Initialize files if missing ───────────────────────────────────────
if [[ ! -f "$PROJECT_DIR/.claude/learnings/learnings.md" ]]; then
  cat > "$PROJECT_DIR/.claude/learnings/learnings.md" << 'EOF'
# Project Learnings

Auto-captured patterns, insights, and useful commands from Claude Code sessions.

---

EOF
fi

if [[ ! -f "$PROJECT_DIR/.claude/session-cache/permissions.json" ]]; then
  echo '{}' > "$PROJECT_DIR/.claude/session-cache/permissions.json"
fi

# ── Helper: find_devkit_dir ───────────────────────────────────────────
# Returns the directory where DevKit resources (templates, skills) live
# Plugin install: $CLAUDE_PLUGIN_ROOT
# Legacy install: $CLAUDE_PROJECT_DIR (resources are in .claude/)
find_devkit_root() {
  if [[ -n "$PLUGIN_ROOT" ]]; then
    echo "$PLUGIN_ROOT"
  else
    echo "$PROJECT_DIR"
  fi
}

# ── Helper: find commands directory ───────────────────────────────────
find_commands_dir() {
  if [[ -n "$PLUGIN_ROOT" && -d "$PLUGIN_ROOT/commands" ]]; then
    echo "$PLUGIN_ROOT/commands"
  elif [[ -d "$PROJECT_DIR/.claude/commands" ]]; then
    echo "$PROJECT_DIR/.claude/commands"
  else
    echo ""
  fi
}

# ── Helper: find skills directories (returns all valid paths) ─────────
find_skills_dirs() {
  local dirs=()

  # Plugin skills
  if [[ -n "$PLUGIN_ROOT" && -d "$PLUGIN_ROOT/skills" ]]; then
    dirs+=("$PLUGIN_ROOT/skills")
  fi

  # Project-level skills
  if [[ -d "$PROJECT_DIR/.claude/skills" ]]; then
    dirs+=("$PROJECT_DIR/.claude/skills")
  fi

  # Global user skills
  if [[ -d "$HOME/.claude/skills" ]]; then
    dirs+=("$HOME/.claude/skills")
  fi

  # Legacy .skills location
  if [[ -d "$PROJECT_DIR/.skills/skills" ]]; then
    dirs+=("$PROJECT_DIR/.skills/skills")
  fi

  echo "${dirs[@]}"
}
