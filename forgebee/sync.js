#!/usr/bin/env node
/**
 * sync.js — Manifest-driven sync from forgebee/ (canonical) to .claude/ (legacy)
 *
 * Usage:
 *   node forgebee/sync.js                  # Sync with dry-run safety prompt
 *   node forgebee/sync.js --dry-run        # Show what would change
 *   node forgebee/sync.js --force          # Overwrite everything without prompts
 *   node forgebee/sync.js --verify         # Check if .claude/ is in sync (exit 1 if drift)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(path.dirname(__filename), '..');
const FORGEBEE = path.join(ROOT, 'forgebee');
const CLAUDE = path.join(ROOT, '.claude');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const VERIFY = args.includes('--verify');

// ── Manifest: source → target mappings ────────────────────────────────
const MANIFEST = [
  {
    source: 'forgebee/agents/*.md',
    target: '.claude/agents/',
    transform: 'copy',
  },
  {
    source: 'forgebee/commands/*.md',
    target: '.claude/commands/',
    transform: 'copy',
  },
  {
    source: 'forgebee/hooks/scripts/*.js',
    target: '.claude/hooks/',
    transform: 'flatten', // strips scripts/ nesting
  },
];

// Files that should NOT be synced (forgebee-only)
const IGNORE = [
  'forgebee/.claude-plugin/',
  'forgebee/eval/',
  'forgebee/rules/',
  'forgebee/contexts/',
  'forgebee/templates/',
  'forgebee/skills/',
  'forgebee/CONNECTORS.md',
  'forgebee/README.md',
];

function sha256(filepath) {
  try {
    const content = fs.readFileSync(filepath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

function globFiles(pattern) {
  const dir = path.join(ROOT, path.dirname(pattern));
  const globPart = path.basename(pattern);
  // Convert glob to regex: *.md → ^.*\.md$
  const regex = new RegExp('^' + globPart.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => regex.test(f))
    .map(f => path.join(dir, f));
}

function resolveTarget(sourcePath, rule) {
  const filename = path.basename(sourcePath);
  const targetDir = path.join(ROOT, rule.target);
  return path.join(targetDir, filename);
}

// ── Main sync logic ───────────────────────────────────────────────────
let synced = 0;
let skipped = 0;
let errors = 0;
let drifted = 0;

console.log(`ForgeBee Sync — ${DRY_RUN ? 'DRY RUN' : VERIFY ? 'VERIFY' : FORCE ? 'FORCE' : 'SYNC'}`);
console.log('='.repeat(50));

for (const rule of MANIFEST) {
  const sourceFiles = globFiles(rule.source);

  for (const sourcePath of sourceFiles) {
    const targetPath = resolveTarget(sourcePath, rule);
    const relSource = path.relative(ROOT, sourcePath);
    const relTarget = path.relative(ROOT, targetPath);

    const sourceHash = sha256(sourcePath);
    const targetHash = sha256(targetPath);

    if (sourceHash === targetHash) {
      // In sync
      continue;
    }

    if (!targetHash) {
      // Target doesn't exist — always sync
      if (VERIFY) {
        console.log(`  MISSING: ${relTarget} (source: ${relSource})`);
        drifted++;
        continue;
      }
      if (DRY_RUN) {
        console.log(`  ADD: ${relTarget}`);
        synced++;
        continue;
      }
      const targetDir = path.dirname(targetPath);
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  ADD: ${relTarget}`);
        synced++;
      } catch (e) {
        console.error(`  ERROR: ${relTarget} — ${e.message}`);
        errors++;
      }
      continue;
    }

    // Target exists but differs
    if (VERIFY) {
      console.log(`  DRIFT: ${relTarget} differs from ${relSource}`);
      drifted++;
      continue;
    }

    // Check if target is newer (user may have edited it)
    const sourceMtime = fs.statSync(sourcePath).mtimeMs;
    const targetMtime = fs.statSync(targetPath).mtimeMs;

    if (targetMtime > sourceMtime && !FORCE) {
      console.log(`  SKIP: ${relTarget} (newer than source — use --force to overwrite)`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  UPDATE: ${relTarget}`);
      synced++;
      continue;
    }

    try {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  UPDATE: ${relTarget}`);
      synced++;
    } catch (e) {
      console.error(`  ERROR: ${relTarget} — ${e.message}`);
      errors++;
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────
console.log('');
if (VERIFY) {
  if (drifted === 0) {
    console.log('All files in sync.');
    process.exit(0);
  } else {
    console.log(`${drifted} file(s) out of sync.`);
    process.exit(1);
  }
} else {
  console.log(`${synced} file(s) ${DRY_RUN ? 'would be ' : ''}synced, ${skipped} skipped, ${errors} error(s).`);
}
