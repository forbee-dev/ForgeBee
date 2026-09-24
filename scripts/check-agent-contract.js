#!/usr/bin/env node
/**
 * check-agent-contract.js — Enforce the LOAD-BEARING agent contract.
 *
 * Orchestrators (/workflow, /team) parse the Status protocol; every agent treats
 * untrusted input via the Adversarial Input Hardening preamble. Those two are the
 * machine-depended-upon contract and must be present on every agent. A regression
 * that drops either (e.g. a new agent authored without the Status block, or a bad
 * bulk edit) would silently break orchestration or remove the injection defense —
 * build-index only validates frontmatter, so nothing catches this today.
 *
 * Cosmetic sections (When Invoked / Use When / Process / Escalation / Failure
 * Modes) legitimately vary by agent type and are intentionally NOT required here.
 *
 * Exit 0 = all agents compliant; exit 1 = at least one violation.
 *
 * Run: node scripts/check-agent-contract.js   (wired into `npm run check`)
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'forgebee', 'agents');
const REQUIRED_STATUSES = ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'];

const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
const problems = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const missing = [];

  const hasHardening =
    /<!--\s*prompt-defense-baseline\s*-->/.test(content) ||
    /^##\s*Adversarial Input Hardening\s*$/m.test(content);
  if (!hasHardening) missing.push('Adversarial Input Hardening preamble');

  if (!/^##\s*Status Reporting\s*$/m.test(content)) missing.push('## Status Reporting section');

  const missingStatuses = REQUIRED_STATUSES.filter((s) => !content.includes(s));
  if (missingStatuses.length) missing.push(`status value(s): ${missingStatuses.join(', ')}`);

  // Code-writing agents carry the karpathy block; P7 inside it keeps comments and reports lean.
  if (/<!--\s*karpathy-principles\s*-->/.test(content) && !content.includes('**P7 — Lean Output:**')) {
    missing.push('P7 — Lean Output in the karpathy-principles block');
  }

  if (missing.length) problems.push({ file, missing });
}

console.log(`Agent contract check: ${files.length} agents`);

if (problems.length === 0) {
  console.log('✓ All agents carry the load-bearing contract (Adversarial Input Hardening + Status protocol + P7).');
  process.exit(0);
}

console.error(`\n✗ ${problems.length} agent(s) violate the contract:`);
for (const p of problems) {
  console.error(`  ${p.file}: missing ${p.missing.join('; ')}`);
}
console.error('\nEvery agent must carry the Adversarial Input Hardening preamble and a ## Status Reporting');
console.error('section listing DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.');
process.exit(1);
