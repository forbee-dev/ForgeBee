#!/usr/bin/env node
/**
 * audit-trail.js — Append-only governance audit log
 * Records every permission decision, debate ruling, verification result,
 * and escalation with timestamp, actor, and context
 *
 * Provides accountability and traceability for all agent actions
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, initializeProjectDirs, readStdinJsonSync } = require('./_common.js');

const PROJECT_DIR = getProjectDir();
initializeProjectDirs();

const inputData = readStdinJsonSync();
if (!inputData) {
  process.exit(0);
}

const AUDIT_DIR = path.join(PROJECT_DIR, '.claude/audit');
fs.mkdirSync(AUDIT_DIR, { recursive: true });

// Rotate audit files monthly
const now = new Date();
const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const AUDIT_FILE = path.join(AUDIT_DIR, `audit-${yearMonth}.jsonl`);

// Stop hooks use hook_event_name; custom invocations use event_type
const EVENT_TYPE = inputData.event_type || inputData.hook_event_name || 'unknown';
const timestamp = new Date().toISOString();
const SESSION_ID = inputData.session_id || 'unknown';

let auditEntry = null;

// ── SESSION STOP (fired by Claude Code Stop hook) ─────────────────────
if (EVENT_TYPE === 'Stop') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'session_end',
    cwd: inputData.cwd || '',
    permission_mode: inputData.permission_mode || ''
  };
}

// ── PERMISSION DECISION ────────────────────────────────────────────────
else if (EVENT_TYPE === 'permission') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'permission',
    command: inputData.command || '',
    decision: inputData.decision || '',
    tier: inputData.tier || '',
    reason: inputData.reason || ''
  };
}

// ── DEBATE RULING ──────────────────────────────────────────────────────
else if (EVENT_TYPE === 'debate') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'debate',
    debate_type: inputData.debate_type || '',
    item: inputData.item || '',
    ruling: inputData.ruling || '',
    severity: inputData.severity || '',
    judge: inputData.judge || '',
    feature: inputData.feature || ''
  };
}

// ── VERIFICATION RESULT ────────────────────────────────────────────────
else if (EVENT_TYPE === 'verification') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'verification',
    feature: inputData.feature || '',
    verdict: inputData.verdict || '',
    evidence: inputData.evidence || '',
    agent: inputData.agent || 'verification-enforcer'
  };
}

// ── ESCALATION ─────────────────────────────────────────────────────────
else if (EVENT_TYPE === 'escalation') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'escalation',
    source: inputData.source || '',
    severity: inputData.severity || '',
    reason: inputData.reason || '',
    resolution: inputData.resolution || 'pending'
  };
}

// ── AGENT DISPATCH ─────────────────────────────────────────────────────
else if (EVENT_TYPE === 'dispatch') {
  auditEntry = {
    timestamp,
    session: SESSION_ID,
    type: 'dispatch',
    agent: inputData.agent || '',
    task: inputData.task || '',
    pipeline: inputData.pipeline || '',
    phase: inputData.phase || ''
  };
}

// ── QUERY (read audit log) ────────────────────────────────────────────
else if (EVENT_TYPE === 'query') {
  const filterType = inputData.filter_type || '';
  const filterFeature = inputData.filter_feature || '';
  const limit = inputData.limit || '50';

  console.log('=== Audit Trail ===');

  if (!fs.existsSync(AUDIT_FILE)) {
    console.log('No audit log found');
    process.exit(0);
  }

  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  const lines = content.split('\n').filter(l => l.length > 0);

  let filteredLines = [];

  if (filterType) {
    filteredLines = lines.filter(l => {
      try {
        const entry = JSON.parse(l);
        return entry.type === filterType;
      } catch {
        return false;
      }
    });
  } else if (filterFeature) {
    filteredLines = lines.filter(l => {
      try {
        const entry = JSON.parse(l);
        return entry.feature === filterFeature;
      } catch {
        return false;
      }
    });
  } else {
    filteredLines = lines;
  }

  const limitNum = parseInt(limit, 10);
  const displayLines = filteredLines.slice(-limitNum);

  for (const line of displayLines) {
    try {
      const entry = JSON.parse(line);
      let output = `${entry.timestamp} [${entry.type}] `;

      if (entry.type === 'permission') {
        output += `${entry.decision}: ${entry.command} (tier: ${entry.tier})`;
      } else if (entry.type === 'debate') {
        output += `${entry.ruling}: ${entry.item} (judge: ${entry.judge}, severity: ${entry.severity})`;
      } else if (entry.type === 'verification') {
        output += `${entry.verdict}: ${entry.feature} (agent: ${entry.agent})`;
      } else if (entry.type === 'escalation') {
        output += `${entry.severity}: ${entry.reason} (source: ${entry.source})`;
      } else if (entry.type === 'dispatch') {
        output += `${entry.agent} → ${entry.task} (pipeline: ${entry.pipeline}, phase: ${entry.phase})`;
      } else if (entry.type === 'session_end') {
        output += `session ended (cwd: ${entry.cwd}, mode: ${entry.permission_mode})`;
      } else {
        output += 'unknown event';
      }

      console.log(output);
    } catch {
      // ignore malformed lines
    }
  }

  process.exit(0);
}

// Write audit entry if not a query
if (auditEntry) {
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(auditEntry) + '\n');
  process.exit(0);
}

// Silently ignore unrecognized event types (e.g. session stop)
process.exit(0);
