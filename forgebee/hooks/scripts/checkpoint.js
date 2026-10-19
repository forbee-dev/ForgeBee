#!/usr/bin/env node
/**
 * checkpoint.js - Phase-level checkpointing for durability
 * Saves workflow/growth pipeline state at each phase transition
 * Enables crash recovery: resume from last completed phase instead of restarting
 */

const fs = require('fs');
const path = require('path');
const { getProjectDir, initializeProjectDirs, readStdinJsonSync } = require('./_common.js');
const PROJECT_DIR = getProjectDir();

// Wired as a PreCompact lifecycle hook (forgebee/hooks/hooks.json) — it must never
// fail the event. Any error (missing/unparseable state, I/O) exits 0.
process.on('uncaughtException', () => process.exit(0));

// When invoked as a lifecycle hook (no explicit feature in stdin), derive the
// active pipeline + phase from the PM state so the auto-save is meaningful.
// Returns the most-recently-updated non-done feature, or null if none is active.
function deriveActiveFeatureFromState() {
  try {
    const stateFile = path.join(PROJECT_DIR, 'docs', 'pm', 'state.yaml');
    if (!fs.existsSync(stateFile)) return null;
    const content = fs.readFileSync(stateFile, 'utf8');
    const blocks = content.split(/\n  - id: /).slice(1); // each feature block
    let best = null;
    for (const raw of blocks) {
      const block = '  - id: ' + raw;
      const idM = block.match(/^  - id:\s*(\S+)/);
      const nameM = block.match(/^ {4}name:\s*"?(.+?)"?\s*$/m);
      const originM = block.match(/^ {4}origin:\s*(\S+)/m);
      const updatedM = block.match(/^ {4}updated:\s*"?(\S+?)"?\s*$/m);
      // feature-level phase lines are indented 4 spaces; last one wins (YAML semantics)
      const phaseMatches = [...block.matchAll(/^ {4}phase:\s*(\S+)/gm)];
      if (!idM || phaseMatches.length === 0) continue;
      const phase = phaseMatches[phaseMatches.length - 1][1];
      if (phase === 'done') continue;
      const updated = updatedM ? updatedM[1] : '';
      const entry = {
        feature: nameM ? nameM[1] : idM[1],
        phase,
        pipeline: originM ? originM[1] : 'workflow',
        updated,
      };
      if (!best || (updated && updated > best.updated)) best = entry;
    }
    return best;
  } catch {
    return null;
  }
}

initializeProjectDirs();

const inputData = readStdinJsonSync() || {};

const CHECKPOINT_DIR = path.join(PROJECT_DIR, '.claude/checkpoints');
fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });

const ACTION = inputData.action || 'save';

// ── SAVE ACTION ───────────────────────────────────────────────────────
if (ACTION === 'save') {
  // Lifecycle-hook invocation (e.g. PreCompact) carries no explicit feature —
  // derive the active pipeline/phase from PM state, or skip if nothing is in progress.
  let derived = null;
  if (!inputData.feature && !inputData.pipeline) {
    derived = deriveActiveFeatureFromState();
    if (!derived) process.exit(0);
  }
  const pipeline = inputData.pipeline || (derived && derived.pipeline) || 'workflow';
  const feature = inputData.feature || (derived && derived.feature) || 'unknown';
  const phase = inputData.phase || (derived && derived.phase) || 'unknown';
  const phaseNum = inputData.phase_number || 0;
  const status = inputData.status || (derived ? 'in-progress' : 'completed');
  const artifacts = inputData.artifacts || [];
  const timestamp = new Date().toISOString();

  // Sanitize feature name for filename
  const safeFeature = feature
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const checkpointFile = path.join(CHECKPOINT_DIR, `${pipeline}-${safeFeature}.json`);

  let existing = null;

  if (fs.existsSync(checkpointFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
    } catch {
      existing = null;
    }
  }

  if (!existing) {
    existing = {
      pipeline,
      feature,
      started: timestamp,
      phases: [],
      current_phase: 0,
      status: 'in-progress'
    };
  }

  // Add new phase
  existing.phases.push({
    name: phase,
    number: phaseNum,
    status,
    completed_at: timestamp,
    artifacts
  });

  existing.current_phase = phaseNum;
  existing.last_updated = timestamp;
  // load and cleanup key off 'done'; 'completed' was stored as in-progress and never matched.
  existing.status = status === 'failed' ? 'needs-recovery'
    : (status === 'completed' || status === 'done') ? 'done'
    : 'in-progress';
  // PreCompact appends a phase per compaction; bound the file.
  if (existing.phases.length > 50) existing.phases = existing.phases.slice(-50);

  fs.writeFileSync(checkpointFile, JSON.stringify(existing, null, 2));

  console.log(`Checkpoint saved: ${pipeline}/${feature} - Phase ${phaseNum} (${phase}) ${status}`);
}

