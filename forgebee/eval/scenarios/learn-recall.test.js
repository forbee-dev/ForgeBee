#!/usr/bin/env node
/**
 * learn-recall.test.js — code learnings: `learning-cli.js add` (store, touches,
 * no overwrite, redaction) and learn-recall.js (UserPromptSubmit injection).
 *
 * Every case gets its own HOME and project dir, so the real
 * ~/.claude/forgebee-learning store is never touched.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LCLI = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'learning-cli.js');
const RECALL = path.join(ROOT, 'hooks', 'scripts', 'learn-recall.js');

const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-learn-recall-')));
let seq = 0;

function fresh({ gitRepo = false } = {}) {
  const dir = path.join(SCRATCH, String(seq++));
  const home = path.join(dir, 'home');
  const proj = path.join(dir, 'proj');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(proj, { recursive: true });
  const env = { ...process.env, HOME: home, CLAUDE_PROJECT_DIR: proj, USER: 'tester' };
  delete env.CLAUDE_PLUGIN_ROOT;
  delete env.GIT_DIR;
  if (gitRepo) {
    const gitEnv = { ...env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
    execFileSync('git', ['init', '-q'], { cwd: proj, env: gitEnv });
    execFileSync('git', ['config', 'user.name', 'Ada Lovelace'], { cwd: proj, env: gitEnv });
  }
  return { dir, home, proj, env, store: path.join(proj, 'docs', 'learnings') };
}

function run(ctx, args, stdin) {
  const r = spawnSync(process.execPath, args, {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin || {}),
    cwd: ctx.proj, env: ctx.env, encoding: 'utf8', timeout: 20000,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const BODY = '## Decided\n- Cache by locale in src/cache.js.\n\n## Tried and ruled out\n- Per-user keys.\n\n## Watch out\n- TTL.\n';

function addLearning(ctx, title, extra = [], body = BODY) {
  return run(ctx, [LCLI, 'add', '--title', title, ...extra], body);
}

function writeLearning(ctx, name, { title, touches = [], decided = 'Something.', date = '2026-10-01' }) {
  fs.mkdirSync(ctx.store, { recursive: true });
  const fm = ['---', `title: ${title}`, 'author: t', `date: ${date}`];
  if (touches.length) fm.push('touches:', ...touches.map(t => `  - ${t}`));
  fs.writeFileSync(path.join(ctx.store, name), `${fm.join('\n')}\n---\n\n## Decided\n${decided}\n`);
}

function recall(ctx, prompt, sessionId = 's1') {
  const r = run(ctx, [RECALL], { prompt, session_id: sessionId, cwd: ctx.proj, hook_event_name: 'UserPromptSubmit' });
  assert.strictEqual(r.status, 0, r.stderr);
  if (!r.stdout.trim()) return '';
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

try {
  test('add: writes frontmatter, touches from body mentions and git status', () => {
    const ctx = fresh({ gitRepo: true });
    fs.mkdirSync(path.join(ctx.proj, 'src'));
    fs.writeFileSync(path.join(ctx.proj, 'src', 'cache.js'), '');
    fs.writeFileSync(path.join(ctx.proj, 'changed.php'), '');
    fs.mkdirSync(path.join(ctx.proj, '.claude'));
    fs.writeFileSync(path.join(ctx.proj, '.claude', 'x.json'), '');
    const r = addLearning(ctx, 'Cache rule: by locale, not by user!');
    assert.strictEqual(r.status, 0, r.stderr);
    const name = fs.readdirSync(ctx.store)[0];
    assert.ok(/^\d{4}-\d{2}-\d{2}-cache-rule-by-locale-not-by\.md$/.test(name), name);
    assert.ok(r.stdout.includes(`saved learning docs/learnings/${name} (touches: 2)`), r.stdout);
    assert.ok(r.stdout.includes('close your reply with: 📝 Saved learning: Cache rule: by locale, not by user!'), r.stdout);
    const text = fs.readFileSync(path.join(ctx.store, name), 'utf8');
    assert.ok(text.startsWith('---\ntitle: "Cache rule: by locale, not by user!"\nauthor: Ada Lovelace\ndate: '), text);
    assert.ok(text.includes('touches:\n  - src/cache.js\n  - changed.php\n---'), text);
    assert.ok(!text.includes('standing'), text);
    assert.ok(text.includes('## Tried and ruled out'), text);
  });

  test('add: same title gets -2, --standing and --touches are kept', () => {
    const ctx = fresh();
    addLearning(ctx, 'Same title');
    const r = addLearning(ctx, 'Same title', ['--standing', '--touches', 'a/b.js,./c.php,../out.js,node_modules/x.js']);
    assert.strictEqual(r.status, 0, r.stderr);
    const names = fs.readdirSync(ctx.store);
    assert.strictEqual(names.length, 2);
    const second = names.find(n => n.endsWith('-same-title-2.md'));
    assert.ok(second, names.join(','));
    const text = fs.readFileSync(path.join(ctx.store, second), 'utf8');
    assert.ok(text.includes('standing: true\ntouches:\n  - a/b.js\n  - c.php\n---'), text);
    assert.ok(text.includes('author: tester'), text);
  });

  test('add: redacts a GitHub token, rejects empty stdin', () => {
    const ctx = fresh();
    const token = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
    assert.strictEqual(addLearning(ctx, 'Token leak', [], `## Decided\nUse ${token} here.\n`).status, 0);
    const text = fs.readFileSync(path.join(ctx.store, fs.readdirSync(ctx.store)[0]), 'utf8');
    assert.ok(!text.includes(token), text);
    assert.strictEqual(addLearning(ctx, 'Empty', [], '').status, 1);
    assert.strictEqual(fs.readdirSync(ctx.store).length, 1);
  });

  test('add: prose title keeps "keys:", a token in the title is redacted, recall shows it intact', () => {
    const ctx = fresh();
    const r = addLearning(ctx, 'Cache keys: per locale', ['--touches', 'src/cache.js']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('📝 Saved learning: Cache keys: per locale'), r.stdout);
    const name = fs.readdirSync(ctx.store)[0];
    assert.ok(/^\d{4}-\d{2}-\d{2}-cache-keys-per-locale\.md$/.test(name), name);
    assert.ok(fs.readFileSync(path.join(ctx.store, name), 'utf8').includes('title: "Cache keys: per locale"'));

    const token = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
    const t = addLearning(ctx, `Rotate ${token} weekly`);
    assert.strictEqual(t.status, 0, t.stderr);
    assert.ok(!t.stdout.includes(token), t.stdout);
    const stored = fs.readdirSync(ctx.store).map(n => n + fs.readFileSync(path.join(ctx.store, n), 'utf8')).join('\n');
    assert.ok(!stored.includes(token) && !stored.includes('a1b2c3d4'), 'token left in a file or name');
    assert.ok(stored.includes('[REDACTED:github-token]'), stored);

    const c = recall(ctx, 'why is src/cache.js keyed this way?', 'st');
    assert.ok(c.includes('- Cache keys: per locale ('), c);
  });

  test('recall: a prompt naming a touched file injects it', () => {
    const ctx = fresh();
    writeLearning(ctx, 'a.md', { title: 'Locale cache', touches: ['src/cache.js'], decided: 'Key by locale.' });
    const c = recall(ctx, 'why is src/cache.js slow today?');
    assert.ok(c.startsWith('📝 Learnings earlier sessions left on this.'), c);
    assert.ok(c.includes('- Locale cache (t, 2026-10-01; touches: src/cache.js): Key by locale. — full note: docs/learnings/a.md'), c);
  });

  test('recall: two title words inject it, an unrelated prompt is silent', () => {
    const ctx = fresh();
    writeLearning(ctx, 'a.md', { title: 'Webhook retry backoff' });
    assert.ok(recall(ctx, 'tune the webhook retry logic please', 's2').includes('Webhook retry backoff'));
    assert.strictEqual(recall(ctx, 'rename the footer component colour', 's3'), '');
  });

  test('recall: never injects the same learning twice in a session', () => {
    const ctx = fresh();
    writeLearning(ctx, 'a.md', { title: 'Webhook retry backoff' });
    assert.ok(recall(ctx, 'tune the webhook retry logic please', 's4'));
    assert.strictEqual(recall(ctx, 'tune the webhook retry logic again', 's4'), '');
    assert.ok(recall(ctx, 'tune the webhook retry logic please', 's5'), 'other session lost it');
  });

  test('recall: short prompt and .trail/learnings guards are silent', () => {
    const ctx = fresh();
    writeLearning(ctx, 'a.md', { title: 'Webhook retry backoff' });
    assert.strictEqual(recall(ctx, 'webhook re', 's6'), '');
    fs.mkdirSync(path.join(ctx.proj, '.trail', 'learnings'), { recursive: true });
    assert.strictEqual(recall(ctx, 'tune the webhook retry logic please', 's7'), '');
  });

  test('recall: files this session edited match touches', () => {
    const ctx = fresh();
    writeLearning(ctx, 'a.md', { title: 'Payment rounding', touches: ['lib/pay.php'] });
    const obsDir = path.join(ctx.home, '.claude', 'forgebee-learning', 'projects');
    // Register the project the same way observe.js does, then add one Edit observation.
    run(ctx, [path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'observe.js')], {
      hook_event_name: 'PostToolUse', tool_name: 'Edit', session_id: 's8', cwd: ctx.proj,
      tool_input: { file_path: path.join(ctx.proj, 'lib', 'pay.php') }, tool_response: 'ok',
    });
    assert.ok(fs.readdirSync(obsDir).length, 'observation not written');
    assert.ok(recall(ctx, 'now update the invoice template text', 's8').includes('Payment rounding'));
  });

  test('recall: 50 matching learnings stay at or under 1500 chars', () => {
    const ctx = fresh();
    for (let i = 0; i < 50; i++) {
      writeLearning(ctx, `l${i}.md`, { title: `Webhook retry backoff ${i}`, decided: 'x'.repeat(400), touches: ['src/hook.js'] });
    }
    const c = recall(ctx, 'tune the webhook retry logic in src/hook.js', 's9');
    assert.ok(c.length > 0 && c.length <= 1500, `length ${c.length}`);
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`learn-recall: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
