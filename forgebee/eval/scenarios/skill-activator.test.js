#!/usr/bin/env node
/**
 * skill-activator.test.js — per-prompt routing: prefixed names, no generic-word
 * noise, stack routing, and short follow-ups keep the last strong routing.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HOOK = path.join(ROOT, 'hooks', 'scripts', 'skill-activator.js');
const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-activator-')));

function route(prompt, session = 's1') {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: session, prompt }),
    cwd: SCRATCH,
    env: { ...process.env, HOME: SCRATCH, CLAUDE_PLUGIN_ROOT: ROOT, CLAUDE_PROJECT_DIR: SCRATCH },
    encoding: 'utf8',
    timeout: 10000,
  });
  if (!r.stdout) return '';
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
}
const names = ctx => (ctx.match(/\*\*\/?forgebee:[\w-]+\*\*/g) || []).map(s => s.replace(/\*|\//g, ''));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); } catch (e) { failed++; console.log(`  not ok - ${name}\n    ${e.message}`); }
}

try {
  test('routes a WordPress security prompt to prefixed surfaces, at most 3', () => {
    const n = names(route('audit the wordpress plugin for nonce and sanitization issues'));
    assert.ok(n.includes('forgebee:wordpress-security'), n.join());
    assert.ok(n.length <= 3, n.join());
  });
  test('never prints a bare surface name', () => {
    const ctx = route('run a security review before I push');
    assert.ok(!/\*\*\/?(?!forgebee:)[\w-]+\*\* (agent|skill)/.test(ctx) && !/run \*\*\/(?!forgebee:)/.test(ctx), ctx);
  });
  test('generic words alone do not route ("contents", "hook", "session")', () => {
    assert.deepStrictEqual(names(route('full review of contents of agents, skills and commands', 'g1')), []);
    assert.deepStrictEqual(names(route('check the session-save hook for parallel sessions', 'g2')), []);
  });
  test('a longer prompt with no match is a new topic, not a follow-up', () => {
    route('set up RLS policies in supabase', 'n1');
    assert.ok(!route('check the session-save hook for parallel sessions', 'n1').includes('Follow-up'));
  });
  test('short follow-up carries the last strong routing for the same session', () => {
    route('set up RLS policies in supabase', 'f1');
    const ctx = route('yes, do it', 'f1');
    assert.ok(ctx.includes('Follow-up') && ctx.includes('forgebee:supabase-specialist'), ctx);
  });
  test('follow-up does not leak across sessions', () => {
    assert.ok(!route('yes, do it', 'other').includes('Follow-up'));
  });
  test('main-thread agents are never suggested', () => {
    const n = names(route('orchestrator direct mode for the orchestrator'));
    assert.ok(!n.includes('forgebee:orchestrator') && !n.includes('forgebee:direct'), n.join());
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`skill-activator: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
