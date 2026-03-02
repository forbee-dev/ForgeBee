#!/usr/bin/env node

/**
 * detect_project.js — Deterministic project type detection (Node.js port)
 * Inspects the repo root to classify project type, stack, tooling, and conventions.
 * Outputs a JSON triage report that the router skill and agents can consume.
 *
 * Usage: node detect_project.js [project_dir]
 * Output: JSON to stdout
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Config ──────────────────────────────────────────────────────────
const PROJECT_DIR = process.argv[2] || '.';

let triage = {};

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Set a nested path in an object
 * e.g., setPath(obj, 'a.b.c', value)
 */
function setPath(obj, pathStr, value) {
  const keys = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Get a nested path from an object
 */
function getPath(obj, pathStr) {
  const keys = pathStr.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Safe file existence check
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Safe directory existence check
 */
function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Safe JSON file read
 */
function readJsonFile(filePath) {
  try {
    if (!fileExists(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Safe file read (returns string)
 */
function readFile(filePath) {
  try {
    if (!fileExists(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Recursively search for files matching a pattern
 * Returns array of file paths
 */
function findFiles(dir, pattern, maxDepth = 4, currentDepth = 0, skipDirs = ['node_modules', 'vendor', '.git']) {
  const results = [];
  if (currentDepth >= maxDepth) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skipDirs.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath, pattern, maxDepth, currentDepth + 1, skipDirs));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Silently fail on permission errors
  }

  return results;
}

/**
 * Recursively search for files containing a regex pattern
 * Returns true if found, false otherwise
 */
function grepFiles(dir, pattern, extensions = null, maxDepth = 4, currentDepth = 0, skipDirs = ['node_modules', 'vendor', '.git']) {
  if (currentDepth >= maxDepth) return false;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skipDirs.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (grepFiles(fullPath, pattern, extensions, maxDepth, currentDepth + 1, skipDirs)) {
          return true;
        }
      } else if (entry.isFile()) {
        if (extensions && !extensions.some(ext => entry.name.endsWith(ext))) {
          continue;
        }
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (pattern.test(content)) {
            return true;
          }
        } catch {
          // Silently fail on read errors (binary files, permissions, etc)
        }
      }
    }
  } catch {
    // Silently fail on permission errors
  }

  return false;
}

/**
 * Recursively search files and return count of matches
 */
function countGrepMatches(dir, pattern, extensions = null, maxDepth = 4, currentDepth = 0, skipDirs = ['node_modules', 'vendor', '.git']) {
  if (currentDepth >= maxDepth) return 0;

  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skipDirs.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countGrepMatches(fullPath, pattern, extensions, maxDepth, currentDepth + 1, skipDirs);
      } else if (entry.isFile()) {
        if (extensions && !extensions.some(ext => entry.name.endsWith(ext))) {
          continue;
        }
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (pattern.test(content)) {
            count++;
          }
        } catch {
          // Silently fail
        }
      }
    }
  } catch {
    // Silently fail
  }

  return count;
}

/**
 * Extract PHP version from composer.json
 */
function extractComposerPhpVersion(filePath) {
  const composer = readJsonFile(filePath);
  if (!composer || !composer.require) return null;
  return composer.require.php || null;
}

/**
 * Extract all dependencies from package.json
 */
function getAllDependencies(packageJsonPath) {
  const pkg = readJsonFile(packageJsonPath);
  if (!pkg) return [];

  const deps = new Set();
  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach(d => deps.add(d));
  }
  if (pkg.devDependencies) {
    Object.keys(pkg.devDependencies).forEach(d => deps.add(d));
  }
  return Array.from(deps);
}

/**
 * Check if an array of package names includes a specific package
 */
function hasDependency(packages, name) {
  return packages.some(p => p === name);
}

/**
 * Extract Node version constraint from package.json
 */
function extractNodeVersion(packageJsonPath) {
  const pkg = readJsonFile(packageJsonPath);
  if (!pkg || !pkg.engines || !pkg.engines.node) return null;
  return pkg.engines.node;
}

