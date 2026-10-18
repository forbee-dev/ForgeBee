#!/usr/bin/env node
/**
 * learn-auto.js — Stop hook. Once per session, when the finished turn made
 * auto_learn.min_tool_calls tool calls and the session saved no instinct or
 * code learning, block the stop once and ask Claude to save them with
 * `instinct-cli.js add` and `learning-cli.js add`.
 * Claude Code sets stop_hook_active on the next Stop, so the ask never loops.
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, readStdinJsonSync, safeWriteFlag } = require('./_common.js');

// A missed ask costs one learning; a broken Stop hook costs the session.
process.on('uncaughtException', () => process.exit(0));

const SCRIPTS = path.resolve(__dirname, '..', '..', 'skills', 'continuous-learning', 'scripts');
const CLI = path.join(SCRIPTS, 'instinct-cli.js');
const LEARNING_CLI = path.join(SCRIPTS, 'learning-cli.js');
const TAIL_BYTES = 4 * 1024 * 1024;
// The ask quotes the CLI path, so a quote can sit between `.js` and `add`.
const SAVE_CALL = /(?:instinct|learning)-cli\.js["']?\s+add\b/;

const ASK_INSTINCTS =
  '[forgebee] This session did real work and saved no learning yet. Before you finish, review the session for patterns ' +
  'that meet the continuous-learning threshold: the same action seen 3+ times across 2+ event types, or one explicit user correction. ' +
  `For each pattern run: node "${CLI}" add --id <kebab-id> --trigger "when ..." --confidence <0.3|0.5|0.7|0.9> ` +
  '--domain <code-style|testing|git|debugging|workflow|security|general> [--scope global], with the body on stdin ' +
  'as "## Action" and "## Evidence" sections. One pattern per instinct. Skip one-time events, typos, and tooling habits. ' +
  'End the reply with one line per saved instinct: 🧠 Learned: <id> (<confidence>)';
const ASK_CODE =
  '\n\nIf this turn worked out something about the code (a decision, a dead end, a trap), also save one code learning: ' +
  `node "${LEARNING_CLI}" add --title "<what it was about>" [--touches a,b], with the body on stdin under ` +
  '"## Decided", "## Tried and ruled out", "## Watch out". A summary, never a transcript. ' +
  'If the user corrected how something is done in this repo, add --standing. Never edit an existing learning; write a new one. ' +
  'The command prints the closing line to use.';
const ASK_END =
  '\n\nSave nothing secret. If nothing meets the bar, finish your reply unchanged and do not mention this check.';

// transcript_path comes from hook stdin: read it as data only, bounded to the tail.
function readTail(file) {
  const st = fs.statSync(file);
  if (!st.isFile()) return null;
  const start = Math.max(0, st.size - TAIL_BYTES);
  const buf = Buffer.alloc(st.size - start);
  const fd = fs.openSync(file, 'r');
  try {
    let off = 0;
    while (off < buf.length) {
      const n = fs.readSync(fd, buf, off, buf.length - off, start + off);
      if (n === 0) break;
      off += n;
    }
  } finally {
    fs.closeSync(fd);
  }
  const text = buf.toString('utf8');
  return start > 0 ? text.slice(text.indexOf('\n') + 1) : text;
}

// Tool calls since the user's last typed message; -1 when the session already saved one.
function turnToolCalls(text) {
  let calls = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    const content = e && e.message && e.message.content;
    const blocks = Array.isArray(content) ? content : [];
    // A typed message starts a new turn; a tool_result-only entry does not.
    if (e.type === 'user' && (typeof content === 'string' || blocks.some(b => b && b.type === 'text'))) calls = 0;
    for (const b of blocks) {
      if (!b || b.type !== 'tool_use') continue;
      if (b.input && typeof b.input.command === 'string' && SAVE_CALL.test(b.input.command)) return -1;
      calls++;
    }
  }
  return calls;
}

function main() {
  const input = readStdinJsonSync() || {};
  if (input.stop_hook_active === true) return;
  if (typeof input.transcript_path !== 'string' || !input.transcript_path) return;

  const { LEARNING_DIR } = require(path.join(SCRIPTS, 'detect-project.js'));
  if (fs.existsSync(path.join(LEARNING_DIR, 'disabled'))) return;
  const cfg = require(CLI).autoLearnConfig();
  if (cfg.enabled === false) return;
  const projectDir = getProjectDir();
  // Trail's own Stop hook asks for learnings in this repo.
  if (fs.existsSync(path.join(projectDir, '.trail', 'learnings'))) return;

  const sessionId = String(input.session_id || 'default').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 128);
  const flag = path.join(projectDir, '.claude', 'session-cache', 'learn-auto', `${sessionId}.flag`);
  if (fs.existsSync(flag)) return;

  let text;
  try { text = readTail(input.transcript_path); } catch { return; }
  if (text === null) return;

  const calls = turnToolCalls(text);
  if (calls < 0) {
    safeWriteFlag(flag, String(Date.now()));
    return;
  }
  if (calls < (Number(cfg.min_tool_calls) || 3)) return;
  // No flag, no ask: without it every later turn would ask again.
  if (!safeWriteFlag(flag, String(Date.now())).ok) return;
  // Synchronous: process.exit below would cut an async pipe write on macOS.
  const reason = ASK_INSTINCTS + (cfg.code_learnings === false ? '' : ASK_CODE) + ASK_END;
  fs.writeSync(1, JSON.stringify({ decision: 'block', reason }));
}

try { main(); } catch { /* never fail the Stop */ }
process.exit(0);
