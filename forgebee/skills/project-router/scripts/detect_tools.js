#!/usr/bin/env node
/**
 * detect_tools.js — Discover available dev tools in the project
 * Agents call this to find the right commands instead of guessing.
 *
 * Usage: node detect_tools.js [project_dir] [category]
 * Categories: test, lint, build, db, format, all
 * Output: JSON with available commands for the category
 */

const fs = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────────────────
const PROJECT_DIR = process.argv[2] || '.';
const CATEGORY = process.argv[3] || 'all';
const result = {};

// ── Utilities ─────────────────────────────────────────────────────────────

/**
 * Set a nested property in the result object using dot notation
 * @param {string} path - Dot notation path (e.g., 'test.node')
 * @param {string} value - Value to set
 */
function setPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Check if a file exists
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(PROJECT_DIR, filePath));
  } catch {
    return false;
  }
}

/**
 * Parse package.json and cache it
 * @returns {object|null}
 */
function getPackageJson() {
  const pkgPath = path.join(PROJECT_DIR, 'package.json');
  try {
    if (fs.existsSync(pkgPath)) {
      const content = fs.readFileSync(pkgPath, 'utf8');
      return JSON.parse(content);
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Parse composer.json
 * @returns {object|null}
 */
function getComposerJson() {
  const composerPath = path.join(PROJECT_DIR, 'composer.json');
  try {
    if (fs.existsSync(composerPath)) {
      const content = fs.readFileSync(composerPath, 'utf8');
      return JSON.parse(content);
    }
  } catch {
    // Silent fail
  }
  return null;
}

/**
 * Get npm script command
 * @param {string} scriptName - Script name to look up
 * @param {object} pkg - Parsed package.json
 * @returns {string|null} Command to run, or null if not found
 */
function getNpmScript(scriptName, pkg) {
  if (!pkg || !pkg.scripts || !pkg.scripts[scriptName]) {
    return null;
  }
  return `${PKG_RUN} ${scriptName}`;
}

/**
 * Check if node module is in devDependencies
 * @param {object} pkg - Parsed package.json
 * @param {string} moduleName - Module name to check
 * @returns {boolean}
 */
function hasDevDependency(pkg, moduleName) {
  if (!pkg || !pkg.devDependencies) {
    return false;
  }
  return moduleName in pkg.devDependencies;
}

// ── Package manager detection ─────────────────────────────────────────────

let PKG_MGR = 'none';
let PKG_RUN = '';

if (fileExists('pnpm-lock.yaml')) {
  PKG_MGR = 'pnpm';
  PKG_RUN = 'pnpm';
} else if (fileExists('yarn.lock')) {
  PKG_MGR = 'yarn';
  PKG_RUN = 'yarn';
} else if (fileExists('bun.lockb') || fileExists('bun.lock')) {
  PKG_MGR = 'bun';
  PKG_RUN = 'bun';
} else if (fileExists('package-lock.json') || fileExists('package.json')) {
  PKG_MGR = 'npm';
  PKG_RUN = 'npm run';
}

// Initialize package manager info
if (!result.package_manager) {
  result.package_manager = {};
}

if (fileExists('composer.json')) {
  result.package_manager.php = 'composer';
}

result.package_manager.node = PKG_MGR;

// ── Cache parsed files ────────────────────────────────────────────────────

const pkg = getPackageJson();
const composer = getComposerJson();

// ── TEST RUNNER ───────────────────────────────────────────────────────────

if (CATEGORY === 'test' || CATEGORY === 'all') {
  // Node test runner
  let nodeTest = null;

  const testScript = getNpmScript('test', pkg);
  if (testScript) {
    nodeTest = testScript;
  } else if (
    fileExists('vitest.config.ts') ||
    fileExists('vitest.config.js')
  ) {
    nodeTest = 'npx vitest';
  } else if (
    fileExists('jest.config.ts') ||
    fileExists('jest.config.js') ||
    fileExists('jest.config.mjs')
  ) {
    nodeTest = 'npx jest';
  } else if (hasDevDependency(pkg, 'vitest')) {
    nodeTest = 'npx vitest';
  } else if (hasDevDependency(pkg, 'jest')) {
    nodeTest = 'npx jest';
  }

  if (nodeTest) {
    if (!result.test) result.test = {};
    result.test.node = nodeTest;

    // Node test with coverage
    const coverageScript = getNpmScript('test:coverage', pkg);
    if (coverageScript) {
      result.test.node_coverage = coverageScript;
    } else {
      if (nodeTest.includes('vitest')) {
        result.test.node_coverage = `${nodeTest} --coverage`;
      } else if (nodeTest.includes('jest')) {
        result.test.node_coverage = `${nodeTest} --coverage`;
      }
    }
  }

  // E2E test runner
  const e2eScript = getNpmScript('test:e2e', pkg);
  if (e2eScript) {
    if (!result.test) result.test = {};
    result.test.e2e = e2eScript;
  } else if (
    fileExists('playwright.config.ts') ||
    fileExists('playwright.config.js')
  ) {
    if (!result.test) result.test = {};
    result.test.e2e = 'npx playwright test';
  } else if (
    fileExists('cypress.config.ts') ||
    fileExists('cypress.config.js')
  ) {
    if (!result.test) result.test = {};
    result.test.e2e = 'npx cypress run';
  }

  // PHP test runner
  let phpTest = null;
  if (fileExists('vendor/bin/phpunit')) {
    phpTest = './vendor/bin/phpunit';
  } else if (
    fileExists('phpunit.xml') ||
    fileExists('phpunit.xml.dist')
  ) {
    phpTest = 'phpunit';
  }

  if (composer && composer.scripts && composer.scripts.test) {
    phpTest = 'composer test';
  }

  if (fileExists('.wp-env.json') && phpTest) {
    if (!result.test) result.test = {};
    result.test.php_wpenv = 'npx wp-env run tests-cli phpunit';
  }

  if (phpTest) {
    if (!result.test) result.test = {};
    result.test.php = phpTest;
  }
}

// ── LINTER ────────────────────────────────────────────────────────────────

if (CATEGORY === 'lint' || CATEGORY === 'all') {
  // Node linter
  const lintScript = getNpmScript('lint', pkg);
  if (lintScript) {
    if (!result.lint) result.lint = {};
    result.lint.node = lintScript;
  } else if (
    fileExists('.eslintrc.js') ||
    fileExists('.eslintrc.json') ||
    fileExists('.eslintrc.cjs') ||
    fileExists('eslint.config.js') ||
    fileExists('eslint.config.mjs')
  ) {
    if (!result.lint) result.lint = {};
    result.lint.node = 'npx eslint .';
  } else if (
    fileExists('biome.json') ||
    fileExists('biome.jsonc')
  ) {
    if (!result.lint) result.lint = {};
    result.lint.node = 'npx biome check .';
  }

  // Lint fix
  const lintFixScript = getNpmScript('lint:fix', pkg);
  if (lintFixScript) {
    if (!result.lint) result.lint = {};
    result.lint.node_fix = lintFixScript;
  }

  // TypeScript type-check
  if (fileExists('tsconfig.json')) {
    if (!result.lint) result.lint = {};
    result.lint.typecheck = 'npx tsc --noEmit';
  }

  // PHP linter
  if (fileExists('vendor/bin/phpcs')) {
    if (!result.lint) result.lint = {};
    result.lint.php = './vendor/bin/phpcs';
  } else if (composer && composer.scripts) {
    const composerLint = composer.scripts.lint || composer.scripts.phpcs;
    if (composerLint) {
      if (!result.lint) result.lint = {};
      result.lint.php = 'composer lint';
    }
  }

  // PHPStan
  if (
    fileExists('vendor/bin/phpstan') ||
    fileExists('phpstan.neon') ||
    fileExists('phpstan.neon.dist')
  ) {
    if (!result.lint) result.lint = {};
    result.lint.phpstan = './vendor/bin/phpstan analyse';
  }
}

// ── BUILD ─────────────────────────────────────────────────────────────────

if (CATEGORY === 'build' || CATEGORY === 'all') {
  const buildScript = getNpmScript('build', pkg);
  if (buildScript) {
    if (!result.build) result.build = {};
    result.build.command = buildScript;
  }

  const devScript = getNpmScript('dev', pkg);
  if (devScript) {
    if (!result.build) result.build = {};
    result.build.dev = devScript;
  }

  // WordPress build (wp-scripts)
  if (hasDevDependency(pkg, '@wordpress/scripts')) {
    if (!result.build) result.build = {};
    result.build.wp_scripts = `${PKG_RUN} build`;
    result.build.wp_scripts_dev = `${PKG_RUN} start`;
  }
}

// ── DATABASE ──────────────────────────────────────────────────────────────

if (CATEGORY === 'db' || CATEGORY === 'all') {
  // Prisma
  if (fileExists('prisma/schema.prisma')) {
    if (!result.db) result.db = {};
    result.db.migrate = 'npx prisma migrate dev';
    result.db.generate = 'npx prisma generate';
    result.db.studio = 'npx prisma studio';
    result.db.push = 'npx prisma db push';
    result.db.seed = 'npx prisma db seed';
  }

  // Drizzle
  if (
    fileExists('drizzle.config.ts') ||
    fileExists('drizzle.config.js')
  ) {
    if (!result.db) result.db = {};
    result.db.migrate = 'npx drizzle-kit migrate';
    result.db.generate = 'npx drizzle-kit generate';
    result.db.studio = 'npx drizzle-kit studio';
    result.db.push = 'npx drizzle-kit push';
  }

  // Custom npm scripts
  const migrateScript = getNpmScript('db:migrate', pkg);
  if (migrateScript) {
    if (!result.db) result.db = {};
    result.db.migrate = migrateScript;
  }

  const seedScript = getNpmScript('db:seed', pkg);
  if (seedScript) {
    if (!result.db) result.db = {};
    result.db.seed = seedScript;
  }

  const resetScript = getNpmScript('db:reset', pkg);
  if (resetScript) {
    if (!result.db) result.db = {};
    result.db.reset = resetScript;
  }

  // WordPress
  if (fileExists('.wp-env.json')) {
    if (!result.db) result.db = {};
    result.db.wp_cli = 'npx wp-env run cli wp';
    result.db.wp_export = 'npx wp-env run cli wp db export';
    result.db.wp_import = 'npx wp-env run cli wp db import';
  }
}

// ── FORMAT ────────────────────────────────────────────────────────────────

if (CATEGORY === 'format' || CATEGORY === 'all') {
  const formatScript = getNpmScript('format', pkg);
  if (formatScript) {
    if (!result.format) result.format = {};
    result.format.command = formatScript;
  } else if (
    fileExists('.prettierrc') ||
    fileExists('.prettierrc.js') ||
    fileExists('.prettierrc.json') ||
    fileExists('prettier.config.js') ||
    fileExists('prettier.config.mjs')
  ) {
    if (!result.format) result.format = {};
    result.format.command = 'npx prettier --write .';
  } else if (fileExists('biome.json')) {
    if (!result.format) result.format = {};
    result.format.command = 'npx biome format --write .';
  }

  // PHP formatter
  if (fileExists('vendor/bin/phpcbf')) {
    if (!result.format) result.format = {};
    result.format.php = './vendor/bin/phpcbf';
  } else if (fileExists('vendor/bin/php-cs-fixer')) {
    if (!result.format) result.format = {};
    result.format.php = './vendor/bin/php-cs-fixer fix';
  }
}

// ── Output ────────────────────────────────────────────────────────────────

console.log(JSON.stringify(result, null, 2));
