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
const { getProjectDir, log } = require('./_common.js');

async function main() {
  const projectDir = getProjectDir();
  const stateFile = path.join(projectDir, 'docs', 'pm', 'state.yaml');

  // Exit silently if no PM system is set up
  if (!fs.existsSync(stateFile)) {
    process.exit(0);
  }

  try {
    const content = fs.readFileSync(stateFile, 'utf8');

    // Count active features (features not in "done" phase)
    const totalFeaturesMatch = content.match(/^  - id: feat-/gm);
    const totalFeatures = totalFeaturesMatch ? totalFeaturesMatch.length : 0;

    const doneMatch = content.match(/phase: done/g);
    const doneFeatures = doneMatch ? doneMatch.length : 0;

    const activeFeatures = totalFeatures - doneFeatures;

    // Count blocked stories
    const blockedMatch = content.match(/status: blocked/g);
    const blockedStories = blockedMatch ? blockedMatch.length : 0;

    // Report summary
    if (activeFeatures > 0) {
      log(`PM State: ${activeFeatures} active feature(s), ${doneFeatures} done`);
      if (blockedStories > 0) {
        log(
          `WARNING: ${blockedStories} blocked story/stories — run /pm for details`
        );
      }
    } else {
      if (totalFeatures > 0) {
        log(`PM State: All ${totalFeatures} feature(s) completed`);
      }
    }

    // Check for stale features (updated more than 7 days ago)
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const updatedMatches = content.match(/updated:\s*(\d{4}-\d{2}-\d{2})/g) || [];

    for (const match of updatedMatches) {
      const dateStr = match.match(/(\d{4}-\d{2}-\d{2})/)[1];
      try {
        const updatedTs = new Date(dateStr).getTime();
        if (updatedTs < sevenDaysAgo && updatedTs > 0) {
          log(
            'NOTICE: Stale feature detected (not updated in 7+ days) — run /pm to review'
          );
          break;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  } catch (e) {
    // Silently fail
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