/**
 * Extract specific dependency version from package.json
 */
function getDependencyVersion(packageJsonPath, depName) {
  const pkg = readJsonFile(packageJsonPath);
  if (!pkg) return null;
  return pkg.dependencies?.[depName] || pkg.devDependencies?.[depName] || null;
}

/**
 * Get all keys from composer.json require and require-dev
 */
function getComposerPackages(composerJsonPath) {
  const composer = readJsonFile(composerJsonPath);
  if (!composer) return [];

  const packages = new Set();
  if (composer.require) {
    Object.keys(composer.require).forEach(p => packages.add(p));
  }
  if (composer['require-dev']) {
    Object.keys(composer['require-dev']).forEach(p => packages.add(p));
  }
  return Array.from(packages);
}

/**
 * Check if composer has a certain package
 */
function hasComposerPackage(packages, name) {
  return packages.some(p => p.includes(name));
}

// ── 1. WordPress Detection ──────────────────────────────────────────

let wpType = 'none';
let wpSubtype = '';

const wpConfigPath = path.join(PROJECT_DIR, 'wp-config.php');
const wpConfigSamplePath = path.join(PROJECT_DIR, 'wp-config-sample.php');
const wpContentDir = path.join(PROJECT_DIR, 'wp-content');

if (fileExists(wpConfigPath) || fileExists(wpConfigSamplePath)) {
  wpType = 'full-install';
}

if (dirExists(wpContentDir)) {
  wpType = 'full-install';
}

// Check for theme via style.css
const styleCssPath = path.join(PROJECT_DIR, 'style.css');
if (fileExists(styleCssPath)) {
  const styleContent = readFile(styleCssPath);
  if (styleContent && /Theme Name:/i.test(styleContent)) {
    wpType = 'theme';
    const templatesDir = path.join(PROJECT_DIR, 'templates');
    const themeJsonPath = path.join(PROJECT_DIR, 'theme.json');
    if (dirExists(templatesDir) && fileExists(themeJsonPath)) {
      wpSubtype = 'block-theme';
    } else if (dirExists(path.join(PROJECT_DIR, 'template-parts'))) {
      wpSubtype = 'classic-theme';
    }
  }
}

// Plugin detection
if (wpType === 'none') {
  const phpFiles = findFiles(PROJECT_DIR, /\.php$/, 1);
  for (const phpFile of phpFiles) {
    const content = readFile(phpFile);
    if (content && /Plugin Name:/i.test(content.split('\n').slice(0, 30).join('\n'))) {
      wpType = 'plugin';
      break;
    }
  }
}

// Check for functions.php (classic theme)
if (wpType === 'none') {
  const functionPhpPath = path.join(PROJECT_DIR, 'functions.php');
  if (fileExists(functionPhpPath)) {
    wpType = 'theme';
    if (fileExists(path.join(PROJECT_DIR, 'theme.json'))) {
      wpSubtype = 'block-theme';
    } else {
      wpSubtype = 'classic-theme';
    }
  }
}

// MU-plugin detection
if (wpType === 'none' && dirExists(path.join(PROJECT_DIR, 'mu-plugins'))) {
  wpType = 'mu-plugins';
}

setPath(triage, 'wordpress.type', wpType);
if (wpSubtype) {
  setPath(triage, 'wordpress.subtype', wpSubtype);
}

// WordPress version detection
const wpVersionPath = path.join(PROJECT_DIR, 'wp-includes', 'version.php');
if (fileExists(wpVersionPath)) {
  const versionContent = readFile(wpVersionPath);
  if (versionContent) {
    const match = versionContent.match(/\$wp_version\s*=\s*'([^']+)'/);
    if (match && match[1]) {
      setPath(triage, 'wordpress.version', match[1]);
    }
  }
}

// WordPress ecosystem detection
let wpEcosystem = [];

// ACF detection
let acfDetected = false;

// 1. acf-json directory
if (dirExists(path.join(PROJECT_DIR, 'acf-json'))) {
  acfDetected = true;
}

