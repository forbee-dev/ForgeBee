#!/usr/bin/env node
/**
 * console-log-audit.js — Audit modified files for debug statements on Stop
 * Stop hook: checks all git-modified JS/TS/PHP files for leftover debug
 * statements (console.log, var_dump, dd, error_log, print_r)
 * Excludes test files where these are intentional
 */

const fs = require('fs');
const path = require('path');
const { isGitRepo, getGitModifiedFiles, log, runCommand } = require('./_common.js');

async function main() {
  // Only run in git repos
  if (!isGitRepo()) {
    process.exit(0);
  }

  // Get modified JS/TS/PHP files (both staged and unstaged)
  const modifiedFiles = getGitModifiedFiles('\\.(ts|tsx|js|jsx|php)$');

  if (modifiedFiles.length === 0) {
    process.exit(0);
  }

  // Exclusion patterns
  const excludePattern =
    /\.(test|spec)\.[jt]sx?$|__tests__|__mocks__|\/tests\/|scripts\/hooks\//;

  let hasDebug = false;

  for (const file of modifiedFiles) {
    // Skip if file doesn't exist or matches exclusion
    if (!fs.existsSync(file)) {
      continue;
    }

    if (excludePattern.test(file)) {
      continue;
    }

    // Check JS/TS files for console.log
    if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/console\.log/.test(content)) {
          log(`[Hook] WARNING: console.log in ${file}`);
          hasDebug = true;
        }
      } catch (e) {
        // Silently skip unreadable files
      }
    }

    // Check PHP files for debug statements
    if (/\.php$/.test(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/(var_dump|error_log|print_r|dd)\s*\(/.test(content)) {
          log(`[Hook] WARNING: Debug statement in ${file}`);
          hasDebug = true;
        }
      } catch (e) {
        // Silently skip unreadable files
      }
    }
  }

  if (hasDebug) {
    log('[Hook] Remove debug statements before committing');
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
