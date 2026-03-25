/**
 * ForgeBee Common Utilities
 * Shared Node.js utility module for ForgeBee hooks
 * Replaces _common.sh bootstrap logic and incorporates ECC utils patterns
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// ============================================================================
// DIRECTORY RESOLUTION
// ============================================================================

/**
 * Resolves PROJECT_DIR from CLAUDE_PROJECT_DIR env var (default ".")
 * @returns {string} Absolute path to project directory
 */
function getProjectDir() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
  return path.resolve(projectDir);
}

/**
 * Resolves PLUGIN_ROOT from CLAUDE_PLUGIN_ROOT env var
 * @returns {string|null} Absolute path to plugin root, or null if not set
 */
function getPluginRoot() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  return pluginRoot ? path.resolve(pluginRoot) : null;
}

/**
 * Returns the ForgeBee root (plugin root if available, else project dir)
 * @returns {string} Absolute path to ForgeBee root
 */
function findForgebeeRoot() {
  const pluginRoot = getPluginRoot();
  return pluginRoot || getProjectDir();
}

/**
 * Finds the commands directory, checking plugin then project
 * @returns {string} Absolute path to commands directory
 */
function findCommandsDir() {
  const pluginRoot = getPluginRoot();
  const projectDir = getProjectDir();

  const pluginCommandsDir = pluginRoot ? path.join(pluginRoot, 'commands') : null;
  const projectCommandsDir = path.join(projectDir, '.claude', 'commands');

  if (pluginCommandsDir && fs.existsSync(pluginCommandsDir)) {
    return pluginCommandsDir;
  }
  return projectCommandsDir;
}

/**
 * Returns array of all valid skill directories (plugin, project, global, legacy)
 * @returns {string[]} Array of valid skill directory paths
 */
function findSkillsDirs() {
  const dirs = [];
  const pluginRoot = getPluginRoot();
  const projectDir = getProjectDir();

  // Plugin skills
  if (pluginRoot) {
    const pluginSkills = path.join(pluginRoot, 'skills');
    if (fs.existsSync(pluginSkills)) {
      dirs.push(pluginSkills);
    }
  }

  // Project skills
  const projectSkills = path.join(projectDir, '.claude', 'skills');
  if (fs.existsSync(projectSkills)) {
    dirs.push(projectSkills);
  }

  // Global skills (if in home directory)
  const homeDir = os.homedir();
  const globalSkills = path.join(homeDir, '.claude', 'skills');
  if (fs.existsSync(globalSkills)) {
    dirs.push(globalSkills);
  }

  // Legacy skills (current directory)
  if (fs.existsSync('./skills')) {
    dirs.push(path.resolve('./skills'));
  }

  return dirs;
}

/**
 * Initializes project directory structure
 * Creates: .claude/sessions, .claude/session-cache/context-backups, .claude/learnings,
 *          docs/pm/features, docs/planning/briefs, docs/planning/requirements, docs/planning/stories
 */
function initializeProjectDirs() {
  const projectDir = getProjectDir();

  const dirsToCreate = [
    path.join(projectDir, '.claude', 'sessions'),
    path.join(projectDir, '.claude', 'session-cache', 'context-backups'),
    path.join(projectDir, '.claude', 'learnings'),
    path.join(projectDir, 'docs', 'pm', 'features'),
    path.join(projectDir, 'docs', 'planning', 'briefs'),
    path.join(projectDir, 'docs', 'planning', 'requirements'),
    path.join(projectDir, 'docs', 'planning', 'stories'),
  ];

  dirsToCreate.forEach(dir => ensureDir(dir));
}

/**
 * Initializes learnings.md if missing
 */
function initializeLearnings() {
  const projectDir = getProjectDir();
  const learningsPath = path.join(projectDir, '.claude', 'learnings', 'learnings.md');

  if (!fs.existsSync(learningsPath)) {
    ensureDir(path.dirname(learningsPath));
    const template = `# Learnings

> Auto-managed by ForgeBee. Edit freely.

## Key Insights
<!-- Add key learnings here -->

## Patterns Discovered
<!-- Document patterns found during development -->

## Blockers & Solutions
<!-- Document issues and their resolutions -->
`;
    writeFile(learningsPath, template);
  }
}

