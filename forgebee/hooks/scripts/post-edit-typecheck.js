#!/usr/bin/env node
/**
 * post-edit-typecheck.js — Run type checking after Edit tool use
 * PostToolUse hook: runs tsc --noEmit for TS files, phpstan for PHP files
 * Reports only errors related to the edited file
 * Fails silently if type checker not installed — non-blocking
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

  const ext = path.extname(filePath).toLowerCase();

  let report = [];
  if (['.ts', '.tsx'].includes(ext)) {
    report = typecheckTs(filePath);
  } else if (ext === '.php') {
    report = typecheckPhp(filePath);
  }

  // stderr with exit 0 never reaches Claude; additionalContext does.
  if (report.length > 0) {
    output({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: report.join('\n'),
      },
    });
  } else {
    process.stdout.write(input);
  }
  process.exit(0);
}

function findConfigDir(startDir, configFile, maxDepth = 20) {
  let currentDir = path.resolve(startDir);
  let depth = 0;

  while (depth < maxDepth) {
    if (fs.existsSync(path.join(currentDir, configFile))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}

function typecheckTs(file) {
  const resolved = path.resolve(file);
  const dir = path.dirname(resolved);

  const tsconfigDir = findConfigDir(dir, 'tsconfig.json');
  if (!tsconfigDir) {
    return [];
  }

  // Use the project's local tsc; do NOT fall back to `npx` (a missing package
  // would trigger a network install and blow the hook timeout). Skip if absent.
  const tscBin = path.join(tsconfigDir, 'node_modules', '.bin', 'tsc');
  if (!fs.existsSync(tscBin)) {
    return [];
  }

  let tscOutput = '';
  try {
    tscOutput = execFileSync(tscBin, ['--noEmit', '--pretty', 'false'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: tsconfigDir,
      // Below the 30s hook timeout so tsc is cut off here and still reports.
      timeout: 25000,
    });
  } catch (e) {
    // tsc exits non-zero when there are type errors — capture stdout
    tscOutput = e.stdout ? e.stdout.toString() : '';
  }

  if (!tscOutput) {
    return [];
  }

  const result = { output: tscOutput.trim() };

  // Filter to errors in the edited file only
  const basename = path.basename(file);
  let relpath = file;
  try {
    relpath = path.relative(tsconfigDir, resolved);
  } catch (e) {
    // Fall back to original path
  }

  const lines = result.output.split('\n');
  let relevantLines = lines.filter((line) => line.includes(relpath));

  // Fallback: try basename match
  if (relevantLines.length === 0) {
    relevantLines = lines.filter((line) => line.includes(basename));
  }

  if (relevantLines.length > 0) {
    return [`[Hook] TypeScript errors in ${basename}:`, ...relevantLines.slice(0, 10)];
  }
  return [];
}

function typecheckPhp(file) {
  const resolved = path.resolve(file);
  const dir = path.dirname(resolved);

  // Check for phpstan config
  let phpstanDir = findConfigDir(dir, 'phpstan.neon');
  if (!phpstanDir) {
    phpstanDir = findConfigDir(dir, 'phpstan.neon.dist');
  }
  if (!phpstanDir) {
    phpstanDir = findConfigDir(dir, 'phpstan.dist.neon');
  }

  if (!phpstanDir) {
    return [];
  }

  const phpstanBin = path.join(phpstanDir, 'vendor', 'bin', 'phpstan');
  if (!fs.existsSync(phpstanBin)) {
    return [];
  }

  let phpstanOutput = '';
  try {
    phpstanOutput = execFileSync(phpstanBin, ['analyse', resolved, '--no-progress', '--error-format=raw'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: phpstanDir,
    });
  } catch (e) {
    phpstanOutput = e.stdout ? e.stdout.toString() : '';
  }

  if (phpstanOutput && !phpstanOutput.includes('No errors')) {
    return [
      `[Hook] PHPStan errors in ${path.basename(file)}:`,
      ...phpstanOutput.split('\n').filter((line) => line.trim()).slice(0, 10),
    ];
  }
  return [];
}

main().catch(() => {
  // Silently fail
  process.exit(0);
});
