#!/usr/bin/env node
/**
 * Scenario: Detect a WordPress block theme with SCSS
 * Expected: project_type=wordpress, wordpress.type=theme, subtype=block-theme
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const DIR = path.join(TMPDIR, 'block-theme');

// Helper to get nested property from object (supports array indexing like 'foo.bar[0]')
function getPath(obj, pathStr) {
  const parts = pathStr.replace(/\[(\d+)\]/g, '.$1').split('.');
  return parts.reduce((current, part) => {
    if (current === null || current === undefined) return undefined;
    return current[part];
  }, obj);
}

// Helper assertion function
function assert(pathStr, expected) {
  const actual = getPath(output, pathStr);
  if (String(actual) !== String(expected)) {
    console.error(`ASSERTION FAILED: ${pathStr} — expected '${expected}', got '${actual}'`);
    process.exit(1);
  }
}

// Setup
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'templates'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'parts'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'patterns'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'assets', 'scss'), { recursive: true });

fs.writeFileSync(
  path.join(DIR, 'style.css'),
  `/*
Theme Name: Test Block Theme
Version: 1.0.0
*/
`
);

fs.writeFileSync(path.join(DIR, 'theme.json'), '{"version":2}');
fs.writeFileSync(path.join(DIR, 'functions.php'), '');
fs.writeFileSync(path.join(DIR, 'templates', 'index.html'), '<p>Home</p>');
fs.writeFileSync(path.join(DIR, 'assets', 'scss', 'main.scss'), '');

// Run detection
const detectScript = path.join(FORGEBEE_ROOT, 'skills/project-router/scripts/detect_project.js');
let output;
try {
  const result = execSync(`node "${detectScript}" "${DIR}"`, { encoding: 'utf8' });
  output = JSON.parse(result);
} catch (e) {
  console.error('Failed to run detect_project.js');
  console.error(e.message);
  process.exit(1);
}

// Assertions
assert('project_type', 'wordpress');
assert('wordpress.type', 'theme');
assert('wordpress.subtype', 'block-theme');
assert('styling.systems[0]', 'scss');

console.log('All assertions passed.');
