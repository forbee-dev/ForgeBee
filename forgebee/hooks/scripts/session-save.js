#!/usr/bin/env node
/**
 * session-save.js
 * Persist session state on Stop event
 * Captures: timestamp, working dir, git state, session summary
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  readStdinJson,
  writeFile,
  ensureDir,
  runCommand,
  getISOString,
  log,
} = require('./_common.js');

async function main() {
  try {
    // Read stdin JSON input
    const input = await readStdinJson();

    // Prevent infinite loop if stop_hook_active
    if (input && input.stop_hook_active === true) {
      process.exit(0);
    }

    const projectDir = getProjectDir();
    const sessionsDir = path.join(projectDir, '.claude', 'sessions');
    ensureDir(sessionsDir);

    const timestamp = getISOString();
    const sessionId = (input && input.session_id) || 'unknown';
    // One file per session, overwritten each turn: parallel sessions cannot clobber each other.
    let filename = sessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'unknown';
    if (filename === 'latest') filename = 'session-latest'; // latest.json is the pointer file

    // Gather git context (if in a git repo)
    let gitBranch = '';
    let gitStatus = '';
    let gitLastCommits = '';

    const isGitRepoResult = runCommand('git rev-parse --is-inside-work-tree', {
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    if (isGitRepoResult.success && isGitRepoResult.output === 'true') {
      const branchResult = runCommand('git branch --show-current', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      gitBranch = branchResult.success ? branchResult.output : 'detached';

      const statusResult = runCommand('git status --short', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (statusResult.success) {
        gitStatus = statusResult.output.split('\n')
          .filter(line => line.trim())
          .slice(0, 20)
          .join('\n');
      }

      const commitsResult = runCommand('git log --oneline -5', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      gitLastCommits = commitsResult.success ? commitsResult.output : '';
    }

    // Build session state JSON
    const sessionData = {
      sessionId,
      timestamp,
      workingDirectory: process.cwd(),
      git: {
        branch: gitBranch,
        uncommittedChanges: gitStatus
          .split('\n')
          .filter(line => line.length > 0),
        recentCommits: gitLastCommits
          .split('\n')
          .filter(line => line.length > 0),
      },
    };

    // Write session file
    const sessionFile = path.join(sessionsDir, `${filename}.json`);
    const sessionContent = JSON.stringify(sessionData, null, 2);
    writeFile(sessionFile, sessionContent);

    // Maintain symlink to latest session
    const latestFile = path.join(sessionsDir, 'latest.json');
    try {
      // Remove any existing latest.json — including a DANGLING symlink, which
      // fs.existsSync() reports as false. lstat (no symlink follow) detects it;
      // it throws when nothing is there, which the catch treats as "nothing to do".
      fs.lstatSync(latestFile);
      fs.unlinkSync(latestFile);
    } catch (e) {
      // Not present — nothing to remove.
    }
    try {
      fs.symlinkSync(`${filename}.json`, latestFile);
    } catch (e) {
      // Symlinks may be unsupported (e.g. Windows without privilege) — fall back
      // to a real copy so latest.json still points at the newest session.
      try { fs.copyFileSync(sessionFile, latestFile); } catch (e2) { /* best-effort */ }
    }

    // Cleanup: keep only last 20 sessions
    try {
      const files = fs.readdirSync(sessionsDir);
      const jsonFiles = files
        .filter(f => f.endsWith('.json') && f !== 'latest.json')
        .map(f => ({
          name: f,
          path: path.join(sessionsDir, f),
          time: fs.statSync(path.join(sessionsDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      // Keep the newest 20 session files
      if (jsonFiles.length > 20) {
        for (let i = 20; i < jsonFiles.length; i++) {
          try {
            fs.unlinkSync(jsonFiles[i].path);
          } catch (e) {
            // Ignore delete errors
          }
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
