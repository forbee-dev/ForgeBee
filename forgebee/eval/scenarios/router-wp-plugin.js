#!/usr/bin/env node
/**
 * Scenario: Detect a WordPress plugin with ACF and SCSS
 * Expected: project_type=wordpress, wordpress.type=plugin, acf in ecosystem, scss in styling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const DIR = path.join(TMPDIR, 'wp-plugin');

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
    console.error(`ASSERTION FAILED: ${pathStr}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
    process.exit(1);
  }
}

// Helper to check if array contains value
function assertContains(pathStr, value) {
  const arr = getPath(output, pathStr);
  if (!Array.isArray(arr) || !arr.includes(value)) {
    console.error(`ASSERTION FAILED: ${value} not found in ${pathStr}`);
    console.error(`  Array: ${JSON.stringify(arr)}`);
    process.exit(1);
  }
}

// Setup
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'acf-json'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'includes'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'template-parts'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'assets', 'scss'), { recursive: true });

fs.writeFileSync(
  path.join(DIR, 'my-plugin.php'),
  `<?php
/**
 * Plugin Name: Test Plugin
 * Version: 1.0.0
 */
defined( 'ABSPATH' ) || exit;
`
);

fs.writeFileSync(
  path.join(DIR, 'includes', 'fields.php'),
  `<?php
$heading = get_field( 'hero_heading' );
acf_register_block_type( array( 'name' => 'hero' ) );
`
);

fs.writeFileSync(path.join(DIR, 'acf-json', 'group_test.json'), '{"key":"group_test"}');
fs.writeFileSync(path.join(DIR, 'assets', 'scss', 'main.scss'), '');

fs.writeFileSync(
  path.join(DIR, 'composer.json'),
  `{
  "require-dev": {
    "phpunit/phpunit": "^9.0",
    "wp-coding-standards/wpcs": "^3.0"
  }
}
`
);

fs.writeFileSync(path.join(DIR, 'phpunit.xml.dist'), '');

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
assert('wordpress.type', 'plugin');
assert('php.detected', 'true');
assert('styling.systems.length', 1);
assert('styling.systems[0]', 'scss');

assertContains('wordpress.ecosystem', 'acf');
assertContains('wordpress.ecosystem', 'acf-pro');
assertContains('php.tools', 'phpunit');
assertContains('php.tools', 'wpcs');

console.log('All assertions passed.');
