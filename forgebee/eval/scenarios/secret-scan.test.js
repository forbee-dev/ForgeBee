#!/usr/bin/env node
/**
 * secret-scan.test.js — Unit tests for the secret-scan hook's added-line scan
 *
 * Run: node forgebee/eval/scenarios/secret-scan.test.js
 */

const assert = require('assert');
const scan = require('../../hooks/scripts/secret-scan.js');
const common = require('../../hooks/scripts/_common.js');

let failed = 0;
function test(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    console.log(`  FAIL: ${name}\n        ${e.message}`);
  }
}

// Keys are built at runtime: a literal in the diff would trip secret-scan on commit.
const REAL = `AKIA${"IOSFODNN7REALKEY"}`;
const DOC = `AKIA${"IOSFODNN7EXAMPLE"}`; // AWS documentation example key

const blocks = line => scan.scanAddedLines(`+${line}`).length > 0;

const SECRETS = [
  `const k = "${REAL}"; // example`,
  `API_KEY=${'9f8a7b6c5d4e3f2a'}1b0c9d8e7f6a5b4c`,
  `DB=postgres://admin:${'s3cr3tPassw0rd'}@db.internal/app`,
  `jwt = ${'eyJhbGciOiJIUzI1NiJ9'}.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk`,
];
SECRETS.forEach(l => test(`blocks ${l}`, () => assert.ok(blocks(l))));

[
  'DATABASE_URL=postgres://user:password@localhost:5432/app',
  'API_KEY=${API_KEY_FROM_CI}',
  'password = "<your password here>"',
  "'password' => 'Enter your password',",
  'translation_key: checkout_button_label_v2_2026',
  'primary_key = 1234567890123456',
  `const k = "${DOC}";`,
  `if (a <> b) run("${DOC}")`,
].forEach(l => test(`allows ${l}`, () => assert.ok(!blocks(l))));

test('lone <> is not a placeholder', () => assert.ok(blocks(`x = "${REAL}" <>`)));

test('redaction still covers the loose shapes', () => {
  const out = common.redactForPrompt('API_KEY=9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c postgres://u:p@h/db');
  assert.ok(!out.includes('9f8a7b6c') && !out.includes(':p@'));
});

if (failed) { console.log(`${failed} test(s) FAILED.`); process.exit(1); }
console.log('All tests passed.');