/**
 * Initializes permissions.json if missing
 */
function initializePermissions() {
  const projectDir = getProjectDir();
  const permissionsPath = path.join(projectDir, '.claude', 'permissions.json');

  if (!fs.existsSync(permissionsPath)) {
    ensureDir(path.dirname(permissionsPath));
    const template = {
      version: '1.0.0',
      timestamp: getISOString(),
      permissions: [],
      escalations: [],
    };
    writeFile(permissionsPath, JSON.stringify(template, null, 2));
  }
}

// ============================================================================
// STDIO UTILITIES
// ============================================================================

/**
 * Reads JSON from stdin with timeout and maxSize protection
 * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
 * @param {number} maxSizeBytes - Maximum size in bytes (default 1MB)
 * @returns {Promise<object|null>} Parsed JSON object or null on error
 */
async function readStdinJson(timeoutMs = 5000, maxSizeBytes = 1024 * 1024) {
  return new Promise((resolve) => {
    let data = '';
    const timeout = setTimeout(() => {
      process.stdin.removeAllListeners();
      log('STDIN timeout');
      resolve(null);
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > maxSizeBytes) {
        process.stdin.removeAllListeners();
        clearTimeout(timeout);
        log(`STDIN exceeded max size (${maxSizeBytes} bytes)`);
        resolve(null);
      }
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch (e) {
        log(`Failed to parse STDIN JSON: ${e.message}`);
        resolve(null);
      }
    });

    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });

    // If stdin is not a TTY, it might not have data waiting
    if (process.stdin.isTTY) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Synchronous version of readStdinJson for hooks that don't need async
 * @returns {object|null} Parsed JSON object or null on error
 */
function readStdinJsonSync() {
  try {
    const data = fs.readFileSync(0, 'utf8');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Logs message to stderr (visible to user)
 * @param {string} message - Message to log
 */
function log(message) {
  console.error(message);
}

/**
 * Outputs data to stdout (returned to Claude)
 * Handles objects via JSON.stringify
 * @param {*} data - Data to output
 */
function output(data) {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(String(data));
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Safely reads file with null on error
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default 'utf8')
 * @returns {string|null} File contents or null on error
 */
function readFile(filePath, encoding = 'utf8') {
  try {
    return fs.readFileSync(filePath, encoding);
  } catch (e) {
    return null;
  }
}

/**
 * Writes file with automatic directory creation
 * @param {string} filePath - Path to file
 * @param {string|Buffer} content - Content to write
 * @returns {boolean} Success status
 */
function writeFile(filePath, content) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) {
    log(`Failed to write file ${filePath}: ${e.message}`);
    return false;
  }
}

/**
 * Appends to file with automatic directory creation
 * @param {string} filePath - Path to file
 * @param {string} content - Content to append
 * @returns {boolean} Success status
 */
function appendFile(filePath, content) {
  try {
    ensureDir(path.dirname(filePath));
    fs.appendFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) {
    log(`Failed to append to file ${filePath}: ${e.message}`);
    return false;
  }
}

/**
 * Recursively creates directory, ignores EEXIST
 * @param {string} dirPath - Directory path to create
 * @returns {boolean} Success status
 */
function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (e) {
    if (e.code !== 'EEXIST') {
      log(`Failed to create directory ${dirPath}: ${e.message}`);
      return false;
    }
    return true;
  }
}

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

/**
 * Executes command synchronously with error handling
 * @param {string} cmd - Command to execute
 * @param {object} options - execSync options
 * @returns {object} {success: boolean, output: string, error?: Error}
 */
function runCommand(cmd, options = {}) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return {
      success: true,
      output: output.trim(),
    };
  } catch (e) {
    return {
      success: false,
      output: e.stdout ? e.stdout.toString().trim() : '',
      error: e,
    };
  }
}

/**
 * Checks if current directory is a git repository
 * @returns {boolean} True if in git repo
 */
