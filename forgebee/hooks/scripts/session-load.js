#!/usr/bin/env node
/**
 * session-load.js
 * Restore previous session context on SessionStart
 * Reads latest session file and outputs context for Claude
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  readFile,
  output,
  log,
} = require('./_common.js');

function main() {
  try {
    const projectDir = getProjectDir();
    const sessionsDir = path.join(projectDir, '.claude', 'sessions');
    const latestFile = path.join(sessionsDir, 'latest.json');

    // No previous session? Exit silently
    if (!fs.existsSync(latestFile)) {
      process.exit(0);
    }

    // Read session data
    const sessionContent = readFile(latestFile);
    if (!sessionContent) {
      process.exit(0);
    }

    let session;
    try {
      session = JSON.parse(sessionContent);
    } catch (e) {
      log(`Failed to parse session JSON: ${e.message}`);
      process.exit(0);
    }

    const timestamp = session.timestamp || 'unknown';
    const branch = (session.git && session.git.branch) || 'unknown';
    const cwd = session.workingDirectory || 'unknown';

    // Format uncommitted changes and recent commits
    let changes = [];
    let commits = [];

    if (session.git && session.git.uncommittedChanges && Array.isArray(session.git.uncommittedChanges)) {
      changes = session.git.uncommittedChanges.slice(0, 10);
    }

    if (session.git && session.git.recentCommits && Array.isArray(session.git.recentCommits)) {
      commits = session.git.recentCommits.slice(0, 5);
    }

    // Check learnings file
    const learningsFile = path.join(projectDir, '.claude', 'learnings', 'learnings.md');
    let recentLearnings = '';
    if (fs.existsSync(learningsFile)) {
      const learningsContent = readFile(learningsFile);
      if (learningsContent) {
        const lines = learningsContent.split('\n');
        recentLearnings = lines.slice(Math.max(0, lines.length - 20)).join('\n');
      }
    }

    // Output session context (stdout gets injected into Claude's context)
    let contextOutput = '';
    contextOutput += '=== Previous Session Context ===\n';
    contextOutput += `Last active: ${timestamp}\n`;
    contextOutput += `Branch: ${branch}\n`;
    contextOutput += `Working directory: ${cwd}\n`;

    if (changes.length > 0) {
      contextOutput += '\nUncommitted changes:\n';
      contextOutput += changes.join('\n') + '\n';
    }

    if (commits.length > 0) {
      contextOutput += '\nRecent commits:\n';
      contextOutput += commits.join('\n') + '\n';
    }

    if (recentLearnings.trim()) {
      contextOutput += '\nRecent learnings:\n';
      contextOutput += recentLearnings + '\n';
    }

    contextOutput += '=== End Previous Session ===\n';

    output(contextOutput);
    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
