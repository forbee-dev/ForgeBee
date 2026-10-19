#!/usr/bin/env node
/**
 * learning-cli.test.js — regressions for compress-learnings, instinct-cli import,
 * detect-project registry and sync-local-install --prune.
 * Every case runs in a temp HOME / project dir under os.tmpdir().
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS = path.join(ROOT, 'skills', 'continuous-learning', 'scripts');
const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-learning-cli-')));
let seq = 0;

function fresh() {
  const dir = path.join(SCRATCH, String(seq++));
  const home = path.join(dir, 'home');
  const proj = path.join(dir, 'proj');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(proj, { recursive: true });
  const env = { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: proj };
  delete env.CLAUDE_PLUGIN_ROOT;
  return { dir, home, proj, env };
}

function node(ctx, args, cwd) {
  const r = spawnSync(process.execPath, args, { cwd: cwd || ctx.proj, env: ctx.env, encoding: 'utf8', timeout: 20000 });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('compress-learnings: idempotent, keeps quotes and nested bullets, archives only new', () => {
  const ctx = fresh();
  const dir = path.join(ctx.proj, '.claude', 'learnings');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'learnings.md');
  fs.writeFileSync(file, [
    '# Learnings', '',
    '### Session: 2020-01-01T00:00:00Z', '',
    '- error was "a failure in the x"', '  - nested the item', '',
    '### Session: 2020-02-01T00:00:00Z', '<!-- compressed -->', '- already the done', '',
  ].join('\n'));
  const cli = path.join(SCRIPTS, 'compress-learnings.js');
  assert.strictEqual(node(ctx, [cli]).status, 0);
  const once = fs.readFileSync(file, 'utf8');
  assert.ok(once.includes('"a failure in the x"'), 'quoted text kept');
  assert.ok(once.includes('\n  - nested item'), 'nested bullet indent kept');
  assert.ok(once.includes('- already the done'), 'compressed session untouched');
  const archive = path.join(dir, 'archive');
  const archived = () => fs.readdirSync(archive).map(f => fs.readFileSync(path.join(archive, f), 'utf8')).join('');
  assert.ok(!archived().includes('already the done'), 'only newly compressed session archived');
  const before = archived();
  node(ctx, [cli]);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), once, 'second run is a no-op');
  assert.strictEqual(archived(), before, 'second run appends nothing');
  node(ctx, [cli, '--days']);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), once, '--days without value falls back to 14');
});

test('compress-learnings: placeholder-like user text neither loops nor gets replaced', () => {
  const ctx = fresh();
  const dir = path.join(ctx.proj, '.claude', 'learnings');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'learnings.md');
  fs.writeFileSync(file, [
    '# Learnings', '',
    '### Session: 2020-01-01T00:00:00Z', '',
    '- error was "see __STASH_0__ in `the log`"', '- raw __STASH_1__ token', '',
  ].join('\n'));
  // The old restore loop re-expanded a quote that contained its own placeholder forever.
  assert.strictEqual(node(ctx, [path.join(SCRIPTS, 'compress-learnings.js')]).status, 0, 'finishes');
  const out = fs.readFileSync(file, 'utf8');
  assert.ok(out.includes('"see __STASH_0__ in `the log`"'), 'quote with code kept verbatim');
  assert.ok(out.includes('__STASH_1__ token'), 'literal placeholder text kept');
});

test('instinct-cli import: skips invalid ids and bodies containing ---', () => {
  const ctx = fresh();
  const src = path.join(ctx.dir, 'in.yaml');
  fs.writeFileSync(src, [
    '---', 'id: good-one', 'trigger: "t"', 'confidence: 0.7', 'domain: x', '---', '', 'ok body', '',
    '---', 'id: ../evil', 'trigger: "t"', 'confidence: 0.7', '---', '', 'bad id', '',
    '---', 'id: split-body', 'trigger: "t"', 'confidence: 0.7', '---', '', 'part one', '---', 'note', '---', 'tail', '',
  ].join('\n'));
  const r = node(ctx, [path.join(SCRIPTS, 'instinct-cli.js'), 'import', src, '--dry-run']);
  assert.ok(/\+ good-one/.test(r.out), r.out);
  assert.ok(/invalid id/.test(r.out), r.out);
  assert.ok(/Skipping split-body/.test(r.out), r.out);
  assert.ok(!/\+ split-body|\+ \.\.\/evil/.test(r.out), r.out);
});

test('detect-project: corrupt projects.json is kept aside', () => {
  const ctx = fresh();
  const learn = path.join(ctx.home, '.claude', 'forgebee-learning');
  fs.mkdirSync(learn, { recursive: true });
  fs.writeFileSync(path.join(learn, 'projects.json'), '{corrupt');
  node(ctx, [path.join(SCRIPTS, 'detect-project.js')]);
  const names = fs.readdirSync(learn);
  assert.ok(names.some(n => n.startsWith('projects.json.corrupt-')), names.join(','));
});

test('sync-local-install: stale files kept unless --prune', () => {
  const ctx = fresh();
  const root = path.join(ctx.dir, 'repo');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, '..', 'scripts', 'sync-local-install.js'), path.join(root, 'scripts', 'sync-local-install.js'));
  for (const d of ['agents', 'commands']) {
    fs.mkdirSync(path.join(root, 'forgebee', d), { recursive: true });
    fs.mkdirSync(path.join(root, '.claude', d), { recursive: true });
  }
  const custom = path.join(root, '.claude', 'agents', 'mine.md');
  fs.writeFileSync(custom, 'custom');
  const script = path.join(root, 'scripts', 'sync-local-install.js');
  node(ctx, [script], root);
  assert.ok(fs.existsSync(custom), 'custom agent survives default run');
  node(ctx, [script, '--prune'], root);
  assert.ok(!fs.existsSync(custom), '--prune deletes it');
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log(`  ok - ${name}`); } catch (e) { failed++; console.log(`  not ok - ${name}\n${e.message}`); }
}
fs.rmSync(SCRATCH, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
