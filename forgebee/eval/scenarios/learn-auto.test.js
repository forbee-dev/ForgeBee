#!/usr/bin/env node
/**
 * learn-auto.test.js — the automatic learning loop: learn-auto.js (Stop ask),
 * `instinct-cli.js add` / `review --reject`, and learn-digest.js (SessionStart),
 * including its standing code learnings. Recall lives in learn-recall.test.js.
 *
 * Every case gets its own HOME and project dir, so the real
 * ~/.claude/forgebee-learning store is never touched.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LEARN_AUTO = path.join(ROOT, 'hooks', 'scripts', 'learn-auto.js');
const DIGEST = path.join(ROOT, 'hooks', 'scripts', 'learn-digest.js');
const CLI = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'instinct-cli.js');
const OBSERVE = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'observe.js');
const SELF_IMPROVE = path.join(ROOT, 'hooks', 'scripts', 'self-improve.js');

const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-learn-auto-')));
let seq = 0;

function fresh() {
  const dir = path.join(SCRATCH, String(seq++));
  const home = path.join(dir, 'home');
  const proj = path.join(dir, 'proj');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(proj, { recursive: true });
  const env = { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: proj };
  delete env.CLAUDE_PLUGIN_ROOT;
  return { dir, home, proj, env, learning: path.join(home, '.claude', 'forgebee-learning') };
}

function run(ctx, args, stdin) {
  const r = spawnSync(process.execPath, args, {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin || {}),
    cwd: ctx.proj, env: ctx.env, encoding: 'utf8', timeout: 20000,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function add(ctx, args, body = '## Action\nRun the tests first.\n\n## Evidence\n- seen 5 times\n') {
  return run(ctx, [CLI, 'add', ...args], body);
}

const userText = t => ({ type: 'user', message: { role: 'user', content: t } });
const userBlocks = t => ({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: t }] } });
const toolResult = () => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] } });
const toolUses = (n, command = 'ls') => ({
  type: 'assistant',
  message: { content: Array.from({ length: n }, (_, i) => ({ type: 'tool_use', id: `t${i}`, name: 'Bash', input: { command } })) },
});

function transcript(ctx, entries) {
  const file = path.join(ctx.dir, 'transcript.jsonl');
  fs.writeFileSync(file, entries.map(e => JSON.stringify(e)).join('\n') + '\n{not json\n');
  return file;
}

const flagFile = (ctx, sid) => path.join(ctx.proj, '.claude', 'session-cache', 'learn-auto', `${sid}.flag`);
const busyTurn = () => [userText('fix it'), toolUses(2), toolResult(), toolUses(1)];

function digest(ctx) {
  const r = run(ctx, [DIGEST], { cwd: ctx.proj, hook_event_name: 'SessionStart' });
  assert.strictEqual(r.status, 0, r.stderr);
  if (!r.stdout.trim()) return '';
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
}

function yamlFor(ctx, id) {
  const projects = path.join(ctx.learning, 'projects');
  for (const pid of fs.readdirSync(projects)) {
    const file = path.join(projects, pid, 'instincts', 'personal', `${id}.yaml`);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  return null;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

try {
  test('learn-auto: 3 tool calls in the last turn blocks once, writes flag', () => {
    const ctx = fresh();
    const stdin = { session_id: 's1', transcript_path: transcript(ctx, busyTurn()) };
    const r = run(ctx, [LEARN_AUTO], stdin);
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.decision, 'block');
    assert.ok(out.reason.includes('instinct-cli.js" add'), out.reason);
    assert.ok(out.reason.includes('learning-cli.js" add'), out.reason);
    assert.ok(out.reason.length < 1800, `reason is ${out.reason.length} chars`);
    assert.ok(fs.existsSync(flagFile(ctx, 's1')), 'flag not written');

    const again = run(ctx, [LEARN_AUTO], stdin);
    assert.strictEqual(again.status, 0);
    assert.strictEqual(again.stdout, '', 'second Stop in the same session asked again');
  });

  test('learn-auto: stop_hook_active is silent and writes no flag', () => {
    const ctx = fresh();
    const r = run(ctx, [LEARN_AUTO], { session_id: 's2', stop_hook_active: true, transcript_path: transcript(ctx, busyTurn()) });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.ok(!fs.existsSync(flagFile(ctx, 's2')));
  });

  test('learn-auto: a typed message resets the count (2 calls in last turn)', () => {
    const ctx = fresh();
    const file = transcript(ctx, [userText('a'), toolUses(5), userBlocks('b'), toolUses(2)]);
    const r = run(ctx, [LEARN_AUTO], { session_id: 's3', transcript_path: file });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
  });

  test('learn-auto: a saved instinct in the session suppresses the ask and writes flag', () => {
    const ctx = fresh();
    const file = transcript(ctx, [
      userText('a'), toolUses(1, `node "${CLI}" add --id x --trigger "when y" --confidence 0.5 --domain general`),
      userText('b'), toolUses(4),
    ]);
    const r = run(ctx, [LEARN_AUTO], { session_id: 's4', transcript_path: file });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.ok(fs.existsSync(flagFile(ctx, 's4')));
  });

  test('learn-auto: a saved code learning in the session suppresses the ask', () => {
    const ctx = fresh();
    const lcli = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'learning-cli.js');
    const file = transcript(ctx, [userText('a'), toolUses(1, `node "${lcli}" add --title "x"`), userText('b'), toolUses(4)]);
    const r = run(ctx, [LEARN_AUTO], { session_id: 's4b', transcript_path: file });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
    assert.ok(fs.existsSync(flagFile(ctx, 's4b')));
  });

  test('learn-auto: .trail/learnings present is silent', () => {
    const ctx = fresh();
    fs.mkdirSync(path.join(ctx.proj, '.trail', 'learnings'), { recursive: true });
    const r = run(ctx, [LEARN_AUTO], { session_id: 's4c', transcript_path: transcript(ctx, busyTurn()) });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
  });

  test('learn-auto: missing, non-string, or directory transcript_path exits 0 silently', () => {
    const ctx = fresh();
    for (const tp of [undefined, 42, path.join(ctx.dir, 'nope.jsonl'), ctx.dir]) {
      const r = run(ctx, [LEARN_AUTO], { session_id: 's5', transcript_path: tp });
      assert.strictEqual(r.status, 0);
      assert.strictEqual(r.stdout, '', `stdout for ${tp}`);
    }
  });

  test('learn-auto: session_id cannot escape the flag dir', () => {
    const ctx = fresh();
    const r = run(ctx, [LEARN_AUTO], { session_id: '../../evil', transcript_path: transcript(ctx, busyTurn()) });
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.includes('"block"'));
    assert.ok(fs.existsSync(flagFile(ctx, '.._.._evil')), 'sanitized flag missing');
    assert.ok(!fs.existsSync(path.join(ctx.proj, '.claude', 'evil.flag')));
  });

  test('learn-auto: disabled file silences the ask', () => {
    const ctx = fresh();
    fs.mkdirSync(ctx.learning, { recursive: true });
    fs.writeFileSync(path.join(ctx.learning, 'disabled'), '');
    const r = run(ctx, [LEARN_AUTO], { session_id: 's6', transcript_path: transcript(ctx, busyTurn()) });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout, '');
  });

  test('add: 0.7 saves active, 0.5 saves pending', () => {
    const ctx = fresh();
    let r = add(ctx, ['--id', 'tests-first', '--trigger', 'when editing src', '--confidence', '0.7', '--domain', 'testing']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('saved project instinct tests-first (confidence 0.7, active)'), r.stdout);
    assert.ok(/^status: active$/m.test(yamlFor(ctx, 'tests-first')));
    r = add(ctx, ['--id', 'maybe', '--trigger', 'when x', '--confidence', '0.5', '--domain', 'general']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(/^status: pending$/m.test(yamlFor(ctx, 'maybe')));
  });

  test('add: rejects a path id, empty stdin, and a bad domain', () => {
    const ctx = fresh();
    assert.strictEqual(add(ctx, ['--id', '../x', '--trigger', 'when y', '--confidence', '0.5', '--domain', 'general']).status, 1);
    assert.ok(!fs.existsSync(path.join(ctx.learning, 'projects', 'x.yaml')));
    assert.strictEqual(add(ctx, ['--id', 'y', '--trigger', 'when y', '--confidence', '0.5', '--domain', 'general'], '').status, 1);
    assert.strictEqual(add(ctx, ['--id', 'y', '--trigger', 'when y', '--confidence', '0.5', '--domain', 'nope']).status, 1);
  });

  test('add: re-add keeps the higher-confidence file, appends evidence on equal or higher', () => {
    const ctx = fresh();
    const args = c => ['--id', 'k', '--trigger', 'when k', '--confidence', c, '--domain', 'general'];
    add(ctx, args('0.7'));
    const low = add(ctx, args('0.5'), '## Action\nOther.\n\n## Evidence\n- weak\n');
    assert.strictEqual(low.status, 0);
    assert.ok(low.stdout.includes('kept existing k (higher confidence)'));
    assert.ok(/^confidence: 0\.7$/m.test(yamlFor(ctx, 'k')));
    add(ctx, args('0.9'), '## Action\nRun the tests first.\n\n## Evidence\n- seen again\n');
    const y = yamlFor(ctx, 'k');
    assert.ok(/^confidence: 0\.9$/m.test(y));
    assert.ok(y.includes('- seen 5 times') && y.includes('- seen again'), y);
  });

  test('digest: silent with no instincts', () => {
    assert.strictEqual(digest(fresh()), '');
  });

  test('digest: lists an active instinct, not a pending one', () => {
    const ctx = fresh();
    add(ctx, ['--id', 'tests-first', '--trigger', 'when editing src', '--confidence', '0.8', '--domain', 'testing']);
    add(ctx, ['--id', 'maybe', '--trigger', 'when maybe', '--confidence', '0.5', '--domain', 'general']);
    const c = digest(ctx);
    assert.ok(c.includes('## Learned instincts (apply)'), c);
    assert.ok(c.includes('- [0.8] when editing src → Run the tests first.'), c);
    assert.ok(!c.includes('when maybe'), c);
    assert.ok(/1 pending \(1 ≥0\.5\)/.test(c), c);
  });

  test('digest: 50 long instincts stay at or under 2000 chars', () => {
    const ctx = fresh();
    const dir = path.join(ctx.learning, 'instincts', 'personal');
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 50; i++) {
      fs.writeFileSync(path.join(dir, `long-${i}.yaml`),
        `---\nid: long-${i}\ntrigger: "when ${'t'.repeat(180)}"\nconfidence: 0.8\ndomain: general\nscope: global\nstatus: active\n---\n\n## Action\n${'a'.repeat(400)}\n`);
    }
    const c = digest(ctx);
    assert.ok(c.length > 0 && c.length <= 2000, `length ${c.length}`);
    assert.ok(/more: node ".*instinct-cli\.js" status/.test(c), 'no truncation marker');
  });

  test('digest: evolve candidates appear once per 24 h with >=3 active instincts', () => {
    const ctx = fresh();
    for (const id of ['m1', 'm2', 'm3']) {
      add(ctx, ['--id', id, '--trigger', 'when writing migrations', '--confidence', '0.8', '--domain', 'general']);
    }
    const first = digest(ctx);
    assert.ok(first.includes('Evolve candidates:\n- skill: "migrations" (3 instincts)'), first);
    assert.ok(/evolve --generate/.test(first), first);
    assert.ok(!digest(ctx).includes('Evolve candidates:'), 'throttle did not hold');
  });

  test('digest: lists standing code learnings and the count line', () => {
    const ctx = fresh();
    const dir = path.join(ctx.proj, 'docs', 'learnings');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '2026-10-01-tabs.md'),
      '---\ntitle: Use tabs in PHP\nauthor: t\ndate: 2026-10-01\nstanding: true\n---\n\n## Decided\n- Tabs, per WPCS.\n');
    fs.writeFileSync(path.join(dir, '2026-10-02-cache.md'),
      '---\ntitle: Cache key shape\nauthor: t\ndate: 2026-10-02\n---\n\n## Decided\nKey by locale.\n');
    const c = digest(ctx);
    assert.ok(c.includes('- Standing: Use tabs in PHP — Tabs, per WPCS.'), c);
    assert.ok(!c.includes('Cache key shape'), c);
    assert.ok(c.includes('2 code learnings in docs/learnings/ — recalled per prompt'), c);

    fs.mkdirSync(path.join(ctx.proj, '.trail', 'learnings'), { recursive: true });
    assert.strictEqual(digest(ctx), '', 'Trail guard did not hide code learnings');
  });

  test('digest: auto-activates a >=0.7 jsonl candidate and prints the veto', () => {
    const ctx = fresh();
    const pendingFile = path.join(ctx.proj, '.claude', 'learnings', 'pending-instincts.jsonl');
    fs.mkdirSync(path.dirname(pendingFile), { recursive: true });
    fs.writeFileSync(pendingFile, [
      { id: 'cmd-npm-test', type: 'command-repeat', signal: 'bash-repeat:npm test', confidence: 0.7, sessions_seen: 4, status: 'pending' },
      { id: 'cmd-ls', type: 'command-repeat', signal: 'bash-repeat:ls', confidence: 0.4, sessions_seen: 2, status: 'pending' },
    ].map(e => JSON.stringify(e)).join('\n') + '\n');
    const c = digest(ctx);
    assert.ok(/^Activated: cmd-npm-test — veto: node ".*instinct-cli\.js" review --reject <id>/.test(c), c);
    assert.ok(c.includes('Prefer `npm test`'), c);
    assert.ok(/1 pending \(0 ≥0\.5\)/.test(c), c);
    assert.ok(/^status: active$/m.test(yamlFor(ctx, 'cmd-npm-test')));
    assert.ok(!digest(ctx).includes('Activated:'), 'activated twice');

    const veto = run(ctx, [CLI, 'review', '--reject', 'cmd-npm-test'], '');
    assert.strictEqual(veto.status, 0, veto.stderr);
    assert.strictEqual(yamlFor(ctx, 'cmd-npm-test'), null, 'veto left the YAML');
    assert.ok(fs.readFileSync(pendingFile, 'utf8').includes('"status":"rejected"'));
  });

  test('veto: a rejected jsonl signal survives self-improve and never auto-activates', () => {
    const ctx = fresh();
    const pendingFile = path.join(ctx.proj, '.claude', 'learnings', 'pending-instincts.jsonl');
    fs.mkdirSync(path.dirname(pendingFile), { recursive: true });
    const vetoed = { id: 'cmd-npm-test', type: 'command-repeat', signal: 'bash-repeat:npm test', confidence: 0.7, sessions_seen: 4, sessions: [], status: 'rejected' };
    fs.writeFileSync(pendingFile, JSON.stringify(vetoed) + '\n');
    for (const command of ['npm test', 'npm test', 'npm test', 'ls -la', 'ls -la', 'ls -la']) {
      run(ctx, [OBSERVE], { hook_event_name: 'PostToolUse', tool_name: 'Bash', session_id: 'sv', cwd: ctx.proj, tool_input: { command }, tool_response: 'ok' });
    }
    const r = run(ctx, [SELF_IMPROVE], { session_id: 'sv', cwd: ctx.proj });
    assert.strictEqual(r.status, 0, r.stderr);
    const entries = fs.readFileSync(pendingFile, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.ok(entries.some(e => e.signal === 'bash-repeat:ls -la'), 'self-improve did not run');
    const kept = entries.filter(e => e.signal === 'bash-repeat:npm test');
    assert.strictEqual(kept.length, 1, JSON.stringify(entries));
    assert.strictEqual(kept[0].status, 'rejected');
    assert.strictEqual(kept[0].confidence, 0.7, 'vetoed signal was re-counted');
    assert.ok(!digest(ctx).includes('Activated:'));
    assert.strictEqual(yamlFor(ctx, 'cmd-npm-test'), null);
  });

  test('veto: add and review --auto refuse an id rejected earlier', () => {
    const ctx = fresh();
    const args = ['--id', 'tabs', '--trigger', 'when editing php', '--confidence', '0.9', '--domain', 'code-style'];
    assert.strictEqual(add(ctx, args).status, 0);
    assert.strictEqual(run(ctx, [CLI, 'review', '--reject', 'tabs'], '').status, 0);
    const again = add(ctx, args);
    assert.strictEqual(again.status, 1);
    assert.ok(again.stdout.includes('rejected earlier: tabs'), again.stdout);
    assert.strictEqual(yamlFor(ctx, 'tabs'), null);

    const pendingFile = path.join(ctx.proj, '.claude', 'learnings', 'pending-instincts.jsonl');
    fs.writeFileSync(pendingFile, JSON.stringify({ id: 'tabs', type: 'x', signal: 'x:tabs', confidence: 0.8, status: 'pending' }) + '\n');
    const auto = run(ctx, [CLI, 'review', '--auto'], '');
    assert.strictEqual(auto.status, 0, auto.stderr);
    assert.strictEqual(auto.stdout.trim(), 'rejected earlier: tabs');
    assert.strictEqual(yamlFor(ctx, 'tabs'), null);
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`learn-auto: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