// 2. ACF functions in PHP files
if (!acfDetected) {
  const acfPattern = /acf_add_local_field_group|acf_register_block_type|acf_register_block|get_field|the_field|have_rows|get_sub_field/;
  const searchDirs = [
    path.join(PROJECT_DIR, '*.php'),
    path.join(PROJECT_DIR, 'includes/*.php'),
    path.join(PROJECT_DIR, 'inc/*.php'),
    path.join(PROJECT_DIR, 'template-parts/*.php'),
  ];
  for (const searchDir of searchDirs) {
    if (grepFiles(path.dirname(searchDir), acfPattern, ['.php'], 1)) {
      acfDetected = true;
      break;
    }
  }
}

// 3. ACF in composer.json
if (!acfDetected && fileExists(path.join(PROJECT_DIR, 'composer.json'))) {
  const composerPackages = getComposerPackages(path.join(PROJECT_DIR, 'composer.json'));
  if (composerPackages.some(p => p.toLowerCase().includes('acf') || p.toLowerCase().includes('advanced-custom-fields'))) {
    acfDetected = true;
  }
}

// 4. ACF plugin directory
if (!acfDetected) {
  if (dirExists(path.join(PROJECT_DIR, 'wp-content', 'plugins', 'advanced-custom-fields')) ||
      dirExists(path.join(PROJECT_DIR, 'wp-content', 'plugins', 'advanced-custom-fields-pro'))) {
    acfDetected = true;
  }
}

if (acfDetected) {
  wpEcosystem.push('acf');

  // Check for ACF PRO
  const acfProPattern = /acf_register_block_type|acf_register_block|acf\/blocks/;
  if (grepFiles(PROJECT_DIR, acfProPattern, ['.php'], 4)) {
    wpEcosystem.push('acf-pro');
  }
  if (dirExists(path.join(PROJECT_DIR, 'wp-content', 'plugins', 'advanced-custom-fields-pro'))) {
    if (!wpEcosystem.includes('acf-pro')) {
      wpEcosystem.push('acf-pro');
    }
  }
}

// WooCommerce detection
if (dirExists(path.join(PROJECT_DIR, 'wp-content', 'plugins', 'woocommerce')) ||
    grepFiles(PROJECT_DIR, /woocommerce|WC\(\)/, ['.php'], 1)) {
  wpEcosystem.push('woocommerce');
}

// Deduplicate
wpEcosystem = [...new Set(wpEcosystem)];
setPath(triage, 'wordpress.ecosystem', wpEcosystem);

// ── 2. PHP Detection ────────────────────────────────────────────────

let phpDetected = false;
let phpTools = [];

const composerJsonPath = path.join(PROJECT_DIR, 'composer.json');
if (fileExists(composerJsonPath)) {
  phpDetected = true;
  phpTools.push('composer');

  // Extract PHP version constraint
  const phpVersionConstraint = extractComposerPhpVersion(composerJsonPath);
  if (phpVersionConstraint) {
    setPath(triage, 'php.version_constraint', phpVersionConstraint);
  }

  // Detect PHP frameworks
  const composerPackages = getComposerPackages(composerJsonPath);

  if (hasComposerPackage(composerPackages, 'laravel/framework')) {
    setPath(triage, 'php.framework', 'laravel');
  } else if (hasComposerPackage(composerPackages, 'symfony/')) {
    setPath(triage, 'php.framework', 'symfony');
  }

  // PHP tools detection
  if (hasComposerPackage(composerPackages, 'phpstan')) {
    phpTools.push('phpstan');
  }
  if (hasComposerPackage(composerPackages, 'php-cs-fixer') ||
      hasComposerPackage(composerPackages, 'squizlabs/php_codesniffer') ||
      hasComposerPackage(composerPackages, 'phpcs')) {
    phpTools.push('phpcs');
  }
  if (hasComposerPackage(composerPackages, 'phpunit')) {
    phpTools.push('phpunit');
  }
  if (hasComposerPackage(composerPackages, 'wp-coding-standards') ||
      hasComposerPackage(composerPackages, 'wordpress/coding-standards') ||
      hasComposerPackage(composerPackages, 'dealerdirect/phpcodesniffer-composer-installer')) {
    phpTools.push('wpcs');
  }
}

