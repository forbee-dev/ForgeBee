#!/usr/bin/env node
/**
 * orchestrator-mode.test.js — the main thread stays an orchestrator: rules on every
 * prompt, product-code edits blocked, subagents and opt-out sessions untouched.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HOOK = path.join(ROOT, 'hooks', 'scripts', 'orchestrator-mode.js');
const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-orch-')));
const HOME = path.join(SCRATCH, 'home');
const PROJECT = path.join(SCRATCH, 'proj');
fs.mkdirSync(HOME);
fs.mkdirSync(PROJECT);

function run(input) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    cwd: PROJECT,
    env: { ...process.env, HOME, CLAUDE_PROJECT_DIR: PROJECT },
    encoding: 'utf8',
    timeout: 10000,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const main = { agent_type: 'forgebee:orchestrator' };
const BIG = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n');
let sid = 0;
// Default: a 10-line change in a fresh session, i.e. real work.
const edit = (file, extra = {}, change = { old_string: 'a', new_string: BIG }) =>
  run({ session_id: `t${sid++}`, ...main, ...extra, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: file, ...change } });

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); } catch (e) { failed++; console.log(`  not ok - ${name}\n    ${e.message}`); }
}

try {
  test('prompt: rules injected for the main orchestrator', () => {
    const r = run({ ...main, hook_event_name: 'UserPromptSubmit', prompt: 'yes do it' });
    const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('orchestrator mode') && ctx.includes('forgebee:'), ctx);
  });
  test('prompt: bare agent_type "orchestrator" also counts', () => {
    const r = run({ agent_type: 'orchestrator', hook_event_name: 'UserPromptSubmit', prompt: 'x' });
    assert.ok(r.stdout.includes('orchestrator mode'));
  });
  test('prompt: nothing when the user opted out or runs no agent', () => {
    assert.strictEqual(run({ agent_type: 'forgebee:direct', hook_event_name: 'UserPromptSubmit', prompt: 'x' }).stdout, '');
    assert.strictEqual(run({ hook_event_name: 'UserPromptSubmit', prompt: 'x' }).stdout, '');
  });
  test('edit: product code is blocked on the main thread', () => {
    const r = edit(path.join(PROJECT, 'src', 'app.ts'));
    assert.strictEqual(r.status, 2);
    assert.ok(r.stderr.includes('delegate'), r.stderr);
  });
  test('edit: relative paths resolve against the project', () => {
    assert.strictEqual(edit('src/app.ts').status, 2);
  });
  test('edit: orchestration files are allowed', () => {
    for (const f of ['docs/pm/state.yaml', 'docs/planning/briefs/x.md', 'docs/learnings/a.md', 'TASKS.md', 'CLAUDE.md', '.claude/team-progress.json']) {
      assert.strictEqual(edit(path.join(PROJECT, f)).status, 0, f);
    }
    assert.strictEqual(edit(path.join(HOME, '.claude', 'projects', 'p', 'memory', 'm.md')).status, 0, 'memory');
  });
  test('edit: a path that escapes the project is blocked', () => {
    assert.strictEqual(edit(path.join(PROJECT, '..', 'other', 'docs', 'pm', 'x.md')).status, 2);
  });
  test('direct: tiny edits pass, the third in one request is blocked, a new prompt resets', () => {
    const s = { session_id: 'budget' };
    const tiny = { old_string: 'const a = 1;', new_string: 'const a = 2;' };
    const f = path.join(PROJECT, 'src', 'app.ts');
    assert.strictEqual(edit(f, s, tiny).status, 0, '1st');
    assert.strictEqual(edit(f, s, tiny).status, 0, '2nd');
    assert.strictEqual(edit(f, s, tiny).status, 2, '3rd is real work');
    run({ ...main, ...s, hook_event_name: 'UserPromptSubmit', prompt: 'next' });
    assert.strictEqual(edit(f, s, tiny).status, 0, 'reset by new prompt');
  });
  test('direct: replace_all and long strings are not tiny', () => {
    const f = path.join(PROJECT, 'src', 'app.ts');
    assert.strictEqual(edit(f, {}, { old_string: 'a', new_string: 'b', replace_all: true }).status, 2);
    assert.strictEqual(edit(f, {}, { old_string: 'a', new_string: 'x'.repeat(500) }).status, 2);
  });
  test('direct: tiny new file via Write passes; overwrite or big file is blocked', () => {
    const write = (file, content) => run({ session_id: `w${sid++}`, ...main, hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content } });
    assert.strictEqual(write(path.join(PROJECT, '.nvmrc'), '22\n').status, 0, 'tiny new');
    fs.writeFileSync(path.join(PROJECT, 'existing.js'), 'x');
    assert.strictEqual(write(path.join(PROJECT, 'existing.js'), 'y').status, 2, 'overwrite');
    assert.strictEqual(write(path.join(PROJECT, 'big.js'), BIG).status, 2, 'big new');
  });
  test('edit: subagents (agent_id set) are never blocked', () => {
    assert.strictEqual(edit(path.join(PROJECT, 'src', 'app.ts'), { agent_id: 'a1', agent_type: 'forgebee:backend-engineer' }).status, 0);
  });
  const bash = (command, extra = {}) => run({ ...main, ...extra, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
  test('bash: commands that write product files are blocked', () => {
    for (const c of [
      'echo hi > src/a.ts', 'printf x >> src/a.ts', "sed -i '' 's/a/b/' src/x.js", 'perl -pi -e s/a/b/ src/x.js',
      'cp a.js src/b.js', 'mv a.js src/b.js', 'rm -rf src', 'cat x | tee src/out.txt', 'touch src/new.php',
      'git status && echo done > src/flag',
    ]) assert.strictEqual(bash(c).status, 2, c);
  });
  test('bash: read-only and orchestration commands pass', () => {
    for (const c of [
      'git status', 'git diff --stat', 'npm test 2>&1 | tail -5', 'ls > /dev/null', 'rg foo src',
      'echo note >> docs/pm/log.md', 'out=$(mktemp); npm test > "$out" 2>&1; tail "$out"',
      'git log --format="%h > %s" -3', "node -e 'const f = a => a > 1'", 'echo hi > /tmp/x', 'cmd >&2',
      'cp notes.md .claude/notes.md',
    ]) assert.strictEqual(bash(c).status, 0, c);
  });
  test('bash: subagents are never blocked', () => {
    assert.strictEqual(bash('echo hi > src/a.ts', { agent_id: 'a1', agent_type: 'forgebee:backend-engineer' }).status, 0);
  });
  test('edit: malformed input fails open', () => {
    const r = spawnSync(process.execPath, [HOOK], { input: 'not json', env: { ...process.env, HOME, CLAUDE_PROJECT_DIR: PROJECT }, encoding: 'utf8' });
    assert.strictEqual(r.status, 0);
  });
  test('wiring: settings.json makes orchestrator the main agent; hooks.json registers both events', () => {
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(ROOT, 'settings.json'), 'utf8')).agent, 'orchestrator');
    const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
    const uses = g => g.hooks.some(h => /orchestrator-mode\.js/.test(h.command));
    assert.ok(hooks.UserPromptSubmit.some(uses));
    assert.ok(hooks.PreToolUse.some(g => uses(g) && /Edit/.test(g.matcher) && /Write/.test(g.matcher)));
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`orchestrator-mode: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
