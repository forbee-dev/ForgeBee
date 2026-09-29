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
const { execFileSync } = require('child_process');

const LEARNING_DIR = path.join(os.homedir(), '.claude', 'forgebee-learning');
const PROJECTS_DIR = path.join(LEARNING_DIR, 'projects');
const REGISTRY_FILE = path.join(LEARNING_DIR, 'projects.json');

// Global (non-project-scoped) paths
const GLOBAL_INSTINCTS_DIR = path.join(LEARNING_DIR, 'instincts');
const GLOBAL_PERSONAL_DIR = path.join(GLOBAL_INSTINCTS_DIR, 'personal');
const GLOBAL_INHERITED_DIR = path.join(GLOBAL_INSTINCTS_DIR, 'inherited');
const GLOBAL_EVOLVED_DIR = path.join(LEARNING_DIR, 'evolved');
const GLOBAL_OBSERVATIONS_FILE = path.join(LEARNING_DIR, 'observations.jsonl');

function ensureDir(dirPath, mode) {
  try { fs.mkdirSync(dirPath, { recursive: true, mode }); } catch (e) { /* ignore */ }
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

// No shell: cwd comes from hook stdin and a dir name like `x$(cmd)` would run.
function runGit(args, cwd) {
  try {
    const argv = [...(cwd ? ['-C', cwd] : []), ...args];
    return execFileSync('git', argv, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 5000 }).trim();
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

// Look up an existing registry entry by project root, so a known project can be
// resolved without spawning `git remote get-url` (see detectProject fast path).
function findRegistryByRoot(root) {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    for (const [id, entry] of Object.entries(registry)) {
      if (entry && entry.root === root) return { id, ...entry };
    }
  } catch (e) { /* no registry yet */ }
  return null;
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
    const gitRoot = runGit(['rev-parse', '--show-toplevel']);
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

  // Fast path (GAP-4): observe.js runs this on every Edit/Write/Bash/Task (Pre +
  // Post). If this root is already registered, reuse its id and remote instead
  // of spawning `git remote get-url` every call, and only refresh last_seen at
  // most hourly instead of rewriting projects.json each time.
  const cached = findRegistryByRoot(projectRoot);
  let remoteUrl;
  let projectId;
  let needsRegistryUpdate;
  if (cached) {
    remoteUrl = cached.remote || '';
    projectId = cached.id;
    const lastSeen = Date.parse(cached.last_seen || '');
    needsRegistryUpdate = Number.isNaN(lastSeen) || (Date.now() - lastSeen) > 3600000;
  } else {
    // First sight this machine — derive project ID from git remote URL or path.
    remoteUrl = runGit(['remote', 'get-url', 'origin'], projectRoot);
    const hashSource = remoteUrl || projectRoot;
    projectId = crypto.createHash('sha256').update(hashSource).digest('hex').slice(0, 12);
    needsRegistryUpdate = true;
  }

  const projectDir = path.join(PROJECTS_DIR, projectId);

  // Ensure project directory structure + refresh registry only on first sight
  // (or hourly). observe.js re-ensures the observations dir itself before writing.
  if (needsRegistryUpdate) {
    [
      path.join(projectDir, 'instincts', 'personal'),
      path.join(projectDir, 'instincts', 'inherited'),
      path.join(projectDir, 'evolved', 'skills'),
      path.join(projectDir, 'evolved', 'commands'),
      path.join(projectDir, 'evolved', 'agents'),
    ].forEach(d => ensureDir(d));
    ensureDir(path.join(projectDir, 'observations.archive'), 0o700);
    updateRegistry(projectId, projectName, projectRoot, remoteUrl);
  }

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
