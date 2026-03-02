#!/usr/bin/env node
/**
 * task-sync.js — Sync Claude's internal task list with persistent TASKS.md
 * Runs on Stop event to capture task state
 * Bidirectional: reads from TASKS.md on SessionStart, writes on Stop
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const common = require('./_common.js');

// ── Bootstrap: resolve paths for both plugin and legacy installs ──────
const PROJECT_DIR = common.getProjectDir();
const TASKS_FILE = path.join(PROJECT_DIR, 'TASKS.md');
const ARCHIVE_FILE = path.join(PROJECT_DIR, '.claude/learnings/tasks-archive.md');

// ── Helper: Check if we're in a git repo ──────────────────────────────
function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return true;
  } catch (e) {
    return false;
  }
}

// ── Helper: Get git branch name ────────────────────────────────────────
function getGitBranch() {
  try {
    const branch = execSync('git branch --show-current', {
      stdio: 'pipe',
      encoding: 'utf8',
    }).trim();
    return branch || '';
  } catch (e) {
    return '';
  }
}

// ── Helper: Get recent git commits ────────────────────────────────────
function getRecentWork() {
  try {
    const commits = execSync('git log --oneline --since="1 hour ago"', {
      stdio: 'pipe',
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 5);
    return commits.length > 0 ? commits.join('\n') : '';
  } catch (e) {
    return '';
  }
}

// ── Helper: Insert line after pattern in file ──────────────────────────
function insertAfterPattern(filePath, pattern, newLine) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${pattern}`, 'm');

    if (!regex.test(content)) {
      return false;
    }

    content = content.replace(regex, (match) => match + '\n' + newLine);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// ── Archive old tasks ──────────────────────────────────────────────────
function archiveOldTasks() {
  try {
    if (!fs.existsSync(TASKS_FILE)) {
      return;
    }

    const content = fs.readFileSync(TASKS_FILE, 'utf8');

    // Extract done section using regex
    const doneMatch = content.match(/## Done\n([\s\S]*?)(?=\n## |\Z)/);
    if (!doneMatch) {
      return;
    }

    const doneSection = doneMatch[1];
    const lines = doneSection.trim().split('\n');
    const keep = [];
    const archive = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    for (const line of lines) {
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        try {
          const itemDate = new Date(dateMatch[1]);
          if (itemDate < cutoff) {
            archive.push(line);
            continue;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      keep.push(line);
    }

    if (archive.length > 0) {
      // Append to archive file
      common.appendFile(ARCHIVE_FILE, archive.join('\n') + '\n');

      // Update TASKS.md
      const newDone = keep.join('\n');
      const newContent =
        content.slice(0, doneMatch.index + doneMatch[0].indexOf(doneSection)) +
        newDone +
        '\n' +
        content.slice(doneMatch.index + doneMatch[0].length);
      fs.writeFileSync(TASKS_FILE, newContent, 'utf8');
    }
  } catch (e) {
    // Ignore archiving errors
  }
}

// ── Main script ───────────────────────────────────────────────────────
async function main() {
  const input = await common.readStdinJson();

  if (!input) {
    process.exit(0);
  }

  // Prevent infinite loop
  const STOP_HOOK_ACTIVE = input.stop_hook_active || false;
  if (STOP_HOOK_ACTIVE === true) {
    process.exit(0);
  }

  const HOOK_EVENT = input.hook_event_name;

  // ── ON SESSION START: Load tasks into context ─────────────────────────
  if (HOOK_EVENT === 'SessionStart') {
    if (fs.existsSync(TASKS_FILE)) {
      const content = fs.readFileSync(TASKS_FILE, 'utf8');

      console.log('=== Active Tasks ===');

      // Extract active section
      const activeMatch = content.match(/^## Active\n([\s\S]*?)(?=\n## |\Z)/m);
      if (activeMatch) {
        const activeLines = activeMatch[1].split('\n').slice(0, 30).join('\n');
        console.log(activeLines);
      }

      // Extract waiting section
      const waitingMatch = content.match(/^## Waiting\n([\s\S]*?)(?=\n## |\Z)/m);
      if (waitingMatch) {
        const waitingLines = waitingMatch[1]
          .split('\n')
          .slice(0, 10)
          .join('\n');
        if (waitingLines.trim()) {
          console.log('');
          console.log(waitingLines);
        }
      }

      console.log('=== End Tasks ===');
    }
    process.exit(0);
  }

  // ── ON SESSION STOP: Capture and archive ──────────────────────────────
  if (!fs.existsSync(TASKS_FILE)) {
    process.exit(0);
  }

  // Get git info for context
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const TIMESTAMP = `${year}-${month}-${day} ${hours}:${minutes}`;

  let BRANCH = '';
  if (isGitRepo()) {
    BRANCH = getGitBranch();
  }

  // Check if there are recent git commits (proxy for "something was done")
  let RECENT_WORK = '';
  if (isGitRepo()) {
    RECENT_WORK = getRecentWork();
  }

  // If work was done, add a timestamped note to the Done section
  if (RECENT_WORK) {
    const firstCommit = RECENT_WORK.split('\n')[0];
    const DONE_ENTRY = `- [x] ~~Session work (${TIMESTAMP}${BRANCH ? ` on ${BRANCH}` : ''})~~ — ${firstCommit}`;

    if (/^## Done/m.test(fs.readFileSync(TASKS_FILE, 'utf8'))) {
      insertAfterPattern(TASKS_FILE, '## Done', DONE_ENTRY);
    }
  }

  // Archive done items older than 7 days
  archiveOldTasks();

  process.exit(0);
}

main().catch(() => process.exit(0));
