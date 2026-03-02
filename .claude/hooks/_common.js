#!/usr/bin/env node
/**
 * _common.js — Shared bootstrap for all ForgeBee hook scripts
 * Sources this at the top of every hook to get consistent path resolution
 * Works in both plugin install and legacy install contexts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Resolve project directory ─────────────────────────────────────────
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || '.';

// ── Resolve plugin root (only set when running as a plugin) ───────────
// CLAUDE_PLUGIN_ROOT is set by Claude Code when running plugin hooks
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || '';

/**
 * Ensure project-level directories exist
 * When installed as a plugin, these won't exist until first run
 */
function initDirs() {
  const dirs = [
    '.claude/sessions',
    '.claude/session-cache/context-backups',
    '.claude/learnings',
    '.claude/checkpoints',
    '.claude/audit',
    'docs/pm/features',
    'docs/planning/briefs',
    'docs/planning/requirements',
    'docs/planning/stories'
  ];

  for (const d of dirs) {
    const fullPath = path.join(PROJECT_DIR, d);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Init learnings.md if missing
  const learningsFile = path.join(PROJECT_DIR, '.claude/learnings/learnings.md');
  if (!fs.existsSync(learningsFile)) {
    fs.writeFileSync(learningsFile, '# Project Learnings\n\nAuto-captured patterns, insights, and useful commands from Claude Code sessions.\n\n---\n\n');
  }

  // Init permissions.json if missing
  const permsFile = path.join(PROJECT_DIR, '.claude/session-cache/permissions.json');
  if (!fs.existsSync(permsFile)) {
    fs.writeFileSync(permsFile, '{}');
  }
}

/**
 * Returns the directory where ForgeBee resources (templates, skills) live
 * Plugin install: $CLAUDE_PLUGIN_ROOT
 * Legacy install: $CLAUDE_PROJECT_DIR (resources are in .claude/)
 */
function findForgebeeRoot() {
  if (PLUGIN_ROOT) {
    return PLUGIN_ROOT;
  }
  return PROJECT_DIR;
}

/**
 * Find commands directory
 */
function findCommandsDir() {
  if (PLUGIN_ROOT && fs.existsSync(path.join(PLUGIN_ROOT, 'commands'))) {
    return path.join(PLUGIN_ROOT, 'commands');
  }
  if (fs.existsSync(path.join(PROJECT_DIR, '.claude/commands'))) {
    return path.join(PROJECT_DIR, '.claude/commands');
  }
  return '';
}

/**
 * Find all valid skills directories
 */
function findSkillsDirs() {
  const dirs = [];

  // Plugin skills
  if (PLUGIN_ROOT && fs.existsSync(path.join(PLUGIN_ROOT, 'skills'))) {
    dirs.push(path.join(PLUGIN_ROOT, 'skills'));
  }

  // Project-level skills
  if (fs.existsSync(path.join(PROJECT_DIR, '.claude/skills'))) {
    dirs.push(path.join(PROJECT_DIR, '.claude/skills'));
  }

  // Global user skills
  const homeDir = process.env.HOME || '/root';
  if (fs.existsSync(path.join(homeDir, '.claude/skills'))) {
    dirs.push(path.join(homeDir, '.claude/skills'));
  }

  // Legacy .skills location
  if (fs.existsSync(path.join(PROJECT_DIR, '.skills/skills'))) {
    dirs.push(path.join(PROJECT_DIR, '.skills/skills'));
  }

  return dirs;
}

/**
 * Read stdin synchronously
 */
function readStdinSync() {
  try {
    return fs.readFileSync('/dev/stdin', 'utf8');
  } catch {
    return '';
  }
}

/**
 * Read stdin asynchronously (for node-style async)
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Run git command with error handling
 */
function runGit(args) {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf8',
      cwd: PROJECT_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return '';
  }
}

module.exports = {
  PROJECT_DIR,
  PLUGIN_ROOT,
  initDirs,
  findForgebeeRoot,
  findCommandsDir,
  findSkillsDirs,
  readStdinSync,
  readStdin,
  readJsonFile,
  runGit
};
