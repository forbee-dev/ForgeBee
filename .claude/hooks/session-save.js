#!/usr/bin/env node
/**
 * session-save.js — Persist session state on Stop event
 * Captures: timestamp, working dir, git state, session summary
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs, readStdinSync, runGit } = require('./_common.js');

initDirs();

const input = readStdinSync();

try {
  const inputData = JSON.parse(input);

  // Prevent infinite loop if stop_hook_active
  if (inputData.stop_hook_active === true) {
    process.exit(0);
  }
} catch {
  // If no JSON input, continue anyway
}

const SESSIONS_DIR = path.join(PROJECT_DIR, '.claude/sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const timestamp = new Date().toISOString();
const filename = new Date().toISOString().split('T')[0] + '-' + new Date().toISOString().slice(11, 19).replace(/:/g, '');

let inputData = {};
try {
  inputData = JSON.parse(input);
} catch {
  // empty
}

const sessionId = inputData.session_id || 'unknown';
const cwd = process.cwd();

// Gather git context (if in a git repo)
let gitBranch = '';
let gitStatus = '';
let gitLastCommits = '';

try {
  if (runGit('rev-parse --is-inside-work-tree')) {
    gitBranch = runGit('branch --show-current') || 'detached';
    const status = runGit('status --short');
    gitStatus = status.split('\n').filter(line => line.length > 0).slice(0, 20);
    const commits = runGit('log --oneline -5');
    gitLastCommits = commits.split('\n').filter(line => line.length > 0);
  }
} catch {
  // Not a git repo
}

// Build session state JSON
const sessionState = {
  sessionId,
  timestamp,
  workingDirectory: cwd,
  git: {
    branch: gitBranch,
    uncommittedChanges: gitStatus,
    recentCommits: gitLastCommits
  }
};

// Write session file
const sessionFile = path.join(SESSIONS_DIR, `${filename}.json`);
fs.writeFileSync(sessionFile, JSON.stringify(sessionState, null, 2));

// Maintain symlink to latest session
try {
  fs.unlinkSync(path.join(SESSIONS_DIR, 'latest.json'));
} catch {
  // File doesn't exist yet
}
fs.symlinkSync(`${filename}.json`, path.join(SESSIONS_DIR, 'latest.json'));

// Cleanup: keep only last 20 sessions
const files = fs.readdirSync(SESSIONS_DIR)
  .filter(f => f.endsWith('.json') && f !== 'latest.json')
  .map(f => ({
    name: f,
    time: fs.statSync(path.join(SESSIONS_DIR, f)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

for (let i = 20; i < files.length; i++) {
  try {
    fs.unlinkSync(path.join(SESSIONS_DIR, files[i].name));
  } catch {
    // ignore
  }
}

process.exit(0);
