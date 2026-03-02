#!/usr/bin/env node
/**
 * run.js — ForgeBee Eval Harness
 * Runs eval scenarios to validate that skills and detection scripts work correctly.
 *
 * Usage:
 *   node eval/harness/run.js                    # Run all scenarios
 *   node eval/harness/run.js project-router     # Run scenarios for one skill
 *
 * Each scenario creates a temporary project, runs detection, and checks assertions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EVAL_DIR = path.resolve(__dirname, '..');
const SCENARIOS_DIR = path.join(EVAL_DIR, 'scenarios');
const FORGEBEE_ROOT = path.resolve(EVAL_DIR, '..');

const filter = process.argv[2] || '';
let pass = 0;
let fail = 0;
let skip = 0;
const errors = [];

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m'; // No Color

console.log('╔════════════════════════════════════════╗');
console.log('║      ForgeBee Eval Harness v1.0        ║');
console.log('╚════════════════════════════════════════╝');
console.log('');

// Find scenarios
const scenarios = fs.readdirSync(SCENARIOS_DIR)
  .filter(f => f.endsWith('.js'))
  .sort();

if (scenarios.length === 0) {
  console.error(`No scenario files found in ${SCENARIOS_DIR}/`);
  process.exit(1);
}

for (const file of scenarios) {
  const name = file.replace('.js', '');

  // Apply filter
  if (filter && !name.includes(filter)) {
    skip++;
    continue;
  }

  process.stdout.write(`  ▸ ${name} ... `);

  // Create temp dir for this scenario
  const scenarioTmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgebee-eval-'));

  // Run the scenario
  let scenarioExit = 0;
  let scenarioOutput = '';

  try {
    scenarioOutput = execSync(`node "${path.join(SCENARIOS_DIR, file)}"`, {
      encoding: 'utf8',
      env: { ...process.env, FORGEBEE_ROOT, TMPDIR: scenarioTmpdir },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    scenarioExit = e.status || 1;
    scenarioOutput = (e.stdout || '') + (e.stderr || '');
  }

  if (scenarioExit === 0) {
    console.log(`${GREEN}PASS${NC}`);
    pass++;
  } else {
    console.log(`${RED}FAIL${NC}`);
    fail++;
    errors.push({ name, output: scenarioOutput });
  }

  // Cleanup
  try {
    fs.rmSync(scenarioTmpdir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Summary
console.log('');
console.log('────────────────────────────────────────');
console.log(`  ${GREEN}PASS: ${pass}${NC}  ${RED}FAIL: ${fail}${NC}  ${YELLOW}SKIP: ${skip}${NC}`);
console.log('────────────────────────────────────────');

if (errors.length) {
  console.log('\nFailures:');
  for (const e of errors) {
    console.log(`\n--- ${e.name} ---\n${e.output}`);
  }
}

process.exit(fail > 0 ? 1 : 0);
