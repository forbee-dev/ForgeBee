#!/usr/bin/env node
/**
 * suggest-compact.js — Strategic compaction suggestion
 * PreToolUse hook: tracks tool call count and suggests /compact at logical
 * intervals (~50 calls, then every 25 after). Helps prevent hitting context
 * limits mid-task by suggesting compaction at phase transitions.
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, ensureDir, log } = require('./_common.js');

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

  const projectDir = getProjectDir();
  const counterDir = path.join(projectDir, '.claude', 'session-cache');
  const counterFile = path.join(counterDir, 'tool-call-count');
  const sessionFile = path.join(counterDir, 'tool-call-session');

  ensureDir(counterDir);

  const threshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  const interval = 25;

  // Check if session changed — reset counter if so
  let lastSessionId = '';
  if (fs.existsSync(sessionFile)) {
    try {
      lastSessionId = fs.readFileSync(sessionFile, 'utf8').trim();
    } catch (e) {
      // Default to empty
    }
  }

  const sessionChanged = currentSessionId && currentSessionId !== lastSessionId;

  // Persist current session ID
  if (currentSessionId) {
    try {
      fs.writeFileSync(sessionFile, currentSessionId, 'utf8');
    } catch (e) {
      // Silently fail
    }
  }

  // Read and increment counter (reset if session changed)
  let count = 1;
  if (sessionChanged) {
    count = 1;
  } else if (fs.existsSync(counterFile)) {
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

  // Suggest at threshold
  if (count === threshold) {
    log(
      `[StrategicCompact] ${threshold} tool calls reached — consider /compact if transitioning phases`
    );
    log(
      '[StrategicCompact] Good times to compact: after exploration, after completing a milestone, before starting next task'
    );
  }

  // Suggest at regular intervals after threshold
  if (count > threshold) {
    const pastThreshold = count - threshold;
    if (pastThreshold % interval === 0) {
      log(
        `[StrategicCompact] ${count} tool calls — good checkpoint for /compact if context is getting stale`
      );
    }
  }

  // Pass through (no blocking)
  process.stdout.write(input);
  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
