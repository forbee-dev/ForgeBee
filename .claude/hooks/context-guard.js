#!/usr/bin/env node
/**
 * context-guard.js — MCP-as-CLI context optimization
 * Runs on PreCompact to backup critical context before compaction
 * Also monitors context usage and suggests optimizations
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

const BACKUP_DIR = path.join(PROJECT_DIR, '.claude/session-cache/context-backups');
const HOOK_EVENT = inputData.hook_event_name || '';

// Ensure backup dir exists
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ── PRE-COMPACTION: Backup critical context ───────────────────────────
if (HOOK_EVENT === 'PreCompact') {
  const timestamp = new Date().toISOString().replace(/[:-]/g, '').slice(0, 15);
  const backupFile = path.join(BACKUP_DIR, `pre-compact-${timestamp}.md`);

  // Capture what matters before compaction wipes it
  let backup = '# Pre-Compaction Context Backup\n';
  backup += `# Timestamp: ${new Date().toISOString()}\n\n`;

  backup += '## Working Directory\n';
  backup += `${process.cwd()}\n\n`;

  backup += '## Git State\n';
  try {
    const branch = runGit('branch --show-current') || 'not a git repo';
    backup += `${branch}\n`;
    const status = runGit('status --short');
    if (status) {
      backup += status.split('\n').slice(0, 20).join('\n') + '\n';
    }
  } catch {
    backup += 'not a git repo\n';
  }
  backup += '\n';

  backup += '## Recent Changes\n';
  try {
    const diffStat = runGit('diff --stat');
    if (diffStat) {
      backup += diffStat.split('\n').slice(-5).join('\n') + '\n';
    }
  } catch {
    // ignore
  }
  backup += '\n';

  backup += '## Recent Commits\n';
  try {
    const commits = runGit('log --oneline -10');
    if (commits) {
      backup += commits + '\n';
    }
  } catch {
    // ignore
  }
  backup += '\n';

  backup += '## Active Tasks\n';
  const tasksFile = path.join(PROJECT_DIR, 'TASKS.md');
  if (fs.existsSync(tasksFile)) {
    const content = fs.readFileSync(tasksFile, 'utf8');
    const lines = content.split('\n');
    let inActiveSection = false;
    let taskLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('## Active')) {
        inActiveSection = true;
        continue;
      }
      if (line.startsWith('## ') && !line.startsWith('## Active')) {
        inActiveSection = false;
      }
      if (inActiveSection && taskLines.length < 20) {
        taskLines.push(line);
      }
    }

    if (taskLines.length > 0) {
      backup += taskLines.join('\n') + '\n';
    } else {
      backup += 'No TASKS.md\n';
    }
  } else {
    backup += 'No TASKS.md\n';
  }
  backup += '\n';

  backup += '## Key Files Modified This Session\n';
  try {
    const diffNames = runGit('diff --name-only');
    if (diffNames) {
      backup += diffNames.split('\n').slice(0, 20).join('\n') + '\n';
    }
  } catch {
    // ignore
  }

  fs.writeFileSync(backupFile, backup);

  console.log(`Context backed up to ${backupFile}`);

  // Keep only last 5 backups
  const backupFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('pre-compact-') && f.endsWith('.md'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  for (let i = 5; i < backupFiles.length; i++) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, backupFiles[i].name));
    } catch {
      // ignore
    }
  }

  process.exit(0);
}

// ── SESSION START (after compact): Restore context ────────────────────
if (HOOK_EVENT === 'SessionStart') {
  // Find most recent backup
  const backupFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('pre-compact-') && f.endsWith('.md'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (backupFiles.length > 0) {
    const latestBackup = path.join(BACKUP_DIR, backupFiles[0].name);
    const content = fs.readFileSync(latestBackup, 'utf8');

    console.log('=== Restored Context (pre-compaction) ===');
    console.log(content);
    console.log('=== End Restored Context ===');
  }

  process.exit(0);
}

process.exit(0);
