#!/usr/bin/env node
/**
 * post-edit-format.js — Auto-format JS/TS/PHP/CSS files after Edit tool use
 * PostToolUse hook: detects project formatter and runs it on the edited file
 * Supports: Biome, Prettier (JS/TS), PHP-CS-Fixer, Pint (PHP), Stylelint (CSS)
 * Fails silently if no formatter is found — non-blocking
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { findProjectRoot, log } = require('./_common.js');

const FORMAT_TIMEOUT_MS = 10000;

// Resolve a tool from the project's local node_modules/.bin. Returns null if it
// is not installed locally — we deliberately do NOT fall back to `npx`, which can
// trigger a network install and blow the PostToolUse hook timeout. Skipping the
// format is non-blocking.
function localBin(root, name) {
  const bin = path.join(root, 'node_modules', '.bin', name);
  return fs.existsSync(bin) ? bin : null;
}

function runFormatter(bin, args, root) {
  try {
    execFileSync(bin, args, {
      stdio: ['pipe', 'ignore', 'ignore'],
      cwd: root,
      timeout: FORMAT_TIMEOUT_MS,
    });
  } catch (e) { /* non-blocking */ }
}

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
    process.exit(0);
  }

  const filePath = toolInput?.tool_input?.file_path;

  if (!filePath) {
    process.exit(0);
  }

  // Format based on file extension
  const ext = path.extname(filePath).toLowerCase();

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    formatJsTs(filePath);
  } else if (ext === '.php') {
    formatPhp(filePath);
  } else if (['.css', '.scss', '.less'].includes(ext)) {
    formatCss(filePath);
  }
  process.exit(0);
}

function formatJsTs(file) {
  const dir = path.dirname(path.resolve(file));
  const root = findProjectRoot(dir) || dir;

  // Check for Biome (config present + tool installed locally)
  if (
    fs.existsSync(path.join(root, 'biome.json')) ||
    fs.existsSync(path.join(root, 'biome.jsonc'))
  ) {
    const bin = localBin(root, 'biome');
    if (bin) runFormatter(bin, ['format', '--write', file], root);
    return;
  }

  // Check for Prettier
  const prettierConfigs = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.yml',
    '.prettierrc.yaml',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs',
  ];

  for (const config of prettierConfigs) {
    if (fs.existsSync(path.join(root, config))) {
      const bin = localBin(root, 'prettier');
      if (bin) runFormatter(bin, ['--write', file], root);
      return;
    }
  }
}

function formatPhp(file) {
  const dir = path.dirname(path.resolve(file));
  const root = findProjectRoot(dir) || dir;

  // Check for Pint
  if (
    fs.existsSync(path.join(root, 'pint.json')) ||
    fs.existsSync(path.join(root, 'vendor', 'bin', 'pint'))
  ) {
    runFormatter(path.join(root, 'vendor', 'bin', 'pint'), [file], root);
    return;
  }

  // Check for PHP-CS-Fixer
  if (
    fs.existsSync(path.join(root, '.php-cs-fixer.php')) ||
    fs.existsSync(path.join(root, '.php-cs-fixer.dist.php'))
  ) {
    runFormatter(path.join(root, 'vendor', 'bin', 'php-cs-fixer'), ['fix', file], root);
    return;
  }
}

function formatCss(file) {
  const dir = path.dirname(path.resolve(file));
  const root = findProjectRoot(dir) || dir;

  // Check for Stylelint
  const stylelintConfigs = ['.stylelintrc', '.stylelintrc.json', 'stylelint.config.js'];
  for (const config of stylelintConfigs) {
    if (fs.existsSync(path.join(root, config))) {
      const bin = localBin(root, 'stylelint');
      if (bin) runFormatter(bin, ['--fix', file], root);
      return;
    }
  }

  // Fallback to Prettier
  if (
    fs.existsSync(path.join(root, '.prettierrc')) ||
    fs.existsSync(path.join(root, 'prettier.config.js'))
  ) {
    const bin = localBin(root, 'prettier');
    if (bin) runFormatter(bin, ['--write', file], root);
    return;
  }
}

main().catch(() => {
  // Silently fail
  process.exit(0);
});
