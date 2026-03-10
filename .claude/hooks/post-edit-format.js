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

  // Format based on file extension
  const ext = path.extname(filePath).toLowerCase();

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    formatJsTs(filePath);
  } else if (ext === '.php') {
    formatPhp(filePath);
  } else if (['.css', '.scss', '.less'].includes(ext)) {
    formatCss(filePath);
  }

  // Always pass through original data
  process.stdout.write(input);
  process.exit(0);
}

function formatJsTs(file) {
  const dir = path.dirname(path.resolve(file));
  const root = findProjectRoot(dir) || dir;

  // Check for Biome
  if (
    fs.existsSync(path.join(root, 'biome.json')) ||
    fs.existsSync(path.join(root, 'biome.jsonc'))
  ) {
    try {
      execFileSync('npx', ['@biomejs/biome', 'format', '--write', file], {
        stdio: ['pipe', 'ignore', 'ignore'],
        cwd: root,
      });
    } catch (e) { /* non-blocking */ }
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
      try {
        execFileSync('npx', ['prettier', '--write', file], {
          stdio: ['pipe', 'ignore', 'ignore'],
          cwd: root,
        });
      } catch (e) { /* non-blocking */ }
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
    try {
      execFileSync(path.join(root, 'vendor', 'bin', 'pint'), [file], {
        stdio: ['pipe', 'ignore', 'ignore'],
        cwd: root,
      });
    } catch (e) { /* non-blocking */ }
    return;
  }

  // Check for PHP-CS-Fixer
  if (
    fs.existsSync(path.join(root, '.php-cs-fixer.php')) ||
    fs.existsSync(path.join(root, '.php-cs-fixer.dist.php'))
  ) {
    try {
      execFileSync(path.join(root, 'vendor', 'bin', 'php-cs-fixer'), ['fix', file], {
        stdio: ['pipe', 'ignore', 'ignore'],
        cwd: root,
      });
    } catch (e) { /* non-blocking */ }
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
      try {
        execFileSync('npx', ['stylelint', '--fix', file], {
          stdio: ['pipe', 'ignore', 'ignore'],
          cwd: root,
        });
      } catch (e) { /* non-blocking */ }
      return;
    }
  }

  // Fallback to Prettier
  if (
    fs.existsSync(path.join(root, '.prettierrc')) ||
    fs.existsSync(path.join(root, 'prettier.config.js'))
  ) {
    try {
      execFileSync('npx', ['prettier', '--write', file], {
        stdio: ['pipe', 'ignore', 'ignore'],
        cwd: root,
      });
    } catch (e) { /* non-blocking */ }
    return;
  }
}

main().catch(() => {
  // Silently fail
  process.exit(0);
});
