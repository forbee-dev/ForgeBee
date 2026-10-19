#!/usr/bin/env node
/**
 * sync-local-install.js — Mirror the canonical plugin source (forgebee/) into the
 * gitignored local project install (.claude/), so the two can't drift.
 *
 * Background: .claude/{agents,commands} are project-level copies Claude Code
 * auto-loads. They had drifted to a pre-5.x snapshot (e.g. debate/review/strategy
 * skills duplicated as AGENTS), causing duplicate registration + stale behavior.
 * The source of truth is forgebee/. This makes .claude/ exactly mirror it —
 * overwriting changed files. Stale files (not in forgebee/) are only listed;
 * pass --prune to delete them, since .claude/ can hold a user's custom agents.
 *
 * Not wired into CI.
 *
 * Syncs agents + commands only (skills are provided by the installed plugin under
 * the forgebee: namespace; adding them to .claude/skills would add duplication).
 *
 * Usage: node scripts/sync-local-install.js          (apply; lists stale files)
 *        node scripts/sync-local-install.js --prune   (apply and delete stale files)
 *        node scripts/sync-local-install.js --check   (report drift, exit 1 if any)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');
const PRUNE = process.argv.includes('--prune');
const DIRS = ['agents', 'commands'];

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
}

let drift = 0;
const summary = [];

for (const sub of DIRS) {
  const srcDir = path.join(ROOT, 'forgebee', sub);
  const dstDir = path.join(ROOT, '.claude', sub);
  if (!CHECK) fs.mkdirSync(dstDir, { recursive: true });

  const src = listMd(srcDir);
  const dst = listMd(dstDir);

  const stale = dst.filter(f => !src.includes(f));   // in .claude but not in forgebee
  const missing = src.filter(f => !dst.includes(f)); // in forgebee but not in .claude
  let changed = 0;

  for (const f of src) {
    const sp = path.join(srcDir, f);
    const dp = path.join(dstDir, f);
    const same = fs.existsSync(dp) && fs.readFileSync(sp, 'utf8') === fs.readFileSync(dp, 'utf8');
    if (same) continue;
    changed++;
    if (!CHECK) fs.copyFileSync(sp, dp);
  }
  for (const f of stale) {
    if (PRUNE && !CHECK) fs.unlinkSync(path.join(dstDir, f));
    else console.log(`  stale (kept; use --prune to delete): .claude/${sub}/${f}`);
  }

  const subDrift = stale.length + missing.length + changed;
  drift += subDrift;
  summary.push(`  ${sub}: ${src.length} source · ${stale.length} stale ${PRUNE && !CHECK ? 'removed' : 'kept'} · ${missing.length} added · ${changed} updated`);
}

console.log(CHECK ? 'sync-local-install --check' : 'sync-local-install: applied');
summary.forEach(l => console.log(l));

if (CHECK && drift > 0) {
  console.log(`\n.claude/ is OUT OF SYNC with forgebee/ (${drift} differences). Run: node scripts/sync-local-install.js`);
  process.exit(1);
}
console.log(CHECK ? '\n.claude/ is in sync with forgebee/.' : `\nDone (${drift} changes).`);
process.exit(0);
