#!/usr/bin/env node
/**
 * orchestrator-mode.js — keeps the main thread an orchestrator for the whole session.
 *
 * Active only when the main thread runs as `forgebee:orchestrator` (the plugin's
 * settings.json default). Subagent calls carry `agent_id` and are never touched.
 *   UserPromptSubmit → re-injects the orchestrator rules on every prompt, so they
 *                      survive past the first turn and past compaction.
 *   PreToolUse       → allows tiny direct edits (a budget per prompt) and orchestration
 *                      files; blocks other main-thread Edit/Write/NotebookEdit and
 *                      Bash file writes, so real work goes to a specialist.
 * Fails open: a convenience guard, not a security boundary.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { readStdinJson, output, getProjectDir, ensureDir } = require('./_common.js');

// A one-liner is cheaper done inline than in a fresh subagent. Past this size, or
// after this many edits in one request, it is real work and goes to a specialist.
const DIRECT_MAX_LINES = 3;
const DIRECT_MAX_CHARS = 400;
const DIRECT_EDITS_PER_PROMPT = 2;

function budgetFile(input) {
  const sid = String(input.session_id || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  return path.join(getProjectDir(), '.claude', 'session-cache', `orchestrator-direct-${sid}`);
}

function isSmallChange(toolName, ti) {
  const lines = s => (s ? String(s).split('\n').length : 0);
  if (toolName === 'Edit') {
    if (ti.replace_all) return false; // one small string can rewrite a whole file
    const a = String(ti.old_string || '');
    const b = String(ti.new_string || '');
    return Math.max(lines(a), lines(b)) <= DIRECT_MAX_LINES && a.length + b.length <= DIRECT_MAX_CHARS;
  }
  if (toolName === 'Write') {
    if (fs.existsSync(path.resolve(getProjectDir(), ti.file_path || ''))) return false; // overwrite = rewrite
    const c = String(ti.content || '');
    return lines(c) <= DIRECT_MAX_LINES && c.length <= DIRECT_MAX_CHARS;
  }
  return false;
}

// Counts direct edits since the last prompt; returns false once the budget is spent.
function takeDirectEdit(input) {
  const file = budgetFile(input);
  let used = 0;
  try { used = parseInt(fs.readFileSync(file, 'utf8'), 10) || 0; } catch (e) { /* first edit this prompt */ }
  if (used >= DIRECT_EDITS_PER_PROMPT) return false;
  try { ensureDir(path.dirname(file)); fs.writeFileSync(file, String(used + 1)); } catch (e) { /* best-effort */ }
  return true;
}

const RULES = [
  '**ForgeBee orchestrator mode.** You coordinate; specialists do the work.',
  '- Route each request to a `forgebee:<name>` agent (Agent tool) or a ForgeBee skill (Skill tool). Pass full context: goal, files, acceptance criteria, `responseStyle: "orchestrator"`.',
  '- Independent work: dispatch in parallel. Review each report (Status line, evidence) and report to the user.',
  '- You may read code and run read-only commands to plan and to check reports.',
  '- A tiny change that needs no specialty (≤3 lines, ≤2 edits per request, Edit tool) you may make yourself: a subagent costs more than the change. Anything bigger goes to a specialist; the hook blocks it.',
  '- Opt out for a session: `claude --agent forgebee:direct`.',
].join('\n');

// Orchestration bookkeeping the main thread may still write.
const ALLOWED_PROJECT = [/^docs\/(pm|planning|learnings)\//, /^TASKS\.md$/, /^CLAUDE\.md$/, /^\.claude\//];

function isMainOrchestrator(input) {
  const type = String(input.agent_type || '').replace(/^forgebee:/, '');
  return type === 'orchestrator' && !input.agent_id;
}

function isAllowedPath(filePath) {
  if (!filePath) return false;
  const abs = path.resolve(getProjectDir(), filePath);
  const home = path.join(os.homedir(), '.claude') + path.sep;
  if (abs.startsWith(home)) return true; // memory, user settings
  const rel = path.relative(getProjectDir(), abs).split(path.sep).join('/');
  if (rel.startsWith('..')) return false;
  return ALLOWED_PROJECT.some(re => re.test(rel));
}

// Scratch and variable targets ("$out" from mktemp) are not product code.
const isScratch = t => /^(\/dev\/(null|stdout|stderr)|&\d|\$|\/tmp\/|\/private\/tmp\/|\/var\/folders\/)/.test(t);

// Paths a main-thread shell command would write. Quoted text is dropped first so a
// `>` inside a string or a format argument is not read as a redirection.
// shortcut: lexical, not a shell parser (no subshells, eval, or `cd` tracking); upgrade if real bypasses show up.
function bashWriteTargets(cmd) {
  const bare = cmd.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, '""');
  const targets = [];
  for (const m of bare.matchAll(/(?<![=\-<>&0-9])\d?>>?\s*([^\s;&|<>()]+)/g)) targets.push(m[1]);
  for (const seg of bare.split(/&&|\|\||[;|\n]/)) {
    const w = seg.trim().split(/\s+/).filter(Boolean);
    while (w.length && /^(sudo|env|command|\w+=\S*)$/.test(w[0])) w.shift();
    const [cmd0, ...rest] = w;
    const ops = rest.filter(t => !t.startsWith('-'));
    if (['rm', 'touch', 'truncate', 'tee', 'rmdir', 'unlink'].includes(cmd0)) targets.push(...ops);
    else if (['cp', 'mv', 'ln', 'install', 'rsync'].includes(cmd0) && ops.length) targets.push(ops[ops.length - 1]);
    else if (['sed', 'perl'].includes(cmd0) && rest.some(t => /^-\w*i/.test(t)) && ops.length) targets.push(ops[ops.length - 1]);
  }
  return targets.filter(t => t && t !== '""' && !isScratch(t));
}

async function main() {
  const input = await readStdinJson();
  if (!input || !isMainOrchestrator(input)) process.exit(0);

  if (input.hook_event_name === 'UserPromptSubmit') {
    try { fs.rmSync(budgetFile(input), { force: true }); } catch (e) { /* best-effort */ }
    output({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: RULES } });
    process.exit(0);
  }

  if (input.hook_event_name === 'PreToolUse') {
    const ti = input.tool_input || {};
    if (input.tool_name === 'Bash') {
      const blocked = bashWriteTargets(String(ti.command || '')).filter(t => !isAllowedPath(t));
      if (blocked.length === 0) process.exit(0);
    } else if (isAllowedPath(ti.file_path || ti.notebook_path || '')) {
      process.exit(0);
    } else if (isSmallChange(input.tool_name, ti) && takeDirectEdit(input)) {
      process.exit(0);
    }
    console.error(
      `BLOCKED: orchestrator mode — delegate this edit to a forgebee specialist (Agent tool, e.g. forgebee:backend-engineer) with full context. ` +
      `Main thread may make only tiny direct edits (≤${DIRECT_MAX_LINES} lines, ≤${DIRECT_EDITS_PER_PROMPT} per request, Edit tool) and edit orchestration files. Opt out: claude --agent forgebee:direct`
    );
    process.exit(2);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
