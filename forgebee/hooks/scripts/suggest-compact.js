#!/usr/bin/env node
/**
 * suggest-compact.js — Strategic compaction suggestion
 * PreToolUse hook: tracks tool call count and suggests /compact at logical
 * intervals (~50 calls, then every 25 after). Helps prevent hitting context
 * limits mid-task by suggesting compaction at phase transitions.
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, ensureDir, output } = require('./_common.js');

async function main() {
  let input = '';

  // Read stdin synchronously
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch (e) {
    process.stdout.write('');
    process.exit(0);
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (e) {
    process.stdout.write(input);
    process.exit(0);
  }

  // Extract session ID from the parsed input
  const currentSessionId = toolInput.session_id || '';
  const safeId = currentSessionId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);

  const projectDir = getProjectDir();
  const counterDir = path.join(projectDir, '.claude', 'session-cache');
  // Per-session file: one shared counter reset to 1 whenever sessions alternated.
  const counterFile = path.join(counterDir, `tool-call-count-${safeId || 'unknown'}`);

  ensureDir(counterDir);

  const threshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  const interval = 25;

  // Read and increment counter
  let count = 1;
  if (fs.existsSync(counterFile)) {
    try {
      const stored = fs.readFileSync(counterFile, 'utf8').trim();
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        count = parsed + 1;
      }
    } catch (e) {
      // Default to 1
    }
  }

  try {
    fs.writeFileSync(counterFile, String(count), 'utf8');
  } catch (e) {
    // Silently fail to write
  }

  let hint = '';
  if (count === threshold) {
    hint =
      `[StrategicCompact] ${threshold} tool calls reached — consider /compact if transitioning phases. ` +
      'Good times to compact: after exploration, after completing a milestone, before starting next task';
  } else if (count > threshold && (count - threshold) % interval === 0) {
    hint = `[StrategicCompact] ${count} tool calls — good checkpoint for /compact if context is getting stale`;
  }

  // stderr on exit 0 never reaches the model; additionalContext does.
  if (hint) {
    output({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: hint } });
  }
  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
