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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FIELD_LENGTH = 5000;

function truncate(value, maxLen) {
  if (value === null || value === undefined) return null;
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
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
      ensureDir(archiveDir);
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

    // Determine event type from hook_event or hook type
    // Claude Code passes different fields depending on hook type
    const hookEvent = input.hook_event || '';
    let event = 'tool_complete';
    if (hookEvent.includes('Pre') || input.tool_input !== undefined) {
      event = 'tool_start';
    }

    // Extract fields from Claude Code hook format
    const toolName = input.tool_name || input.tool || 'unknown';
    const toolInput = truncate(input.tool_input || input.input, MAX_FIELD_LENGTH);
    const toolOutput = truncate(input.tool_output || input.output, MAX_FIELD_LENGTH);
    const sessionId = input.session_id || 'unknown';
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

    if (event === 'tool_start' && toolInput) {
      observation.input = toolInput;
    }
    if (event === 'tool_complete' && toolOutput !== null) {
      observation.output = toolOutput;
    }
    if (toolUseId) {
      observation.tool_use_id = toolUseId;
    }

    // Archive observations file if too large
    archiveIfLarge(project.observations_file);

    // Append observation as JSONL
    ensureDir(path.dirname(project.observations_file));
    fs.appendFileSync(project.observations_file, JSON.stringify(observation) + '\n');

    process.exit(0);
  } catch (error) {
    // Never fail the hook — just exit silently
    process.exit(0);
  }
}

main();
