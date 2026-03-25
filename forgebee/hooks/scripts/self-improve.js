#!/usr/bin/env node
/**
 * self-improve.js — Capture learnings and patterns on session Stop
 * Appends insights to learnings.md + structured index.jsonl for querying
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, initializeProjectDirs, readStdinJsonSync, runGit } = require('./_common.js');

const PROJECT_DIR = getProjectDir();
initializeProjectDirs();

const input = readStdinJsonSync();
const inputData = input || {};

// Prevent infinite loop
if (inputData.stop_hook_active === true) {
  process.exit(0);
}

const LEARNINGS_DIR = path.join(PROJECT_DIR, '.claude/learnings');
const LEARNINGS_FILE = path.join(LEARNINGS_DIR, 'learnings.md');
const INDEX_FILE = path.join(LEARNINGS_DIR, 'index.jsonl');

fs.mkdirSync(LEARNINGS_DIR, { recursive: true });

const timestamp = new Date().toISOString();

const sessionId = inputData.session_id || 'unknown';

// Gather what happened this session
let gitDiffStat = '';
let filesChanged = '';
const topics = [];

try {
  if (runGit('rev-parse --is-inside-work-tree')) {
    const diffStat = runGit('diff --stat HEAD~1');
    if (diffStat) {
      gitDiffStat = diffStat.split('\n').pop() || '';
    }

    const diffs = runGit('diff --name-only HEAD~1');
    filesChanged = diffs.split('\n').slice(0, 20).filter(f => f.length > 0).join(',');

    // Auto-detect topics from changed files
    if (/test|spec|__test/i.test(filesChanged)) topics.push('testing');
    if (/auth|login|session|token/i.test(filesChanged)) topics.push('auth');
    if (/api|route|endpoint|controller/i.test(filesChanged)) topics.push('api');
    if (/migration|schema|model|database/i.test(filesChanged)) topics.push('database');
    if (/component|page|layout|style|css/i.test(filesChanged)) topics.push('frontend');
    if (/deploy|docker|ci|cd|pipeline/i.test(filesChanged)) topics.push('devops');
    if (/security|audit|permission|rbac/i.test(filesChanged)) topics.push('security');
    if (/marketing|brand|content|seo/i.test(filesChanged)) topics.push('marketing');
    if (/hook|agent|command|workflow/i.test(filesChanged)) topics.push('forgebee');
  }
} catch {
  // not a git repo
}

// Check permission cache for new entries
const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/permissions.json');
let newPermissions = '';
if (fs.existsSync(CACHE_FILE)) {
  try {
    const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const keys = Object.keys(cacheData).slice(0, 5);
    newPermissions = keys.join(', ');
  } catch {
    // ignore
  }
}

// Check for active pipeline context
let pipelineContext = '';
const checkpointDir = path.join(PROJECT_DIR, '.claude/checkpoints');
if (fs.existsSync(checkpointDir)) {
  const files = fs.readdirSync(checkpointDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(path.join(checkpointDir, f), 'utf8'));
      if (checkpoint.status === 'in-progress') {
        const pipeline = checkpoint.pipeline || 'unknown';
        const feature = checkpoint.feature || 'unknown';
        const phase = checkpoint.current_phase || '?';
        pipelineContext = `${pipeline}/${feature} (phase ${phase})`;
        break;
      }
    } catch {
      // ignore
    }
  }
}

const topicsStr = topics.join(',');

// ── Append to human-readable learnings.md ──────────────────────────────
let learningsEntry = `### Session: ${timestamp}\n`;
learningsEntry += `- Session ID: \`${sessionId}\`\n`;
if (gitDiffStat) {
  learningsEntry += `- Changes: ${gitDiffStat}\n`;
}
if (filesChanged) {
  learningsEntry += `- Files: ${filesChanged}\n`;
}
if (topicsStr) {
  learningsEntry += `- Topics: ${topicsStr}\n`;
}
if (newPermissions) {
  learningsEntry += `- Permission patterns learned: ${newPermissions}\n`;
}
if (pipelineContext) {
  learningsEntry += `- Pipeline: ${pipelineContext}\n`;
}
learningsEntry += '\n';

if (fs.existsSync(LEARNINGS_FILE)) {
  fs.appendFileSync(LEARNINGS_FILE, learningsEntry);
} else {
  fs.writeFileSync(LEARNINGS_FILE, learningsEntry);
}

// ── Append to structured index (JSONL for fast querying) ───────────────
const indexEntry = {
  timestamp,
  session: sessionId,
  changes: gitDiffStat,
  files: filesChanged.split(',').filter(f => f.length > 0),
  topics: topicsStr.split(',').filter(t => t.length > 0),
  permissions: newPermissions,
  pipeline: pipelineContext
};

fs.appendFileSync(INDEX_FILE, JSON.stringify(indexEntry) + '\n');

// Trim learnings file if it gets too long (keep last 200 lines + header)
if (fs.existsSync(LEARNINGS_FILE)) {
  const content = fs.readFileSync(LEARNINGS_FILE, 'utf8');
  const lines = content.split('\n');

  if (lines.length > 250) {
    const header = lines.slice(0, 6).join('\n');
    const recent = lines.slice(-200).join('\n');

    let trimmedContent = header + '\n\n';
    trimmedContent += '*[Older entries archived — see index.jsonl for full history]*\n\n';
    trimmedContent += recent;

    fs.writeFileSync(LEARNINGS_FILE, trimmedContent);
  }
}

// Trim index if over 500 entries (keep most recent)
if (fs.existsSync(INDEX_FILE)) {
  const content = fs.readFileSync(INDEX_FILE, 'utf8');
  const lines = content.split('\n').filter(l => l.length > 0);

  if (lines.length > 500) {
    const recentLines = lines.slice(-400);
    fs.writeFileSync(INDEX_FILE, recentLines.join('\n') + '\n');
  }
}

// ── S-008: Lightweight pattern heuristics (no API calls) ──────────────
// Analyze session observations and flag candidate patterns
try {
  const observationsDir = path.join(require('os').homedir(), '.claude/forgebee-learning/projects');
  if (fs.existsSync(observationsDir)) {
    const PENDING_FILE = path.join(PROJECT_DIR, '.claude/learnings/pending-instincts.jsonl');
    const projects = fs.readdirSync(observationsDir).filter(d =>
      fs.existsSync(path.join(observationsDir, d, 'observations.jsonl'))
    );

    for (const proj of projects) {
      const obsFile = path.join(observationsDir, proj, 'observations.jsonl');
      const content = fs.readFileSync(obsFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);

      // Only analyze last 1000 lines for performance
      const recentLines = lines.slice(-1000);
      const observations = [];
      for (const line of recentLines) {
        try { observations.push(JSON.parse(line)); } catch { /* skip */ }
      }

      if (observations.length < 5) continue;

      // Heuristic 1: Bash commands repeated 3+ times
      const bashCmds = {};
      for (const obs of observations) {
        if (obs.tool === 'Bash' && obs.event === 'tool_complete' && obs.input) {
          const cmd = (obs.input.command || '').split(/\s+/).slice(0, 3).join(' ');
          if (cmd.length > 2) bashCmds[cmd] = (bashCmds[cmd] || 0) + 1;
        }
      }

      // Heuristic 2: Same file edited 3+ times
      const fileEdits = {};
      for (const obs of observations) {
        if (obs.tool === 'Edit' && obs.event === 'tool_complete' && obs.input?.file_path) {
          const fp = obs.input.file_path;
          fileEdits[fp] = (fileEdits[fp] || 0) + 1;
        }
      }

      // Load existing pending instincts for dedup
      let pending = {};
      if (fs.existsSync(PENDING_FILE)) {
        const pLines = fs.readFileSync(PENDING_FILE, 'utf8').split('\n').filter(l => l.trim());
        for (const l of pLines) {
          try {
            const entry = JSON.parse(l);
            pending[entry.signal] = entry;
          } catch { /* skip */ }
        }
      }

      let changed = false;

      // Write candidates for repeated bash commands
      for (const [cmd, count] of Object.entries(bashCmds)) {
        if (count >= 3) {
          const signal = `bash-repeat:${cmd}`;
          if (pending[signal]) {
            pending[signal].sessions_seen = (pending[signal].sessions_seen || 1) + 1;
            pending[signal].confidence = Math.min(0.9, 0.3 + pending[signal].sessions_seen * 0.1);
          } else {
            pending[signal] = {
              id: `cmd-${cmd.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
              type: 'command-repeat',
              signal,
              confidence: 0.3,
              sessions_seen: 1,
              status: 'pending',
              created_at: new Date().toISOString()
            };
          }
          changed = true;
        }
      }

      // Write candidates for repeatedly edited files
      for (const [fp, count] of Object.entries(fileEdits)) {
        if (count >= 3) {
          const relPath = fp.startsWith('/') ? path.relative(PROJECT_DIR, fp) : fp;
          const signal = `file-repeat:${relPath}`;
          if (pending[signal]) {
            pending[signal].sessions_seen = (pending[signal].sessions_seen || 1) + 1;
            pending[signal].confidence = Math.min(0.9, 0.3 + pending[signal].sessions_seen * 0.1);
          } else {
            pending[signal] = {
              id: `file-${path.basename(fp).replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
              type: 'file-repeat',
              signal,
              confidence: 0.3,
              sessions_seen: 1,
              status: 'pending',
              created_at: new Date().toISOString()
            };
          }
          changed = true;
        }
      }

      // Write back pending instincts
      if (changed) {
        const entries = Object.values(pending)
          .filter(e => e.status !== 'rejected')
          .map(e => JSON.stringify(e))
          .join('\n');
        fs.writeFileSync(PENDING_FILE, entries + '\n');
      }
    }
  }
} catch (e) {
  // Heuristics are best-effort — never block session end
}

process.exit(0);