function isGitRepo() {
  const result = runCommand('git rev-parse --is-inside-work-tree', {
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  return result.success && result.output === 'true';
}

/**
 * Runs a git subcommand (without the 'git' prefix)
 * @param {string} subcommand - Git subcommand (e.g., 'diff --stat HEAD~1')
 * @returns {string} Command output or empty string on error
 */
function runGit(subcommand) {
  const result = runCommand(`git ${subcommand}`);
  return result.success ? result.output : '';
}

/**
 * Gets modified files in git repository
 * @param {string|null} pattern - Optional regex pattern to filter files
 * @returns {string[]} Array of modified file paths
 */
function getGitModifiedFiles(pattern = null) {
  if (!isGitRepo()) {
    return [];
  }

  const result = runCommand('git diff --name-only && git diff --cached --name-only', {
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  if (!result.success) {
    return [];
  }

  let files = result.output.split('\n').filter(f => f.trim());

  if (pattern) {
    const regex = new RegExp(pattern);
    files = files.filter(f => regex.test(f));
  }

  return files;
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Returns date string in YYYY-MM-DD format
 * @param {Date} date - Date object (default: current date)
 * @returns {string} Formatted date string
 */
function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns date-time string in YYYY-MM-DD HH:MM:SS format
 * @param {Date} date - Date object (default: current date)
 * @returns {string} Formatted date-time string
 */
function getDateTimeString(date = new Date()) {
  const dateStr = getDateString(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * Returns ISO 8601 string (YYYY-MM-DDTHH:MM:SS.sssZ)
 * @param {Date} date - Date object (default: current date)
 * @returns {string} ISO string
 */
function getISOString(date = new Date()) {
  return date.toISOString();
}

// ============================================================================
// PERMISSION MODE DETECTION
// ============================================================================

/** @type {string|null} Cached permission mode — read once per process */
let _cachedPermissionMode = null;

/**
 * Detects Claude Code's permission mode from ~/.claude/settings.json
 *
 * Resolution order:
 *   1. settings.defaultMode ("auto" | "bypassPermissions" | "default")
 *   2. settings.skipDangerousModePermissionPrompt === true -> "bypassPermissions"
 *   3. Fallback -> "default"
 *
 * Result is cached in a module-level variable so the file is read at most once
 * per process.
 *
 * @returns {string} "auto" | "bypassPermissions" | "default"
 */
function detectPermissionMode() {
  if (_cachedPermissionMode !== null) {
    return _cachedPermissionMode;
  }

  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(raw);

    if (
      settings.defaultMode === 'auto' ||
      settings.defaultMode === 'bypassPermissions' ||
      settings.defaultMode === 'default'
    ) {
      _cachedPermissionMode = settings.defaultMode;
      return _cachedPermissionMode;
    }

    if (settings.skipDangerousModePermissionPrompt === true) {
      _cachedPermissionMode = 'bypassPermissions';
      return _cachedPermissionMode;
    }

    _cachedPermissionMode = 'default';
    return _cachedPermissionMode;
  } catch (e) {
    // File missing, unreadable, or malformed JSON — safe fallback
    _cachedPermissionMode = 'default';
    return _cachedPermissionMode;
  }
}

// ============================================================================
// PROJECT DISCOVERY
// ============================================================================

/**
 * Walks up directory tree to find project root (package.json or composer.json)
 * @param {string} startDir - Starting directory (default: current directory)
 * @returns {string|null} Project root path or null if not found
 */
function findProjectRoot(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);

  while (true) {
    // Check for package.json (Node.js)
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }

    // Check for composer.json (PHP)
    if (fs.existsSync(path.join(currentDir, 'composer.json'))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }

    currentDir = parentDir;
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  // Platform detection
  isWindows,
  isMacOS,
  isLinux,

  // Directory resolution
  getProjectDir,
  getPluginRoot,
  findForgebeeRoot,
  findCommandsDir,
  findSkillsDirs,
  initializeProjectDirs,
  initializeLearnings,
  initializePermissions,

  // STDIO utilities
  readStdinJson,
  readStdinJsonSync,
  log,
  output,

  // File operations
  readFile,
  writeFile,
  appendFile,
  ensureDir,

  // Command execution
  runCommand,
  runGit,
  isGitRepo,
  getGitModifiedFiles,

  // Date & time
  getDateString,
  getDateTimeString,
  getISOString,

  // Project discovery
  findProjectRoot,

  // Permission mode
  detectPermissionMode,
};
