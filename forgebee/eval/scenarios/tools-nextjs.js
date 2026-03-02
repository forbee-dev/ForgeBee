#!/usr/bin/env node
/**
 * Scenario: detect_tools.js finds all tools in a Next.js project
 * Expected: correct test, lint, build, db, format commands
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const DIR = path.join(TMPDIR, 'nextjs-tools');

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

// Setup
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'prisma'), { recursive: true });

fs.writeFileSync(
  path.join(DIR, 'package.json'),
  `{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0"
  }
}
`
);

fs.writeFileSync(path.join(DIR, 'tsconfig.json'), '{}');
fs.writeFileSync(path.join(DIR, 'pnpm-lock.yaml'), '');
fs.writeFileSync(
  path.join(DIR, 'prisma', 'schema.prisma'),
  'datasource db { provider = "postgresql" }'
);

// Run detection
const detectScript = path.join(FORGEBEE_ROOT, 'skills/project-router/scripts/detect_tools.js');
let output;
try {
  const result = execSync(`node "${detectScript}" "${DIR}" all`, { encoding: 'utf8' });
  output = JSON.parse(result);
} catch (e) {
  console.error('Failed to run detect_tools.js');
  console.error(e.message);
  process.exit(1);
}

// Assertions
assert('package_manager.node', 'pnpm');
assert('test.node', 'pnpm test');
assert('test.node_coverage', 'pnpm test:coverage');
assert('lint.node', 'pnpm lint');
assert('lint.node_fix', 'pnpm lint:fix');
assert('lint.typecheck', 'npx tsc --noEmit');
assert('build.command', 'pnpm build');
assert('build.dev', 'pnpm dev');
assert('db.generate', 'npx prisma generate');
assert('format.command', 'pnpm format');

console.log('All assertions passed.');
