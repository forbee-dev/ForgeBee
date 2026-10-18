#!/usr/bin/env node
/**
 * learn-digest.js — SessionStart hook. Auto-activates pending candidates at or
 * above auto_learn.auto_activate_confidence, injects the active instincts so
 * Claude applies them, and counts what still waits for review. It lists standing
 * code learnings from docs/learnings/. Once per 24 h it also compresses aged
 * learnings and lists evolve candidates.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getProjectDir, readStdinJsonSync, output, safeWriteFlag, redactForPrompt } = require('./_common.js');

process.on('uncaughtException', () => process.exit(0));

const SCRIPTS = path.resolve(__dirname, '..', '..', 'skills', 'continuous-learning', 'scripts');
const CLI = path.join(SCRIPTS, 'instinct-cli.js');
// additionalContext over ~2 KB is dropped silently.
const MAX_CHARS = 2000;
const LIST_BUDGET = 1200;
const COOLDOWN_HOURS = 24;
const LIST_HEADER = '## Learned instincts (apply)';

function clip(text, max) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

// Instinct files can be imported from others, so they reach the prompt redacted.
function instinctLine(inst) {
  const m = (inst.content || '').match(/## Action\s*\n\s*(.+?)(?:\n\n|\n##|$)/s);
  const action = m ? m[1].trim().split('\n')[0] : inst.id;
  const trigger = String(inst.trigger || inst.id).replace(/^when\s+/i, '');
  const conf = Number(inst.confidence) || 0.5;
  return redactForPrompt(`- [${conf.toFixed(1)}] when ${clip(trigger, 120)} → ${clip(action, 160)}`);
}

function digestDue(throttleFile) {
  try {
    const last = parseInt(fs.readFileSync(throttleFile, 'utf8').trim(), 10);
    if ((Date.now() - last) / (1000 * 60 * 60) < COOLDOWN_HOURS) return false;
  } catch {
    // no or invalid throttle file: due
  }
  return safeWriteFlag(throttleFile, String(Date.now())).ok;
}

function evolveLines(cli, active) {
  const { skillCandidates, workflowInstincts, agentCandidates } = cli.analyzeEvolve(active);
  const lines = [
    ...skillCandidates.map(c => `- skill: "${clip(c.trigger, 60)}" (${c.instincts.length} instincts)`),
    ...workflowInstincts.map(i => `- command from ${i.id}`),
    ...agentCandidates.map(c => `- agent: "${clip(c.trigger, 60)}" (${c.instincts.length} instincts)`),
  ].slice(0, 3);
  if (!lines.length) return '';
  return redactForPrompt(`Evolve candidates:\n${lines.join('\n')}\nGenerate: node "${CLI}" evolve --generate`);
}

// Standing learnings first, newest first; the caller drops lines from the end to fit.
function codeLearningLines(projectDir, cfg) {
  if (cfg.code_learnings === false) return { standing: [], count: '' };
  // Trail owns learnings in this repo; instincts still run.
  if (fs.existsSync(path.join(projectDir, '.trail', 'learnings'))) return { standing: [], count: '' };
  const lc = require(path.join(SCRIPTS, 'learning-cli.js'));
  const learnings = lc.listLearnings(projectDir);
  if (!learnings.length) return { standing: [], count: '' };
  const standing = learnings.filter(l => l.standing)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(l => `- Standing: ${lc.safeTitle(clip(l.title, 100))} — ${redactForPrompt(lc.decidedLead(l))}`);
  return { standing, count: `${learnings.length} code learnings in ${lc.LEARNINGS_REL}/ — recalled per prompt` };
}

function main() {
  const input = readStdinJsonSync() || {};
  const { LEARNING_DIR, detectProject } = require(path.join(SCRIPTS, 'detect-project.js'));
  if (fs.existsSync(path.join(LEARNING_DIR, 'disabled'))) return;

  const cli = require(CLI);
  const cfg = cli.autoLearnConfig();
  const projectDir = getProjectDir();
  const cwd = typeof input.cwd === 'string' && fs.existsSync(input.cwd) ? input.cwd : undefined;
  const project = detectProject(cwd);

  const activated = cfg.enabled === false ? [] : cli.autoActivate(project, projectDir, cfg.auto_activate_confidence).activated;
  const active = cli.loadActiveInstincts(project)
    .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
  const pending = cli.pendingSummary(project, projectDir);

  let evolve = '';
  if (digestDue(path.join(projectDir, '.claude', 'learnings', '.last-digest'))) {
    spawnSync(process.execPath, [path.join(SCRIPTS, 'compress-learnings.js')], {
      cwd: projectDir,
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
      stdio: 'ignore',
      timeout: 2000,
    });
    if (active.length >= 3) evolve = evolveLines(cli, active);
  }

  const head = activated.length
    ? `Activated: ${activated.join(', ')} — veto: node "${CLI}" review --reject <id>`
    : '';
  const pendingLine = pending.total
    ? `${pending.total} pending (${pending.high} ≥0.5) — node "${CLI}" review`
    : '';

  const code = codeLearningLines(projectDir, cfg);
  const codeBlock = () => [...code.standing, code.count].filter(Boolean).join('\n');
  const others = () => [head, codeBlock(), pendingLine, evolve].filter(Boolean).join('\n\n');
  while (code.standing.length && others().length > MAX_CHARS - LIST_HEADER.length - 6) code.standing.pop();

  // The instinct list gets whatever the other sections leave, up to LIST_BUDGET.
  let list = '';
  if (active.length) {
    const fixed = others();
    const budget = Math.min(LIST_BUDGET, MAX_CHARS - fixed.length - LIST_HEADER.length - 6);
    const more = n => `- … ${n} more: node "${CLI}" status`;
    const lines = [];
    let used = 0;
    for (let i = 0; i < active.length; i++) {
      const line = instinctLine(active[i]);
      const left = active.length - i - 1;
      const reserve = left ? more(left).length + 1 : 0;
      if (used + line.length + 1 + reserve > budget) {
        if (used + more(active.length - i).length <= budget) lines.push(more(active.length - i));
        break;
      }
      lines.push(line);
      used += line.length + 1;
    }
    if (lines.length) list = `${LIST_HEADER}\n${lines.join('\n')}`;
  }

  const context = [head, list, codeBlock(), pendingLine, evolve].filter(Boolean).join('\n\n');
  if (!context) return;
  output({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context.slice(0, MAX_CHARS),
    },
  });
}

try { main(); } catch { /* never block session start */ }
