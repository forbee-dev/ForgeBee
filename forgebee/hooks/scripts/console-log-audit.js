#!/usr/bin/env node
/**
 * console-log-audit.js — Audit modified files for debug statements on Stop
 * Stop hook: checks all git-modified JS/TS/PHP files for leftover debug
 * statements (console.log, var_dump, dd, error_log, print_r)
 * Excludes test files where these are intentional
 */

const fs = require('fs');
const path = require('path');
const { isGitRepo, getProjectDir, output, runCommand } = require('./_common.js');

async function main() {
  // Only run in git repos
  if (!isGitRepo()) {
    process.exit(0);
  }

  // Get modified JS/TS/PHP files (both staged and unstaged)
  // --relative: repo-root paths would not resolve when the project is a subfolder of the repo.
  const diff = runCommand(
    'git diff --name-only --relative && git diff --cached --name-only --relative',
    { stdio: ['pipe', 'pipe', 'ignore'] }
  );
  const modifiedFiles = diff.success
    ? [...new Set(diff.output.split('\n').filter((f) => /\.(ts|tsx|js|jsx|php)$/.test(f)))]
    : [];

  if (modifiedFiles.length === 0) {
    process.exit(0);
  }

  // Exclusion patterns
  const excludePattern =
    /\.(test|spec)\.[jt]sx?$|__tests__|__mocks__|\/tests\/|scripts\/hooks\//;

  const warnings = [];
  const projectDir = getProjectDir();

  for (const rel of modifiedFiles) {
    const file = path.join(projectDir, rel);
    // Skip if file doesn't exist or matches exclusion
    if (!fs.existsSync(file)) {
      continue;
    }

    if (excludePattern.test(rel)) {
      continue;
    }

    // Check JS/TS files for console.log
    if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/console\.log/.test(content)) {
          warnings.push(`[Hook] WARNING: console.log in ${rel}`);
        }
      } catch (e) {
        // Silently skip unreadable files
      }
    }

    // Check PHP files for debug statements
    if (/\.php$/.test(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/(?<![>:$\w])\b(?:var_dump|error_log|print_r|dd)\s*\(/.test(content)) {
          warnings.push(`[Hook] WARNING: Debug statement in ${rel}`);
        }
      } catch (e) {
        // Silently skip unreadable files
      }
    }
  }

  // stderr with exit 0 never reaches Claude; systemMessage does.
  if (warnings.length > 0) {
    warnings.push('[Hook] Remove debug statements before committing');
    output({ systemMessage: warnings.join('\n') });
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
