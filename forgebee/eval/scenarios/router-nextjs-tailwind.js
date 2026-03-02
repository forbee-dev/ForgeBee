#!/usr/bin/env node
/**
 * Scenario: Detect Next.js App Router + TypeScript + Tailwind + SCSS
 * Expected: project_type=nextjs, app router, typescript, tailwind + scss in styling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const DIR = path.join(TMPDIR, 'nextjs-app');

// Helper to get nested property from object
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

// Helper to check if array contains value
function assertContains(pathStr, value) {
  const arr = getPath(output, pathStr);
  if (!Array.isArray(arr) || !arr.includes(value)) {
    console.error(`ASSERTION FAILED: ${value} not in ${pathStr}`);
    console.error(`  Array: ${JSON.stringify(arr)}`);
    process.exit(1);
  }
}

// Setup
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'src', 'app'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'src', 'styles', 'scss'), { recursive: true });
fs.mkdirSync(path.join(DIR, '.github', 'workflows'), { recursive: true });

fs.writeFileSync(
  path.join(DIR, 'package.json'),
  `{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^9.0.0",
    "vitest": "^1.0.0",
    "prettier": "^3.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest",
    "lint": "eslint ."
  }
}
`
);

fs.writeFileSync(path.join(DIR, 'tsconfig.json'), '{}');
fs.writeFileSync(path.join(DIR, 'tailwind.config.js'), 'module.exports = {}');
fs.writeFileSync(path.join(DIR, 'postcss.config.js'), 'module.exports = {}');
fs.writeFileSync(path.join(DIR, 'src', 'styles', 'scss', 'main.scss'), '');
fs.writeFileSync(path.join(DIR, 'pnpm-lock.yaml'), '');

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
assert('project_type', 'nextjs');
assert('node.framework', 'nextjs');
assert('node.nextjs_router', 'app');
assert('node.typescript', 'true');
assert('node.package_manager', 'pnpm');

assertContains('styling.systems', 'tailwindcss');
assertContains('styling.systems', 'scss');
assertContains('styling.systems', 'postcss');

assertContains('node.tools', 'vitest');
assertContains('devops.ci', 'github-actions');

console.log('All assertions passed.');
