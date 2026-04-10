#!/usr/bin/env node
/**
 * permission-denied-logger.js — Logs auto-mode classifier denials to audit trail
 * Only fires in auto permission mode when Claude's AI safety classifier blocks an action.
 * Useful for understanding what the classifier catches and tuning autoMode rules.
 */

const { readStdinJson, log } = require('./_common.js');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  const input = await readStdinJson();
  if (!input) process.exit(0);

  const toolName = input.tool_name || 'unknown';
  const command = input.tool_input?.command || '';
  const reason = input.denial_reason || 'classifier denied';

  // Log to audit trail via the existing audit-trail.js
  const auditPayload = JSON.stringify({
    event_type: 'permission_denied',
    tool_name: toolName,
    command: command.substring(0, 200), // truncate for safety
    denial_reason: reason,
    session_id: process.env.SESSION_ID || 'unknown',
  });

  try {
    const scriptDir = path.dirname(process.argv[1]);
    const auditScript = path.join(scriptDir, 'audit-trail.js');
    execSync(`echo '${auditPayload.replace(/'/g, "\\'")}' | node "${auditScript}"`, {
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch (e) {
    log(`Failed to log denial to audit trail: ${e.message}`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
