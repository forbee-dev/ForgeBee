#!/usr/bin/env node
/**
 * observe.js
 * Continuous Learning observation hook for ForgeBee.
 * Captures tool use events (PreToolUse/PostToolUse) as JSONL entries.
 * 
 * Registered on PreToolUse (*) and PostToolUse (*) in hooks.json.
 * Claude Code passes hook data via stdin as JSON.
 */

const fs = require('fs');
const path = require('path');
const { detectProject, ensureGlobalDirs, ensureDir, LEARNING_DIR } = require('./detect-project.js');

let redactForPrompt;
let SECRET_NAME;
try {
  ({ redactForPrompt, SECRET_NAME } = require('../../../hooks/scripts/_common.js'));
} catch (e) {
  process.exit(0); // no redactor — record nothing rather than raw secrets
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FIELD_LENGTH = 5000;

// Same 5000-char bound as before, but objects stay objects so self-improve can
// read obs.input.command. Redact before cutting: a secret split at the limit
// would no longer match its pattern.
function sanitize(value, key, budget) {
  if (typeof value === 'string') {
    const clean = key && SECRET_NAME.test(key) ? '[REDACTED:secret]' : redactForPrompt(value);
    const kept = clean.slice(0, Math.max(budget.left, 0));
    budget.left -= clean.length;
    return kept.length < clean.length ? kept + '...' : kept;
  }
  if (value === null || typeof value !== 'object') {
    budget.left -= 8;
    return value;
  }
  const out = Array.isArray(value) ? [] : {};
  for (const [k, v] of Object.entries(value)) {
    if (budget.left <= 0) break;
    budget.left -= k.length;
    out[k] = sanitize(v, Array.isArray(value) ? '' : k, budget);
  }
  return out;
}

async function readStdin(timeoutMs = 3000) {
  return new Promise((resolve) => {
    let data = '';
    const timeout = setTimeout(() => {
      process.stdin.removeAllListeners();
      resolve(null);
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        process.stdin.removeAllListeners();
        clearTimeout(timeout);
        resolve(null);
      }
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try { resolve(data ? JSON.parse(data) : null); }
      catch (e) { resolve(null); }
    });

    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });

    if (process.stdin.isTTY) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

function archiveIfLarge(obsFile) {
  try {
    const stats = fs.statSync(obsFile);
    if (stats.size >= MAX_FILE_SIZE_BYTES) {
      const archiveDir = path.join(path.dirname(obsFile), 'observations.archive');
      ensureDir(archiveDir, 0o700);
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
      const archivePath = path.join(archiveDir, `observations-${ts}-${process.pid}.jsonl`);
      fs.renameSync(obsFile, archivePath);
    }
  } catch (e) {
    // File doesn't exist yet or other error — fine
  }
}

async function main() {
  try {
    // Check if disabled
    const disabledFile = path.join(LEARNING_DIR, 'disabled');
    if (fs.existsSync(disabledFile)) {
      process.exit(0);
    }

    const input = await readStdin();
    if (!input) {
      process.exit(0);
    }

    ensureGlobalDirs();

    // Detect project context (use cwd from stdin if available)
    const cwd = input.cwd || '';
    const project = detectProject(cwd && fs.existsSync(cwd) ? cwd : undefined);

    const toolName = input.tool_name || input.tool || 'unknown';
    const rawInput = input.tool_input !== undefined ? input.tool_input : input.input;
    const rawOutput = [input.tool_response, input.tool_output, input.output].find(v => v !== undefined);
    const sessionId = input.session_id || 'unknown';

    // Claude Code sends hook_event_name; PostToolUse also carries tool_input, so
    // field sniffing is only a fallback for older payloads.
    const hookEvent = input.hook_event_name || input.hook_event || '';
    let event;
    if (/Post/.test(hookEvent)) event = 'tool_complete';
    else if (/Pre/.test(hookEvent)) event = 'tool_start';
    else event = rawOutput !== undefined || rawInput === undefined ? 'tool_complete' : 'tool_start';
    const toolUseId = input.tool_use_id || '';

    // Build observation
    const observation = {
      timestamp: new Date().toISOString(),
      event,
      tool: toolName,
      session: sessionId,
      project_id: project.id,
      project_name: project.name,
    };

    if (rawInput !== undefined && rawInput !== null) {
      observation.input = sanitize(rawInput, '', { left: MAX_FIELD_LENGTH });
    }
    if (event === 'tool_complete' && rawOutput !== undefined && rawOutput !== null) {
      observation.output = sanitize(rawOutput, '', { left: MAX_FIELD_LENGTH });
    }
    if (toolUseId) {
      observation.tool_use_id = toolUseId;
    }

    // Archive observations file if too large
    archiveIfLarge(project.observations_file);

    // Append observation as JSONL
    const obsDir = path.dirname(project.observations_file);
    ensureDir(obsDir);
    fs.appendFileSync(project.observations_file, JSON.stringify(observation) + '\n', { mode: 0o600 });
    // Files and archives written by older versions are 0644 / 0755.
    fs.chmodSync(project.observations_file, 0o600);
    try { fs.chmodSync(path.join(obsDir, 'observations.archive'), 0o700); } catch (e) { /* no archive yet */ }

    process.exit(0);
  } catch (error) {
    // Never fail the hook — just exit silently
    process.exit(0);
  }
}

main();