// Check for phpunit.xml
if (fileExists(path.join(PROJECT_DIR, 'phpunit.xml')) ||
    fileExists(path.join(PROJECT_DIR, 'phpunit.xml.dist'))) {
  phpDetected = true;
  if (!phpTools.includes('phpunit')) {
    phpTools.push('phpunit');
  }
}

// Check for phpstan.neon
if (fileExists(path.join(PROJECT_DIR, 'phpstan.neon')) ||
    fileExists(path.join(PROJECT_DIR, 'phpstan.neon.dist'))) {
  phpDetected = true;
  if (!phpTools.includes('phpstan')) {
    phpTools.push('phpstan');
  }
}

setPath(triage, 'php.detected', phpDetected);
setPath(triage, 'php.tools', phpTools);

// ── 3. Node.js / JavaScript / TypeScript Detection ─────────────────

let nodeDetected = false;
let nodeTools = [];
let jsFramework = 'none';

const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
if (fileExists(packageJsonPath)) {
  nodeDetected = true;

  // Package manager detection
  if (fileExists(path.join(PROJECT_DIR, 'pnpm-lock.yaml'))) {
    setPath(triage, 'node.package_manager', 'pnpm');
  } else if (fileExists(path.join(PROJECT_DIR, 'yarn.lock'))) {
    setPath(triage, 'node.package_manager', 'yarn');
  } else if (fileExists(path.join(PROJECT_DIR, 'bun.lockb')) ||
             fileExists(path.join(PROJECT_DIR, 'bun.lock'))) {
    setPath(triage, 'node.package_manager', 'bun');
  } else if (fileExists(path.join(PROJECT_DIR, 'package-lock.json'))) {
    setPath(triage, 'node.package_manager', 'npm');
  }

  // Node version
  const nodeVersion = extractNodeVersion(packageJsonPath);
  if (nodeVersion) {
    setPath(triage, 'node.version_constraint', nodeVersion);
  }

  // Get all dependencies
  const allDeps = getAllDependencies(packageJsonPath);

  // Framework detection
  if (hasDependency(allDeps, 'next')) {
    jsFramework = 'nextjs';
    const nextVersion = getDependencyVersion(packageJsonPath, 'next');
    if (nextVersion) {
      setPath(triage, 'node.framework_version', nextVersion);
    }
    // App router vs pages router
    if (dirExists(path.join(PROJECT_DIR, 'app')) ||
        dirExists(path.join(PROJECT_DIR, 'src', 'app'))) {
      setPath(triage, 'node.nextjs_router', 'app');
    } else if (dirExists(path.join(PROJECT_DIR, 'pages')) ||
               dirExists(path.join(PROJECT_DIR, 'src', 'pages'))) {
      setPath(triage, 'node.nextjs_router', 'pages');
    }
  } else if (hasDependency(allDeps, 'nuxt') || hasDependency(allDeps, 'nuxt3')) {
    jsFramework = 'nuxt';
  } else if (hasDependency(allDeps, 'react')) {
    if (hasDependency(allDeps, 'gatsby')) {
      jsFramework = 'gatsby';
    } else if (hasDependency(allDeps, 'react-scripts')) {
      jsFramework = 'create-react-app';
    } else if (hasDependency(allDeps, 'vite')) {
      jsFramework = 'vite-react';
    } else {
      jsFramework = 'react';
    }
  } else if (hasDependency(allDeps, 'vue')) {
    jsFramework = 'vue';
  } else if (hasDependency(allDeps, 'svelte') || hasDependency(allDeps, '@sveltejs/kit')) {
    jsFramework = 'svelte';
  } else if (hasDependency(allDeps, 'astro')) {
    jsFramework = 'astro';
  } else if (hasDependency(allDeps, 'express')) {
    jsFramework = 'express';
  } else if (hasDependency(allDeps, 'hono')) {
    jsFramework = 'hono';
  }

  setPath(triage, 'node.framework', jsFramework);

  // TypeScript detection
  if (hasDependency(allDeps, 'typescript') || fileExists(path.join(PROJECT_DIR, 'tsconfig.json'))) {
    setPath(triage, 'node.typescript', true);
    nodeTools.push('typescript');
  } else {
    setPath(triage, 'node.typescript', false);
  }

  // Testing frameworks
  if (hasDependency(allDeps, 'jest') || allDeps.some(d => d.startsWith('@jest/'))) {
    nodeTools.push('jest');
  }
  if (hasDependency(allDeps, 'vitest')) {
    nodeTools.push('vitest');
  }
  if (hasDependency(allDeps, 'playwright') || hasDependency(allDeps, '@playwright/test')) {
    nodeTools.push('playwright');
  }
  if (hasDependency(allDeps, 'cypress')) {
    nodeTools.push('cypress');
  }

  // Linting
  if (hasDependency(allDeps, 'eslint')) {
    nodeTools.push('eslint');
  }
  if (hasDependency(allDeps, 'prettier')) {
    nodeTools.push('prettier');
  }
  if (hasDependency(allDeps, 'biome') || hasDependency(allDeps, '@biomejs/biome')) {
    nodeTools.push('biome');
  }

  // WordPress JS tooling
  if (hasDependency(allDeps, '@wordpress/scripts')) {
    nodeTools.push('wp-scripts');
  }
  if (allDeps.some(d => d.startsWith('@wordpress/block'))) {
    nodeTools.push('wp-blocks');
  }
}

