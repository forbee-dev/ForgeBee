#!/usr/bin/env node
/**
 * post-edit-typecheck.js — Run type checking after Edit tool use
 * PostToolUse hook: runs tsc --noEmit for TS files, phpstan for PHP files
 * Reports only errors related to the edited file
 * Fails silently if type checker not installed — non-blocking
 */

const fs = require('fs');
const path = require('path');
const { runCommand, log } = require('./_common.js');

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

  if (['.ts', '.tsx'].includes(ext)) {
    typecheckTs(filePath);
  } else if (ext === '.php') {
    typecheckPhp(filePath);
  }

  process.stdout.write(input);
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
    return;
  }

  const result = runCommand(`cd "${tsconfigDir}" && npx tsc --noEmit --pretty false`, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!result.output) {
    return;
  }

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
    log(`[Hook] TypeScript errors in ${basename}:`);
    relevantLines.slice(0, 10).forEach((line) => log(line));
  }
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
    return;
  }

  const phpstanBin = path.join(phpstanDir, 'vendor', 'bin', 'phpstan');
  if (!fs.existsSync(phpstanBin)) {
    return;
  }

  const result = runCommand(
    `cd "${phpstanDir}" && "${phpstanBin}" analyse "${resolved}" --no-progress --error-format=raw`,
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  if (result.output && !result.output.includes('No errors')) {
    log(`[Hook] PHPStan errors in ${path.basename(file)}:`);
    result.output.split('\n').slice(0, 10).forEach((line) => {
      if (line.trim()) log(line);
    });
  }
}

main().catch(() => {
  // Silently fail
  process.exit(0);
});
