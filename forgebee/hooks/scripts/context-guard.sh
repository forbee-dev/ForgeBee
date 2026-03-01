#!/bin/bash
# context-guard.sh — MCP-as-CLI context optimization
# Runs on PreCompact to backup critical context before compaction
# Also monitors context usage and suggests optimizations

set -euo pipefail

# ── Bootstrap: resolve paths for both plugin and legacy installs ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

INPUT=$(cat)
BACKUP_DIR="$PROJECT_DIR/.claude/session-cache/context-backups"
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')


# ── PRE-COMPACTION: Backup critical context ───────────────────────────
if [[ "$HOOK_EVENT" == "PreCompact" ]]; then
  TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
  BACKUP_FILE="$BACKUP_DIR/pre-compact-$TIMESTAMP.md"

  # Capture what matters before compaction wipes it
  cat > "$BACKUP_FILE" << EOF
# Pre-Compaction Context Backup
# Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Working Directory
$(pwd)

## Git State
$(git branch --show-current 2>/dev/null || echo "not a git repo")
$(git status --short 2>/dev/null | head -20 || echo "")

## Recent Changes
$(git diff --stat 2>/dev/null | tail -5 || echo "")

## Recent Commits
$(git log --oneline -10 2>/dev/null || echo "")

## Active Tasks
$(cat "$PROJECT_DIR/TASKS.md" 2>/dev/null | sed -n '/^## Active/,/^## /p' | head -20 || echo "No TASKS.md")

## Key Files Modified This Session
$(git diff --name-only 2>/dev/null | head -20 || echo "")
EOF

  # Output reminder for post-compaction context
  echo "Context backed up to $BACKUP_FILE"

  # Keep only last 5 backups
  ls -t "$BACKUP_DIR"/pre-compact-*.md 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

  exit 0
fi

# ── SESSION START (after compact): Restore context ────────────────────
if [[ "$HOOK_EVENT" == "SessionStart" ]]; then
  # Find most recent backup
  LATEST=$(ls -t "$BACKUP_DIR"/pre-compact-*.md 2>/dev/null | head -1)

  if [[ -n "$LATEST" ]]; then
    echo "=== Restored Context (pre-compaction) ==="
    cat "$LATEST"
    echo "=== End Restored Context ==="
  fi

  exit 0
fi

exit 0
