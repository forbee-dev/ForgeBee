#!/usr/bin/env node
/**
 * task-sync.js — Sync Claude's internal task list with persistent TASKS.md
 * Runs on Stop event to capture task state
 * Bidirectional: reads from TASKS.md on SessionStart, writes on Stop
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs, readStdinSync, runGit } = require('./_common.js');

initDirs();

const input = readStdinSync();

let inputData = {};
try {
  inputData = JSON.parse(input);
} catch {
  // empty
}

// Prevent infinite loop
if (inputData.stop_hook_active === true) {
  process.exit(0);
}

const TASKS_FILE = path.join(PROJECT_DIR, 'TASKS.md');
const HOOK_EVENT = inputData.hook_event_name || '';

// ── ON SESSION START: Load tasks into context ─────────────────────────
if (HOOK_EVENT === 'SessionStart') {
  if (fs.existsSync(TASKS_FILE)) {
    const content = fs.readFileSync(TASKS_FILE, 'utf8');
    const lines = content.split('\n');

    console.log('=== Active Tasks ===');

    // Extract active and waiting tasks
    let inActiveSection = false;
    let inWaitingSection = false;
    let activeLines = [];
    let waitingLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('## Active')) {
        inActiveSection = true;
        inWaitingSection = false;
        continue;
      }
      if (line.startsWith('## Waiting')) {
        inActiveSection = false;
        inWaitingSection = true;
        continue;
      }
      if (line.startsWith('## ') && line !== '## Active' && line !== '## Waiting') {
        inActiveSection = false;
        inWaitingSection = false;
        continue;
      }

      if (inActiveSection && activeLines.length < 30) {
        activeLines.push(line);
      }
      if (inWaitingSection && waitingLines.length < 10) {
        waitingLines.push(line);
      }
    }

    activeLines.forEach(l => console.log(l));

    if (waitingLines.length > 0) {
      console.log('');
      waitingLines.forEach(l => console.log(l));
    }

    console.log('=== End Tasks ===');
  }
  process.exit(0);
}

// Get git info for context
const timestamp = new Date().toLocaleString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).replace(/\//g, '-').replace(',', '');

let branch = '';
try {
  if (runGit('rev-parse --is-inside-work-tree')) {
    branch = runGit('branch --show-current') || '';
  }
} catch {
  // not a git repo
}

// Check if there are recent git commits (proxy for "something was done")
let recentWork = '';
try {
  if (runGit('rev-parse --is-inside-work-tree')) {
    const commits = runGit('log --oneline --since="1 hour ago"');
    recentWork = commits.split('\n').filter(l => l.length > 0).slice(0, 5).join('\n');
  }
} catch {
  // not a git repo
}

// If work was done, add a timestamped note to the Done section
if (recentWork && fs.existsSync(TASKS_FILE)) {
  const content = fs.readFileSync(TASKS_FILE, 'utf8');
  const branchPart = branch ? ` on ${branch}` : '';
  const firstCommit = recentWork.split('\n')[0];
  const doneEntry = `- [x] ~~Session work (${timestamp}${branchPart})~~ — ${firstCommit}`;

  if (content.includes('## Done')) {
    const updatedContent = content.replace(
      /^## Done/m,
      `## Done\n${doneEntry}`
    );
    fs.writeFileSync(TASKS_FILE, updatedContent);
  }
}

// Archive done items older than 7 days
const ARCHIVE_FILE = path.join(PROJECT_DIR, '.claude/learnings/tasks-archive.md');

if (fs.existsSync(TASKS_FILE)) {
  const content = fs.readFileSync(TASKS_FILE, 'utf8');

  // Find done section
  const doneMatch = content.match(/## Done\n([\s\S]*?)(?=\n## |\Z)/);
  if (doneMatch) {
    const doneSection = doneMatch[1];
    const lines = doneSection.trim().split('\n');
    const keep = [];
    const archive = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    for (const line of lines) {
      const dateMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        try {
          const itemDate = new Date(dateMatch[1], parseInt(dateMatch[2]) - 1, dateMatch[3]);
          if (itemDate < cutoff) {
            archive.push(line);
            continue;
          }
        } catch {
          // ignore
        }
      }
      keep.push(line);
    }

    if (archive.length > 0) {
      // Append to archive
      const archiveContent = archive.join('\n') + '\n';
      if (fs.existsSync(ARCHIVE_FILE)) {
        fs.appendFileSync(ARCHIVE_FILE, archiveContent);
      } else {
        fs.writeFileSync(ARCHIVE_FILE, archiveContent);
      }

      // Update TASKS_FILE
      const newDone = keep.join('\n');
      const newContent = content.substring(0, doneMatch.index + 8) + newDone + '\n' + content.substring(doneMatch.index + doneMatch[0].length);
      fs.writeFileSync(TASKS_FILE, newContent);
    }
  }
}

process.exit(0);
