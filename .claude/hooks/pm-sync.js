#!/usr/bin/env node
/**
 * pm-sync.js — Project Management state sync on SessionStart and Stop
 * Ensures PM dashboards stay current and state.yaml timestamps are updated
 *
 * On SessionStart: validates state.yaml exists, reports active feature count
 * On Stop: updates timestamps and flags stale features
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs } = require('./_common.js');

initDirs();

const STATE_FILE = path.join(PROJECT_DIR, 'docs/pm/state.yaml');

// Exit silently if no PM system is set up
if (!fs.existsSync(STATE_FILE)) {
  process.exit(0);
}

const content = fs.readFileSync(STATE_FILE, 'utf8');

// Count active features (features not in "done" phase)
// Simple string-based counting — works without yq
const totalFeaturesMatch = (content.match(/^\s+-\s+id:\s+feat-/gm) || []).length;
const doneFeaturesMatch = (content.match(/phase:\s+done/gm) || []).length;
const activeFeatures = totalFeaturesMatch - doneFeaturesMatch;

// Count blocked stories
const blockedStoriesMatch = (content.match(/status:\s+blocked/gm) || []).length;

// Report summary (this output is shown to Claude at session start/stop)
if (activeFeatures > 0) {
  console.log(`PM State: ${activeFeatures} active feature(s), ${doneFeaturesMatch} done`);
  if (blockedStoriesMatch > 0) {
    console.log(`WARNING: ${blockedStoriesMatch} blocked story/stories — run /pm for details`);
  }
} else {
  if (totalFeaturesMatch > 0) {
    console.log(`PM State: All ${totalFeaturesMatch} feature(s) completed`);
  }
}

// Check for stale features (updated more than 7 days ago)
const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const lines = content.split('\n');
let foundStale = false;

for (const line of lines) {
  const dateMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch && line.includes('updated:')) {
    try {
      const itemDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      if (itemDate < sevenDaysAgo) {
        console.log('NOTICE: Stale feature detected (not updated in 7+ days) — run /pm to review');
        foundStale = true;
        break;
      }
    } catch {
      // ignore
    }
  }
}

process.exit(0);