setPath(triage, 'node.detected', nodeDetected);
setPath(triage, 'node.tools', nodeTools);

// ── 4. CSS / Styling Detection ──────────────────────────────────────

let styling = [];

// Tailwind CSS
if (fileExists(path.join(PROJECT_DIR, 'tailwind.config.js')) ||
    fileExists(path.join(PROJECT_DIR, 'tailwind.config.ts')) ||
    fileExists(path.join(PROJECT_DIR, 'tailwind.config.mjs')) ||
    fileExists(path.join(PROJECT_DIR, 'tailwind.config.cjs'))) {
  styling.push('tailwindcss');
  if (fileExists(packageJsonPath)) {
    const twVersion = getDependencyVersion(packageJsonPath, 'tailwindcss');
    if (twVersion) {
      setPath(triage, 'styling.tailwind_version', twVersion);
    }
  }
} else if (fileExists(packageJsonPath)) {
  const allDeps = getAllDependencies(packageJsonPath);
  if (hasDependency(allDeps, 'tailwindcss')) {
    styling.push('tailwindcss');
  }
}

// SCSS/SASS
const scssFiles = findFiles(PROJECT_DIR, /\.scss$/, 4);
const sassFiles = findFiles(PROJECT_DIR, /\.sass$/, 4);
if (scssFiles.length > 0 || sassFiles.length > 0) {
  styling.push('scss');
}

// CSS Modules
const cssModuleFiles = findFiles(PROJECT_DIR, /\.module\.(css|scss)$/, 4);
if (cssModuleFiles.length > 0) {
  styling.push('css-modules');
}

// Styled Components / Emotion
if (fileExists(packageJsonPath)) {
  const allDeps = getAllDependencies(packageJsonPath);
  if (hasDependency(allDeps, 'styled-components')) {
    styling.push('styled-components');
  }
  if (allDeps.some(d => d.startsWith('@emotion/'))) {
    styling.push('emotion');
  }
}

// PostCSS
if (fileExists(path.join(PROJECT_DIR, 'postcss.config.js')) ||
    fileExists(path.join(PROJECT_DIR, 'postcss.config.mjs')) ||
    fileExists(path.join(PROJECT_DIR, 'postcss.config.cjs'))) {
  styling.push('postcss');
}

// Deduplicate
styling = [...new Set(styling)];
setPath(triage, 'styling.systems', styling);

// ── 5. Database Detection ───────────────────────────────────────────

