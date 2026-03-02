#!/usr/bin/env node
/**
 * self-improve.js
 * Capture learnings and patterns on session Stop
 * Appends insights to learnings.md for future reference
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  readStdinJson,
  readFile,
  writeFile,
  appendFile,
  runCommand,
  getDateString,
  log,
} = require('./_common.js');

async function main() {
  try {
    const input = await readStdinJson();

    // Prevent infinite loop
    if (input && input.stop_hook_active === true) {
      process.exit(0);
    }

    const projectDir = getProjectDir();
    const learningsDir = path.join(projectDir, '.claude', 'learnings');
    const learningsFile = path.join(learningsDir, 'learnings.md');

    // Ensure learnings directory exists
    if (!fs.existsSync(learningsDir)) {
      fs.mkdirSync(learningsDir, { recursive: true });
    }

    // Ensure learnings file exists
    if (!fs.existsSync(learningsFile)) {
      const template = `# Learnings

> Auto-managed by ForgeBee. Edit freely.

## Key Insights
<!-- Add key learnings here -->

## Patterns Discovered
<!-- Document patterns found during development -->

## Blockers & Solutions
<!-- Document issues and their resolutions -->
`;
      writeFile(learningsFile, template);
    }

    const now = new Date();
    const timestamp = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0') + ' '
      + String(now.getHours()).padStart(2, '0') + ':'
      + String(now.getMinutes()).padStart(2, '0') + ' UTC';

    const sessionId = (input && input.session_id) || 'unknown';

    // Gather what happened this session
    let gitDiffStat = '';
    const gitResult = runCommand('git rev-parse --is-inside-work-tree', {
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    if (gitResult.success && gitResult.output === 'true') {
      const diffResult = runCommand('git diff --stat HEAD~1', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (diffResult.success) {
        const lines = diffResult.output.split('\n').filter(line => line.trim());
        gitDiffStat = lines.length > 0 ? lines[lines.length - 1] : '';
      }
    }

    // Check permission cache for new entries
    const cacheFile = path.join(projectDir, '.claude', 'session-cache', 'permissions.json');
    let newPermissions = '';
    if (fs.existsSync(cacheFile)) {
      try {
        const cacheContent = readFile(cacheFile);
        if (cacheContent && cacheContent.length > 3) {
          const cache = JSON.parse(cacheContent);
          const keys = Object.keys(cache);
          newPermissions = keys.slice(0, 5).join(', ');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Append session entry
    let sessionEntry = `### Session: ${timestamp}\n`;
    sessionEntry += `- Session ID: \`${sessionId}\`\n`;
    if (gitDiffStat) {
      sessionEntry += `- Changes: ${gitDiffStat}\n`;
    }
    if (newPermissions) {
      sessionEntry += `- Permission patterns learned: ${newPermissions}\n`;
    }
    sessionEntry += '\n';

    appendFile(learningsFile, sessionEntry);

    // Trim learnings file if it gets too long (keep last 200 lines + header)
    const learningsContent = readFile(learningsFile);
    if (learningsContent) {
      const lines = learningsContent.split('\n');
      if (lines.length > 250) {
        // Keep the header (first 6 lines) and last 200 lines
        const headerLines = lines.slice(0, 6);
        const recentLines = lines.slice(Math.max(6, lines.length - 200));

        let trimmedContent = headerLines.join('\n') + '\n\n';
        trimmedContent += '*[Older entries archived]*\n\n';
        trimmedContent += recentLines.join('\n');

        writeFile(learningsFile, trimmedContent);
      }
    }

    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
