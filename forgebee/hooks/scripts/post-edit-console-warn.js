#!/usr/bin/env node
/**
 * post-edit-console-warn.js — Warn about debug statements after Edit tool use
 * PostToolUse hook: checks for console.log (JS/TS), error_log/var_dump (PHP)
 * Reports line numbers to help remove debug statements before committing
 */

const fs = require('fs');
const path = require('path');
const { output } = require('./_common.js');

async function main() {
  let input = '';

  // Read stdin synchronously
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch (e) {
    process.stdout.write('');
    process.exit(0);
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (e) {
    process.stdout.write(input);
    process.exit(0);
  }

  const filePath = toolInput?.tool_input?.file_path;

  if (!filePath) {
    process.stdout.write(input);
    process.exit(0);
  }

  // Skip test files — debug statements are often intentional
  const testFilePattern =
    /\.(test|spec)\.[jt]sx?$|__tests__|__mocks__|\/tests\//;
  if (testFilePattern.test(filePath)) {
    process.stdout.write(input);
    process.exit(0);
  }

  const ext = path.extname(filePath).toLowerCase();

  let warning = [];
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    warning = checkJsDebug(filePath);
  } else if (ext === '.php') {
    warning = checkPhpDebug(filePath);
  }

  // stderr with exit 0 never reaches Claude; additionalContext does.
  if (warning.length > 0) {
    output({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: warning.join('\n'),
      },
    });
  } else {
    process.stdout.write(input);
  }
  process.exit(0);
}

function checkJsDebug(file) {
  if (!fs.existsSync(file)) {
    return [];
  }

  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    const matches = [];
    lines.forEach((line, index) => {
      if (/console\.log/.test(line)) {
        matches.push(`${index + 1}: ${line}`);
      }
    });

    if (matches.length > 0) {
      return [
        `[Hook] WARNING: console.log found in ${path.basename(file)}`,
        ...matches.slice(0, 5).map((match) => `  ${match}`),
        '[Hook] Remove console.log before committing',
      ];
    }
  } catch (e) {
    // Silently fail
  }
  return [];
}

function checkPhpDebug(file) {
  if (!fs.existsSync(file)) {
    return [];
  }

  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    // Lookbehind skips method calls and variables such as $cart->add( or Foo::add(.
    const debugPattern = /(?<![>:$\w])\b(?:var_dump|error_log|print_r|dd)\s*\(/;

    const matches = [];
    lines.forEach((line, index) => {
      if (debugPattern.test(line)) {
        matches.push(`${index + 1}: ${line}`);
      }
    });

    if (matches.length > 0) {
      return [
        `[Hook] WARNING: Debug statements found in ${path.basename(file)}`,
        ...matches.slice(0, 5).map((match) => `  ${match}`),
        '[Hook] Remove debug statements before committing',
      ];
    }
  } catch (e) {
    // Silently fail
  }
  return [];
}

main().catch(() => {
  // Silently fail
  process.exit(0);
});
