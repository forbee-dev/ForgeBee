#!/bin/bash
# task-sync.sh — Sync Claude's internal task list with persistent TASKS.md
# Runs on Stop event to capture task state
# Bidirectional: reads from TASKS.md on SessionStart, writes on Stop

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

TASKS_FILE="$PROJECT_DIR/TASKS.md"
TASKS_FILE="$PROJECT_DIR/TASKS.md"
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')

# ── ON SESSION START: Load tasks into context ─────────────────────────
if [[ "$HOOK_EVENT" == "SessionStart" ]]; then
  if [[ -f "$TASKS_FILE" ]]; then
    echo "=== Active Tasks ==="
    # Extract active and waiting tasks
    sed -n '/^## Active/,/^## /p' "$TASKS_FILE" | head -30
    WAITING=$(sed -n '/^## Waiting/,/^## /p' "$TASKS_FILE" | head -10)
    if [[ -n "$WAITING" ]]; then
      echo ""
      echo "$WAITING"
    fi
    echo "=== End Tasks ==="
  fi
  exit 0
fi

fi

# Get git info for context
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
BRANCH=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH=$(git branch --show-current 2>/dev/null || echo "")
fi

# Check if there are recent git commits (proxy for "something was done")
RECENT_WORK=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  RECENT_WORK=$(git log --oneline --since="1 hour ago" 2>/dev/null | head -5)
fi

# If work was done, add a timestamped note to the Done section
if [[ -n "$RECENT_WORK" ]]; then
  # Add completed work to Done section
  DONE_ENTRY="- [x] ~~Session work ($TIMESTAMP${BRANCH:+ on $BRANCH})~~ — $(echo "$RECENT_WORK" | head -1)"

  # Insert after "## Done" line (compatible with both GNU and BSD sed)
  if grep -q "^## Done" "$TASKS_FILE"; then
    if sed --version >/dev/null 2>&1; then
      # GNU sed
      sed -i "/^## Done/a\\$DONE_ENTRY" "$TASKS_FILE" 2>/dev/null || true
    else
      # BSD sed (macOS)
      sed -i '' "/^## Done/a\\
$DONE_ENTRY" "$TASKS_FILE" 2>/dev/null || true
    fi
  fi
fi

# Archive done items older than 7 days
ARCHIVE_FILE="$PROJECT_DIR/.claude/learnings/tasks-archive.md"
if [[ -f "$TASKS_FILE" ]] && command -v python3 &>/dev/null; then
  TASKS_FILE_ESC="$TASKS_FILE" ARCHIVE_FILE_ESC="$ARCHIVE_FILE" python3 -c "
import re, datetime, os, sys

tasks_path = os.environ['TASKS_FILE_ESC']
archive_path = os.environ['ARCHIVE_FILE_ESC']

with open(tasks_path, 'r') as f:
    content = f.read()

# Find done section
done_match = re.search(r'## Done\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
if done_match:
    done_section = done_match.group(1)
    lines = done_section.strip().split('\n')
    keep = []
    archive = []
    cutoff = datetime.datetime.now() - datetime.timedelta(days=7)

    for line in lines:
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', line)
        if date_match:
            try:
                item_date = datetime.datetime.strptime(date_match.group(1), '%Y-%m-%d')
                if item_date < cutoff:
                    archive.append(line)
                    continue
            except ValueError:
                pass
        keep.append(line)

    if archive:
        with open(archive_path, 'a') as f:
            f.write('\n'.join(archive) + '\n')

        new_done = '\n'.join(keep)
        new_content = content[:done_match.start(1)] + new_done + '\n' + content[done_match.end(1):]
        with open(tasks_path, 'w') as f:
            f.write(new_content)
" 2>/dev/null || true
fi

exit 0
