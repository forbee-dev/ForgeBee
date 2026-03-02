#!/usr/bin/env node
/**
 * session-load.js — Restore previous session context on SessionStart
 * Reads latest session file and outputs context for Claude
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs } = require('./_common.js');

initDirs();

const SESSIONS_DIR = path.join(PROJECT_DIR, '.claude/sessions');
const LATEST = path.join(SESSIONS_DIR, 'latest.json');

// No previous session? Exit silently
if (!fs.existsSync(LATEST)) {
  process.exit(0);
}

try {
  const session = JSON.parse(fs.readFileSync(LATEST, 'utf8'));

  const timestamp = session.timestamp || 'unknown';
  const branch = session.git?.branch || 'unknown';
  const cwd = session.workingDirectory || 'unknown';
  const changes = (session.git?.uncommittedChanges || []).slice(0, 10);
  const commits = (session.git?.recentCommits || []).slice(0, 5);

  // Check learnings file
  const learningsFile = path.join(PROJECT_DIR, '.claude/learnings/learnings.md');
  let recentLearnings = '';
  if (fs.existsSync(learningsFile)) {
    const content = fs.readFileSync(learningsFile, 'utf8');
    const lines = content.split('\n');
    recentLearnings = lines.slice(Math.max(0, lines.length - 20)).join('\n');
  }

  // Output session context (stdout gets injected into Claude's context)
  console.log('=== Previous Session Context ===');
  console.log(`Last active: ${timestamp}`);
  console.log(`Branch: ${branch}`);
  console.log(`Working directory: ${cwd}`);

  if (changes.length > 0) {
    console.log('');
    console.log('Uncommitted changes:');
    changes.forEach(c => console.log(c));
  }

  if (commits.length > 0) {
    console.log('');
    console.log('Recent commits:');
    commits.forEach(c => console.log(c));
  }

  if (recentLearnings.trim().length > 0) {
    console.log('');
    console.log('Recent learnings:');
    console.log(recentLearnings);
  }

  console.log('=== End Previous Session ===');

  process.exit(0);
} catch (err) {
  // If parsing fails, exit silently
  process.exit(0);
}
