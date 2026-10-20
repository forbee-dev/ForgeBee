#!/usr/bin/env node
/**
 * hooks-lifecycle.test.js — regressions for the session/lifecycle hooks: task-sync,
 * self-improve, session-save, checkpoint, suggest-compact, permission-denied-logger,
 * the warn-only hooks (JSON output Claude actually receives), debug-regex, subfolder
 * git paths, observe.js archive pruning, and hooks.json matchers.
 *
 * Every hook runs as a child process with HOME and CLAUDE_PROJECT_DIR in a temp dir.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const H = (n) => path.join(ROOT, 'hooks', 'scripts', n);
const OBSERVE = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'observe.js');

const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-hooks-lifecycle-')));
const HOME = path.join(SCRATCH, 'home');
fs.mkdirSync(HOME);
const gitEnv = {
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t.invalid',
  GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t.invalid',
};

let n = 0;
function newProject() {
  const dir = path.join(SCRATCH, `p${n++}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function run(script, stdin, project, cwd = project) {
  const r = spawnSync(process.execPath, [script], {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
    cwd,
    env: { ...process.env, ...gitEnv, HOME, CLAUDE_PROJECT_DIR: project },
    encoding: 'utf8',
    timeout: 20000,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: { ...process.env, ...gitEnv }, encoding: 'utf8' });
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

try {
  test('task-sync: Zoom survives and Active as last section prints', () => {
    const p = newProject();
    fs.writeFileSync(path.join(p, 'TASKS.md'), '# T\n\n## Waiting\n- [ ] Wait\n\n## Active\n- [ ] Fix Zoom bug\n- [ ] Second\n');
    const r = run(H('task-sync.js'), { hook_event_name: 'SessionStart' }, p);
    assert.ok(r.stdout.includes('Fix Zoom bug'), r.stdout);
    assert.ok(r.stdout.includes('Second'), r.stdout);
  });

  test('task-sync: Stop twice adds one Session work line', () => {
    const p = newProject();
    git(p, 'init', '-q');
    fs.writeFileSync(path.join(p, 'TASKS.md'), '# T\n\n## Done\n');
    git(p, 'add', '.');
    git(p, 'commit', '-qm', 'work');
    run(H('task-sync.js'), { hook_event_name: 'Stop' }, p);
    run(H('task-sync.js'), { hook_event_name: 'Stop' }, p);
    const count = (fs.readFileSync(path.join(p, 'TASKS.md'), 'utf8').match(/Session work/g) || []).length;
    assert.strictEqual(count, 1);
  });

  test('self-improve: same session and files writes one entry', () => {
    const p = newProject();
    run(H('self-improve.js'), { session_id: 's1' }, p);
    run(H('self-improve.js'), { session_id: 's1' }, p);
    const lines = fs.readFileSync(path.join(p, '.claude/learnings/index.jsonl'), 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 1);
  });

  test('session-save: one file per session, overwritten per turn, latest.json set', () => {
    const p = newProject();
    run(H('session-save.js'), { session_id: 'aaa' }, p);
    run(H('session-save.js'), { session_id: 'bbb/../x' }, p);
    run(H('session-save.js'), { session_id: 'aaa' }, p);
    const files = fs.readdirSync(path.join(p, '.claude/sessions')).sort();
    assert.deepStrictEqual(files, ['aaa.json', 'bbb____x.json', 'latest.json']);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(p, '.claude/sessions/latest.json'), 'utf8')).sessionId, 'aaa');
  });

  test('checkpoint: completed maps to done, phases capped at 50', () => {
    const p = newProject();
    for (let i = 0; i < 52; i++) {
      run(H('checkpoint.js'), { action: 'save', pipeline: 'workflow', feature: 'F', phase: 'x', phase_number: i, status: 'completed' }, p);
    }
    const cp = JSON.parse(fs.readFileSync(path.join(p, '.claude/checkpoints/workflow-f.json'), 'utf8'));
    assert.strictEqual(cp.status, 'done');
    assert.strictEqual(cp.phases.length, 50);
    run(H('checkpoint.js'), { action: 'save', pipeline: 'workflow', feature: 'F', phase: 'x', phase_number: 99, status: 'failed' }, p);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(p, '.claude/checkpoints/workflow-f.json'), 'utf8')).status, 'needs-recovery');
  });

  test('suggest-compact: alternating sessions keep separate counters', () => {
    const p = newProject();
    for (const id of ['A', 'B', 'A']) run(H('suggest-compact.js'), { session_id: id, tool_name: 'Bash' }, p);
    const dir = path.join(p, '.claude/session-cache');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'tool-call-count-A'), 'utf8'), '2');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'tool-call-count-B'), 'utf8'), '1');
  });

  test('permission-denied-logger: real session id, redacted command', () => {
    const p = newProject();
    const key = 'AKIA' + 'QWERTYUIOPASDFGH';
    run(H('permission-denied-logger.js'), { session_id: 'sess9', tool_name: 'Bash', tool_input: { command: `AWS_ACCESS_KEY_ID=${key} aws s3 ls` } }, p);
    const dir = path.join(p, '.claude/audit');
    const text = fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0]), 'utf8');
    assert.ok(!text.includes(key), text);
    assert.ok(text.includes('"session":"sess9"'), text);
  });

  test('audit-trail: Agent dispatch logs model, effort, and caller', () => {
    const p = newProject();
    const ti = { subagent_type: 'forgebee:wordpress-frontend', description: 'Build card', prompt: 'x'.repeat(9000), model: 'sonnet', effort: 'medium' };
    run(H('audit-trail.js'), { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Agent', tool_input: ti }, p);
    run(H('audit-trail.js'), { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Agent', agent_id: 'a1', agent_type: 'forgebee:frontend-specialist', tool_input: { subagent_type: 'forgebee:wordpress-frontend' } }, p);
    const dir = path.join(p, '.claude/audit');
    const [main, nested] = fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0]), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepStrictEqual([main.type, main.model, main.effort, main.from], ['dispatch', 'sonnet', 'medium', 'main']);
    assert.ok(!('prompt' in main));
    assert.deepStrictEqual([nested.model, nested.from], ['', 'forgebee:frontend-specialist']);
    const q = run(H('audit-trail.js'), { event_type: 'query', filter_type: 'dispatch' }, p).stdout;
    assert.ok(q.includes('model: sonnet') && q.includes('model: frontmatter'), q);
  });

  test('post-edit-console-warn: warning is JSON additionalContext; PHP method calls ignored', () => {
    const p = newProject();
    const js = path.join(p, 'a.js');
    fs.writeFileSync(js, 'console.log(1)\n');
    const r = run(H('post-edit-console-warn.js'), { tool_input: { file_path: js } }, p);
    assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.includes('console.log'), r.stdout);
    const php = path.join(p, 'a.php');
    fs.writeFileSync(php, '<?php\n$cart->add($x);\nFoo::add($y);\n');
    assert.ok(!/additionalContext/.test(run(H('post-edit-console-warn.js'), { tool_input: { file_path: php } }, p).stdout));
    fs.writeFileSync(php, '<?php\ndd($x);\n');
    assert.ok(/additionalContext/.test(run(H('post-edit-console-warn.js'), { tool_input: { file_path: php } }, p).stdout));
  });

  test('git-push-reminder: PreToolUse JSON on push to main', () => {
    const p = newProject();
    const r = run(H('git-push-reminder.js'), { tool_input: { command: 'git push origin main' } }, p);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    assert.strictEqual(out.hookEventName, 'PreToolUse');
    assert.ok(out.additionalContext.includes('main'));
  });

  test('pm-sync: Stop emits systemMessage', () => {
    const p = newProject();
    fs.mkdirSync(path.join(p, 'docs/pm'), { recursive: true });
    fs.writeFileSync(path.join(p, 'docs/pm/state.yaml'), 'features:\n  - id: feat-1\n    phase: build\n    updated: 2999-01-01\n');
    const r = run(H('pm-sync.js'), { hook_event_name: 'Stop' }, p);
    assert.ok(JSON.parse(r.stdout).systemMessage.includes('1 active'), r.stdout);
  });

  test('console-log-audit: project in repo subfolder resolves paths, emits systemMessage', () => {
    const repo = newProject();
    git(repo, 'init', '-q');
    const sub = path.join(repo, 'sub');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'a.js'), 'let a = 1;\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-qm', 'init');
    fs.writeFileSync(path.join(sub, 'a.js'), 'console.log(1);\n');
    const r = run(H('console-log-audit.js'), { hook_event_name: 'Stop' }, sub, SCRATCH);
    assert.ok(JSON.parse(r.stdout).systemMessage.includes('a.js'), r.stdout + r.stderr);
  });

  test('observe: archive dir keeps newest 5', () => {
    const p = newProject();
    run(OBSERVE, { cwd: p, session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' }, hook_event_name: 'PreToolUse' }, p);
    const registry = JSON.parse(fs.readFileSync(path.join(HOME, '.claude/forgebee-learning/projects.json'), 'utf8'));
    const id = Object.keys(registry).find(k => registry[k].root === p);
    const projDir = path.join(HOME, '.claude/forgebee-learning/projects', id);
    const arch = path.join(projDir, 'observations.archive');
    fs.mkdirSync(arch, { recursive: true });
    for (let i = 0; i < 7; i++) fs.writeFileSync(path.join(arch, `observations-2000-01-0${i + 1}-00-00-00-1.jsonl`), '');
    fs.writeFileSync(path.join(projDir, 'observations.jsonl'), Buffer.alloc(11 * 1024 * 1024, 'a'));
    run(OBSERVE, { cwd: p, session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' }, hook_event_name: 'PreToolUse' }, p);
    assert.strictEqual(fs.readdirSync(arch).length, 5);
  });

  test('hooks.json: post-edit hooks match Write, Agent tool is matched', () => {
    const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
    for (const g of hooks.PostToolUse) {
      if (g.hooks.some(h => /post-edit-/.test(h.command))) assert.ok(/Write/.test(g.matcher), g.matcher);
    }
    for (const g of [...hooks.PreToolUse, ...hooks.PostToolUse]) {
      if (/Task/.test(g.matcher)) assert.ok(/Agent/.test(g.matcher), g.matcher);
    }
    assert.ok(hooks.PreToolUse.some(g => /Agent/.test(g.matcher) && g.hooks.some(h => /audit-trail/.test(h.command))), 'audit-trail not on Agent');
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`hooks-lifecycle: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