let dbType = 'none';
let supabaseDetected = false;
let supabaseFeatures = [];

// Supabase detection
// 1. supabase/config.toml
if (fileExists(path.join(PROJECT_DIR, 'supabase', 'config.toml'))) {
  supabaseDetected = true;
}

// 2. @supabase packages
if (!supabaseDetected && fileExists(packageJsonPath)) {
  const allDeps = getAllDependencies(packageJsonPath);
  if (allDeps.some(d => d.startsWith('@supabase/'))) {
    supabaseDetected = true;
  }
}

// 3. SUPABASE_URL in .env files
if (!supabaseDetected) {
  const envFiles = [
    path.join(PROJECT_DIR, '.env'),
    path.join(PROJECT_DIR, '.env.local'),
  ];
  for (const envFile of envFiles) {
    const envContent = readFile(envFile);
    if (envContent && /SUPABASE_URL|SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE/.test(envContent)) {
      supabaseDetected = true;
      break;
    }
  }
}

if (supabaseDetected) {
  setPath(triage, 'supabase.detected', true);

  // Check for migrations
  const migrationsDir = path.join(PROJECT_DIR, 'supabase', 'migrations');
  if (dirExists(migrationsDir)) {
    const sqlFiles = findFiles(migrationsDir, /\.sql$/, 1);
    setPath(triage, 'supabase.migration_count', sqlFiles.length.toString());
    supabaseFeatures.push('migrations');
  }

  // Check for Edge Functions
  const functionsDir = path.join(PROJECT_DIR, 'supabase', 'functions');
  if (dirExists(functionsDir)) {
    try {
      const functions = fs.readdirSync(functionsDir, { withFileTypes: true })
        .filter(f => f.isDirectory())
        .length;
      if (functions > 0) {
        setPath(triage, 'supabase.edge_function_count', functions.toString());
        supabaseFeatures.push('edge-functions');
      }
    } catch {
      // Silently fail
    }
  }

  // Check for seed file
  if (fileExists(path.join(PROJECT_DIR, 'supabase', 'seed.sql'))) {
    supabaseFeatures.push('seed');
  }

  // Check for @supabase/ssr
  if (fileExists(packageJsonPath)) {
    const allDeps = getAllDependencies(packageJsonPath);
    if (hasDependency(allDeps, '@supabase/ssr')) {
      supabaseFeatures.push('ssr');
    }
  }

  // Check for RLS in migrations
  if (dirExists(migrationsDir)) {
    const rlsCount = countGrepMatches(migrationsDir, /ENABLE ROW LEVEL SECURITY|CREATE POLICY/, ['.sql'], 1);
    if (rlsCount > 0) {
      supabaseFeatures.push('rls');
    }
  }

  // Check for Realtime usage
  const realtimePattern = /\.channel\(|postgres_changes|supabase.*realtime/;
  const searchDirs = [
    path.join(PROJECT_DIR, 'src'),
    path.join(PROJECT_DIR, 'app'),
    path.join(PROJECT_DIR, 'lib'),
  ];
  for (const dir of searchDirs) {
    if (dirExists(dir) && grepFiles(dir, realtimePattern, ['.ts', '.tsx', '.js', '.jsx'], 4)) {
      supabaseFeatures.push('realtime');
      break;
    }
  }

  // Check for Storage usage
  const storagePattern = /\.storage\.|storage\.from\(/;
  for (const dir of searchDirs) {
    if (dirExists(dir) && grepFiles(dir, storagePattern, ['.ts', '.tsx', '.js', '.jsx'], 4)) {
      supabaseFeatures.push('storage');
      break;
    }
  }

  supabaseFeatures = [...new Set(supabaseFeatures)];
  setPath(triage, 'supabase.features', supabaseFeatures);
  setPath(triage, 'database.engine', 'postgresql');
} else {
  setPath(triage, 'supabase.detected', false);
}

// Prisma
const prismaSchemaPath = path.join(PROJECT_DIR, 'prisma', 'schema.prisma');
if (fileExists(prismaSchemaPath)) {
  dbType = 'prisma';
  const schemaContent = readFile(prismaSchemaPath);
  if (schemaContent) {
    const providerMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);
    if (providerMatch && providerMatch[1]) {
      setPath(triage, 'database.provider', providerMatch[1]);
    }
  }
}

// Drizzle
if (fileExists(path.join(PROJECT_DIR, 'drizzle.config.ts')) ||
    fileExists(path.join(PROJECT_DIR, 'drizzle.config.js'))) {
  dbType = 'drizzle';
}

// Supabase as DB layer (if no other ORM detected)
if (supabaseDetected && dbType === 'none') {
  dbType = 'supabase';
}

// WordPress DB
if (wpType !== 'none' && dbType === 'none') {
  dbType = 'wordpress-mysql';
}

// Check for .env database URLs
const envPath = path.join(PROJECT_DIR, '.env');
if (fileExists(envPath)) {
  const envContent = readFile(envPath);
  if (envContent && /DATABASE_URL/.test(envContent)) {
    const dbUrlMatch = envContent.match(/DATABASE_URL\s*=\s*(.+)/);
    if (dbUrlMatch && dbUrlMatch[1]) {
      const dbUrl = dbUrlMatch[1].trim();
      if (dbUrl.includes('postgres')) {
        setPath(triage, 'database.engine', 'postgresql');
      } else if (dbUrl.includes('mysql')) {
        setPath(triage, 'database.engine', 'mysql');
      } else if (dbUrl.includes('sqlite')) {
        setPath(triage, 'database.engine', 'sqlite');
      }
    }
  }
}

setPath(triage, 'database.orm', dbType);

// ── 6. DevOps / CI Detection ────────────────────────────────────────

let ciSystems = [];

if (dirExists(path.join(PROJECT_DIR, '.github', 'workflows'))) {
  ciSystems.push('github-actions');
}
if (fileExists(path.join(PROJECT_DIR, '.gitlab-ci.yml'))) {
  ciSystems.push('gitlab-ci');
}
if (fileExists(path.join(PROJECT_DIR, 'Dockerfile')) ||
    fileExists(path.join(PROJECT_DIR, 'docker-compose.yml')) ||
    fileExists(path.join(PROJECT_DIR, 'docker-compose.yaml'))) {
  ciSystems.push('docker');
}
if (fileExists(path.join(PROJECT_DIR, 'vercel.json')) ||
    dirExists(path.join(PROJECT_DIR, '.vercel'))) {
  ciSystems.push('vercel');
}
if (fileExists(path.join(PROJECT_DIR, 'netlify.toml'))) {
  ciSystems.push('netlify');
}

// WordPress-specific
if (fileExists(path.join(PROJECT_DIR, '.wp-env.json'))) {
  ciSystems.push('wp-env');
}
if (fileExists(path.join(PROJECT_DIR, '.lando.yml'))) {
  ciSystems.push('lando');
}

ciSystems = [...new Set(ciSystems)];
setPath(triage, 'devops.ci', ciSystems);

// ── 7. Project Classification ───────────────────────────────────────

let primaryType = 'unknown';

if (wpType !== 'none') {
  primaryType = 'wordpress';
} else if (jsFramework === 'nextjs') {
  primaryType = 'nextjs';
} else if (jsFramework === 'nuxt') {
  primaryType = 'nuxt';
} else if (jsFramework === 'astro') {
  primaryType = 'astro';
} else if (jsFramework === 'svelte') {
  primaryType = 'svelte';
} else if (jsFramework !== 'none') {
  primaryType = 'javascript';
} else if (phpDetected) {
  primaryType = 'php';
} else if (nodeDetected) {
  primaryType = 'node';
}

setPath(triage, 'project_type', primaryType);

// ── 8. CLAUDE.md Detection ─────────────────────────────────────────

const claudeMdPath = path.join(PROJECT_DIR, 'CLAUDE.md');
setPath(triage, 'has_claude_md', fileExists(claudeMdPath));

// ── Output ──────────────────────────────────────────────────────────

console.log(JSON.stringify(triage, null, 2));
