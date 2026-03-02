#!/usr/bin/env node
/**
 * context-guard.js
 * MCP-as-CLI context optimization
 * Runs on PreCompact to backup critical context before compaction
 * Also monitors context usage and suggests optimizations
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  readStdinJson,
  writeFile,
  ensureDir,
  readFile,
  runCommand,
  getDateTimeString,
  log,
  output,
} = require('./_common.js');

async function main() {
  try {
    const input = await readStdinJson();
    const projectDir = getProjectDir();
    const backupDir = path.join(projectDir, '.claude', 'session-cache', 'context-backups');
    ensureDir(backupDir);

    const hookEvent = (input && input.hook_event_name) || '';

    // PRE-COMPACTION: Backup critical context
    if (hookEvent === 'PreCompact') {
      const now = new Date();
      const timestamp = now.getFullYear().toString()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0')
        + '-' + String(now.getHours()).padStart(2, '0')
        + String(now.getMinutes()).padStart(2, '0')
        + String(now.getSeconds()).padStart(2, '0');

      const backupFile = path.join(backupDir, `pre-compact-${timestamp}.md`);

      // Capture what matters before compaction wipes it
      let backupContent = '# Pre-Compaction Context Backup\n';
      backupContent += `# Timestamp: ${new Date().toISOString()}\n\n`;

      // Working Directory
      backupContent += '## Working Directory\n';
      backupContent += process.cwd() + '\n\n';

      // Git State
      backupContent += '## Git State\n';
      const branchResult = runCommand('git branch --show-current', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      backupContent += (branchResult.success ? branchResult.output : 'not a git repo') + '\n';

      const statusResult = runCommand('git status --short', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (statusResult.success) {
        backupContent += statusResult.output
          .split('\n')
          .filter(line => line.trim())
          .slice(0, 20)
          .join('\n') + '\n';
      }
      backupContent += '\n';

      // Recent Changes
      backupContent += '## Recent Changes\n';
      const diffStatResult = runCommand('git diff --stat', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (diffStatResult.success) {
        backupContent += diffStatResult.output
          .split('\n')
          .filter(line => line.trim())
          .slice(-5)
          .join('\n') + '\n';
      } else {
        backupContent += '(none)\n';
      }
      backupContent += '\n';

      // Recent Commits
      backupContent += '## Recent Commits\n';
      const logResult = runCommand('git log --oneline -10', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (logResult.success) {
        backupContent += logResult.output + '\n';
      } else {
        backupContent += '(none)\n';
      }
      backupContent += '\n';

      // Active Tasks
      backupContent += '## Active Tasks\n';
      const tasksPath = path.join(projectDir, 'TASKS.md');
      if (fs.existsSync(tasksPath)) {
        const tasksContent = readFile(tasksPath);
        if (tasksContent) {
          // Extract active section
          const lines = tasksContent.split('\n');
          const startIdx = lines.findIndex(l => l.includes('## Active'));
          const endIdx = startIdx >= 0 ? lines.findIndex((l, i) => i > startIdx && l.startsWith('## ')) : -1;

          if (startIdx >= 0) {
            const activeLines = endIdx >= 0
              ? lines.slice(startIdx, endIdx)
              : lines.slice(startIdx);
            backupContent += activeLines.slice(0, 20).join('\n') + '\n';
          }
        }
      } else {
        backupContent += 'No TASKS.md\n';
      }
      backupContent += '\n';

      // Key Files Modified This Session
      backupContent += '## Key Files Modified This Session\n';
      const diffResult = runCommand('git diff --name-only', {
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      if (diffResult.success) {
        backupContent += diffResult.output
          .split('\n')
          .filter(line => line.trim())
          .slice(0, 20)
          .join('\n') + '\n';
      } else {
        backupContent += '(none)\n';
      }

      writeFile(backupFile, backupContent);
      output(`Context backed up to ${backupFile}`);

      // Keep only last 5 backups
      try {
        const files = fs.readdirSync(backupDir);
        const backupFiles = files
          .filter(f => f.startsWith('pre-compact-') && f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(backupDir, f),
            time: fs.statSync(path.join(backupDir, f)).mtimeMs,
          }))
          .sort((a, b) => b.time - a.time);

        // Remove files beyond the 5th (keep last 5)
        if (backupFiles.length > 5) {
          for (let i = 5; i < backupFiles.length; i++) {
            try {
              fs.unlinkSync(backupFiles[i].path);
            } catch (e) {
              // Ignore delete errors
            }
          }
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      process.exit(0);
    }

    // SESSION START (after compact): Restore context
    if (hookEvent === 'SessionStart') {
      try {
        const files = fs.readdirSync(backupDir);
        const backupFiles = files
          .filter(f => f.startsWith('pre-compact-') && f.endsWith('.md'))
          .map(f => ({
            name: f,
            path: path.join(backupDir, f),
            time: fs.statSync(path.join(backupDir, f)).mtimeMs,
          }))
          .sort((a, b) => b.time - a.time);

        if (backupFiles.length > 0) {
          const latestBackup = backupFiles[0];
          const backupContent = readFile(latestBackup.path);
          if (backupContent) {
            output('=== Restored Context (pre-compaction) ===\n' + backupContent + '\n=== End Restored Context ===');
          }
        }
      } catch (e) {
        // Ignore backup directory errors
      }

      process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