// ── LOAD ACTION ────────────────────────────────────────────────────────
else if (ACTION === 'load') {
  const pipeline = inputData.pipeline || 'workflow';
  const feature = inputData.feature || 'unknown';

  const safeFeature = feature
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const checkpointFile = path.join(CHECKPOINT_DIR, `${pipeline}-${safeFeature}.json`);

  if (fs.existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      const cpStatus = checkpoint.status;
      const current = checkpoint.current_phase;
      const lastPhase = checkpoint.phases.length > 0
        ? checkpoint.phases[checkpoint.phases.length - 1].name
        : 'none';
      const lastStatus = checkpoint.phases.length > 0
        ? checkpoint.phases[checkpoint.phases.length - 1].status
        : 'none';

      console.log('=== Pipeline Checkpoint Found ===');
      console.log(`Pipeline: ${pipeline}`);
      console.log(`Feature: ${feature}`);
      console.log(`Status: ${cpStatus}`);
      console.log(`Last completed phase: ${current} (${lastPhase}) - ${lastStatus}`);
      console.log('');

      if (cpStatus === 'needs-recovery') {
        console.log('WARNING: RECOVERY NEEDED - Phase ' + lastPhase + ' failed.');
        console.log(`Recommendation: Resume from phase ${current}`);
      } else if (cpStatus === 'in-progress') {
        const next = current + 1;
        console.log(`Resume from phase ${next} (last completed: ${lastPhase})`);
      } else if (cpStatus === 'done') {
        console.log('Pipeline completed. No recovery needed.');
      }

      console.log('');
      console.log('=== Phase History ===');
      for (const p of checkpoint.phases) {
        console.log(`  Phase ${p.number}: ${p.name} - ${p.status} at ${p.completed_at}`);
      }
    } catch (err) {
      console.log(`Error loading checkpoint: ${err.message}`);
    }
  } else {
    console.log(`No checkpoint found for ${pipeline}/${feature}`);
    console.log('Starting fresh from Phase 1');
  }
}

// ── LIST ACTION ────────────────────────────────────────────────────────
else if (ACTION === 'list') {
  console.log('=== Active Pipeline Checkpoints ===');

  const files = fs.readdirSync(CHECKPOINT_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const checkpoint = JSON.parse(
        fs.readFileSync(path.join(CHECKPOINT_DIR, file), 'utf8')
      );
      const pipeline = checkpoint.pipeline;
      const feature = checkpoint.feature;
      const cpStatus = checkpoint.status;
      const phase = checkpoint.current_phase;
      const updated = checkpoint.last_updated || 'unknown';

      console.log(`  [${cpStatus}] ${pipeline}: ${feature} - Phase ${phase} (updated: ${updated})`);
    } catch {
      // ignore malformed files
    }
  }
}

// ── CLEANUP ACTION ─────────────────────────────────────────────────────
else if (ACTION === 'cleanup') {
  const files = fs.readdirSync(CHECKPOINT_DIR).filter(f => f.endsWith('.json'));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const file of files) {
    const filePath = path.join(CHECKPOINT_DIR, file);
    const stat = fs.statSync(filePath);

    if (stat.mtime < sevenDaysAgo) {
      try {
        const checkpoint = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (checkpoint.status === 'done') {
          fs.unlinkSync(filePath);
          console.log(`Cleaned: ${file}`);
        }
      } catch {
        // ignore
      }
    }
  }
}

// ── UNKNOWN ACTION ─────────────────────────────────────────────────────
else {
  console.error(`Unknown action: ${ACTION} (expected: save, load, list, cleanup)`);
  process.exit(1);
}

process.exit(0);
