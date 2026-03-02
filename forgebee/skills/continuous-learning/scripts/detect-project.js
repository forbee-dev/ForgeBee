#!/usr/bin/env node
/**
 * detect-project.js
 * Detects current project context for continuous learning.
 * Returns project ID (hash), name, root path, and storage directories.
 * 
 * Detection priority:
 *   1. CLAUDE_PROJECT_DIR env var
 *   2. git remote URL (hashed — portable across machines)
 *   3. git repo root path (fallback — machine-specific)
 *   4. "global" fallback (no project detected)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

const LEARNING_DIR = path.join(os.homedir(), '.claude', 'forgebee-learning');
const PROJECTS_DIR = path.join(LEARNING_DIR, 'projects');
const REGISTRY_FILE = path.join(LEARNING_DIR, 'projects.json');

// Global (non-project-scoped) paths
const GLOBAL_INSTINCTS_DIR = path.join(LEARNING_DIR, 'instincts');
const GLOBAL_PERSONAL_DIR = path.join(GLOBAL_INSTINCTS_DIR, 'personal');
const GLOBAL_INHERITED_DIR = path.join(GLOBAL_INSTINCTS_DIR, 'inherited');
const GLOBAL_EVOLVED_DIR = path.join(LEARNING_DIR, 'evolved');
const GLOBAL_OBSERVATIONS_FILE = path.join(LEARNING_DIR, 'observations.jsonl');

function ensureDir(dirPath) {
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch (e) { /* ignore */ }
}

function ensureGlobalDirs() {
  [
    GLOBAL_PERSONAL_DIR,
    GLOBAL_INHERITED_DIR,
    path.join(GLOBAL_EVOLVED_DIR, 'skills'),
    path.join(GLOBAL_EVOLVED_DIR, 'commands'),
    path.join(GLOBAL_EVOLVED_DIR, 'agents'),
    PROJECTS_DIR,
  ].forEach(d => ensureDir(d));
}

function runGit(args, cwd) {
  try {
    const cmd = cwd ? `git -C "${cwd}" ${args}` : `git ${args}`;
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch (e) {
    return '';
  }
}

function updateRegistry(pid, pname, proot, premote) {
  let registry = {};
  try {
    registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch (e) { /* new registry */ }

  registry[pid] = {
    name: pname,
    root: proot,
    remote: premote,
    last_seen: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  ensureDir(path.dirname(REGISTRY_FILE));
  const tmpFile = REGISTRY_FILE + '.tmp.' + process.pid;
  fs.writeFileSync(tmpFile, JSON.stringify(registry, null, 2));
  fs.renameSync(tmpFile, REGISTRY_FILE);
}

function detectProject(overrideCwd) {
  let projectRoot = '';

  // 1. CLAUDE_PROJECT_DIR env var
  const envDir = overrideCwd || process.env.CLAUDE_PROJECT_DIR;
  if (envDir && fs.existsSync(envDir)) {
    projectRoot = path.resolve(envDir);
  }

  // 2. git repo root
  if (!projectRoot) {
    const gitRoot = runGit('rev-parse --show-toplevel');
    if (gitRoot) {
      projectRoot = gitRoot;
    }
  }

  // 3. No project — global fallback
  if (!projectRoot) {
    return {
      id: 'global',
      name: 'global',
      root: '',
      remote: '',
      project_dir: LEARNING_DIR,
      instincts_personal: GLOBAL_PERSONAL_DIR,
      instincts_inherited: GLOBAL_INHERITED_DIR,
      evolved_dir: GLOBAL_EVOLVED_DIR,
      observations_file: GLOBAL_OBSERVATIONS_FILE,
    };
  }

  const projectName = path.basename(projectRoot);

  // Derive project ID from git remote URL or path
  const remoteUrl = runGit('remote get-url origin', projectRoot);
  const hashSource = remoteUrl || projectRoot;
  const projectId = crypto.createHash('sha256').update(hashSource).digest('hex').slice(0, 12);

  const projectDir = path.join(PROJECTS_DIR, projectId);

  // Ensure project directory structure
  [
    path.join(projectDir, 'instincts', 'personal'),
    path.join(projectDir, 'instincts', 'inherited'),
    path.join(projectDir, 'observations.archive'),
    path.join(projectDir, 'evolved', 'skills'),
    path.join(projectDir, 'evolved', 'commands'),
    path.join(projectDir, 'evolved', 'agents'),
  ].forEach(d => ensureDir(d));

  // Update registry
  updateRegistry(projectId, projectName, projectRoot, remoteUrl);

  return {
    id: projectId,
    name: projectName,
    root: projectRoot,
    remote: remoteUrl,
    project_dir: projectDir,
    instincts_personal: path.join(projectDir, 'instincts', 'personal'),
    instincts_inherited: path.join(projectDir, 'instincts', 'inherited'),
    evolved_dir: path.join(projectDir, 'evolved'),
    observations_file: path.join(projectDir, 'observations.jsonl'),
  };
}

// Export for use by other scripts
module.exports = {
  LEARNING_DIR,
  PROJECTS_DIR,
  REGISTRY_FILE,
  GLOBAL_INSTINCTS_DIR,
  GLOBAL_PERSONAL_DIR,
  GLOBAL_INHERITED_DIR,
  GLOBAL_EVOLVED_DIR,
  GLOBAL_OBSERVATIONS_FILE,
  ensureDir,
  ensureGlobalDirs,
  runGit,
  updateRegistry,
  detectProject,
};

// CLI mode: output project info as JSON
if (require.main === module) {
  ensureGlobalDirs();
  const project = detectProject();
  console.log(JSON.stringify(project, null, 2));
}
