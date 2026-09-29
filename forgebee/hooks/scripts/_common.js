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
 * Returns array of all valid agent directories (plugin, project, global, legacy)
 * Agents are flat `<name>.md` files, unlike skills which are `<name>/SKILL.md`.
 * @returns {string[]} Array of valid agent directory paths
 */
function findAgentsDirs() {
  const dirs = [];
  const pluginRoot = getPluginRoot();
  const projectDir = getProjectDir();

  // Plugin agents
  if (pluginRoot) {
    const pluginAgents = path.join(pluginRoot, 'agents');
    if (fs.existsSync(pluginAgents)) {
      dirs.push(pluginAgents);
    }
  }

  // Project agents
  const projectAgents = path.join(projectDir, '.claude', 'agents');
  if (fs.existsSync(projectAgents)) {
    dirs.push(projectAgents);
  }

  // Global agents (if in home directory)
  const homeDir = os.homedir();
  const globalAgents = path.join(homeDir, '.claude', 'agents');
  if (fs.existsSync(globalAgents)) {
    dirs.push(globalAgents);
  }

  // Legacy agents (current directory)
  if (fs.existsSync('./agents')) {
    dirs.push(path.resolve('./agents'));
  }

  return dirs;
}

/**
 * Reads the SessionStart triage cache and returns the stacks this project uses.
 * Shared by load-index.js (which stack section to pin) and skill-activator.js
 * (which surfaces to boost). Returns [] when no triage has run yet.
 * @returns {string[]} Subset of ['wordpress', 'nextjs', 'supabase', 'llm']
 */
function detectProjectStacks() {
  const cacheFile = path.join(
    getProjectDir(),
    '.claude',
    'session-cache',
    'project-triage.json'
  );

  try {
    const triage = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const stacks = [];

    if ((triage.wordpress?.type || 'none') !== 'none') {
      stacks.push('wordpress');
    }
    if (/next/i.test(triage.node?.framework || '')) {
      stacks.push('nextjs');
    }
    if (triage.supabase?.detected === true || triage.supabase?.detected === 'true') {
      stacks.push('supabase');
    }
    if (triage.llm?.detected === true) {
      stacks.push('llm');
    }

    return stacks;
  } catch (e) {
    return [];
  }
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

// `pass`/`pw` only as a whole word part (MY_PASS, DB_PW), not inside passthrough or bypass.
const SECRET_NAME = /(?:key|token|secret|password|passwd|pwd|auth|credential|(?<![A-Za-z0-9])(?:pass|pw)(?![A-Za-z0-9]))/i;

// Single source for secret-scan (detects) and redactForPrompt (redacts).
// `redactOnly` shapes are too loose to block a commit on, but must still not
// reach disk or a prompt. Quantifiers stay bounded because observe.js redacts
// up to 1 MB per tool call inside a 3 s hook timeout.
const SECRET_PATTERNS = [
  { kind: 'Private key block', label: 'private-key', re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY(?: BLOCK)?-----(?:[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY(?: BLOCK)?-----|[\s\S]*)/ },
  { kind: 'AWS access key id', label: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'Anthropic API key', label: 'api-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { kind: 'OpenAI project key', label: 'api-key', re: /\bsk-proj-[A-Za-z0-9_-]{20,}/ },
  { kind: 'OpenAI-style API key', label: 'api-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { kind: 'sk-live/sk-test key', label: 'api-key', re: /\bsk-(?:live|test)-[A-Za-z0-9_-]+/, redactOnly: true },
  { kind: 'GitHub token', label: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { kind: 'GitHub fine-grained token', label: 'github-token', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { kind: 'Google API key', label: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { kind: 'Slack token', label: 'slack-token', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/ },
  { kind: 'Stripe live key', label: 'stripe-key', re: /\b[rs]k_live_[A-Za-z0-9]{16,}\b/ },
  { kind: 'Stripe test key', label: 'stripe-key', re: /\b[rs]k_test_[A-Za-z0-9]{16,}\b/ },
  { kind: 'GitLab token', label: 'gitlab-token', re: /(?<![A-Za-z0-9_-])glpat-[A-Za-z0-9_-]{20,}/ },
  { kind: 'SendGrid API key', label: 'api-key', re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/ },
  { kind: 'Hugging Face token', label: 'api-key', re: /\bhf_[A-Za-z0-9]{30,}\b/ },
  { kind: 'npm token', label: 'npm-token', re: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { kind: 'Slack webhook', label: 'slack-webhook', re: /\bhooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9_/-]{20,}/ },
  { kind: 'Hardcoded secret assignment', label: 'secret', re: /(?:api[_-]?key|secret|token|passwd|password|access[_-]?token|client[_-]?secret)\s*[:=]\s*['"][A-Za-z0-9_\-./+=]{16,}['"]/i },
  { kind: 'Bearer token', label: 'token', re: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i, replace: 'Bearer [REDACTED:token]', redactOnly: true },
  // Runs before Secret-named assignment, which would redact only the scheme
  // word ("Token", "AWS4-HMAC-SHA256"). Digest runs to end of line because its
  // value contains quotes.
  {
    kind: 'Authorization header credential',
    label: 'credential',
    re: /\b((?:Proxy-)?Authorization["']?\s*[:=]\s*["']?)(?:Digest\s[^\n]{0,5000}|(?!Bearer \[REDACTED)[^\s"'][^\n"']{0,5000})/i,
    replace: '$1[REDACTED:credential]',
    redactOnly: true,
  },
  { kind: 'Cookie header', label: 'cookie', re: /\b((?:Set-)?Cookie["']?\s*[:=]\s*["']?)[^\s"'][^\n"']{0,5000}/i, replace: '$1[REDACTED:cookie]', redactOnly: true },
  // Space-separated values; `--password=x` is also caught by Secret-named assignment.
  {
    kind: 'CLI secret flag',
    label: 'credential',
    re: /((?<![A-Za-z0-9_-])--(?:[a-z0-9]{1,30}-){0,3}(?:password|passwd|pass|pw|token|secret|api-?key|apikey)(?:\s{1,20}|=))(?!-)(?:'[^'\n]{0,256}'|"[^"\n]{0,256}"|[^\s'"]{1,256})/i,
    replace: '$1[REDACTED:credential]',
    redactOnly: true,
  },
  {
    kind: 'CLI short password flag',
    label: 'credential',
    re: /\b((?:(?:docker|podman)\s+login|sshpass)\s(?:[^\n|;&]{0,100}?\s)?-p\s{0,20}|redis-cli\s(?:[^\n|;&]{0,100}?\s)?-a\s{0,20})(?=[^\s-])(?:'[^'\n]{0,256}'|"[^"\n]{0,256}"|[^\s'"]{1,256})/,
    replace: '$1[REDACTED:credential]',
    redactOnly: true,
  },
  // Lookbehind instead of \b: with \b every "eyJ" inside one long run is a new
  // start that rescans the run, which is quadratic ("eyJ-" x 100000 took 10 s).
  { kind: 'JWT', label: 'jwt', re: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, redactOnly: true },
  // Before Email: that pattern needs a TLD, so user:pass@localhost slipped through.
  { kind: 'URL credentials', label: 'password', re: /(?<![a-z0-9+.-])([a-z][a-z0-9+.-]{1,20}:\/\/[^\s:@/?#]{0,256}:)[^\s/?#]{1,256}@/i, replace: '$1[REDACTED:password]@', redactOnly: true },
  { kind: 'mysql -p password', label: 'password', re: /\b(mysql\w{0,10}\s(?:[^\n|;&]{0,100}?\s)?-p)(?=[^\s-])(?:'[^'\n]{0,256}'|"[^"\n]{0,256}"|[^\s'"]{1,256})/, replace: '$1[REDACTED:password]', redactOnly: true },
  { kind: 'curl -u credentials', label: 'credential', re: /\b(curl\s(?:[^\n|;&]{0,100}?\s)?(?:-u|--user(?=[\s=]))[\s=]?)(?:'[^'\n]{0,256}'|"[^"\n]{0,256}"|[^\s'"]{1,256})/, replace: '$1[REDACTED:credential]', redactOnly: true },
  { kind: 'Azure SAS signature', label: 'secret', re: /([?&]sig=)[A-Za-z0-9%+/=]{16,}/, replace: '$1[REDACTED:secret]', redactOnly: true },
  // `token: >-` / `password: |` — the value is on the indented lines below.
  {
    kind: 'YAML block secret',
    label: 'secret',
    re: new RegExp(`^([ \\t]{0,40})(["']?[A-Za-z0-9_.-]{0,40}${SECRET_NAME.source}[A-Za-z0-9_.-]{0,40}["']?[ \\t]{0,40}:[ \\t]{0,40}[|>][1-9+-]{0,2}[ \\t]{0,40}(?:#[^\\n]{0,200})?\\n)(?:\\1[ \\t]{1,40}[^\\n]*(?:\\n|$)|[ \\t]{0,40}\\n){1,500}`, 'im'),
    replace: '$1$2$1  [REDACTED:secret]\n',
    redactOnly: true,
  },
  {
    kind: 'Secret-named assignment',
    label: 'secret',
    // NAME=value, NAME: value, "name": "value" — keeps the name, drops the value.
    re: new RegExp(`(["']?)(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]{0,40}${SECRET_NAME.source}[A-Za-z0-9_.-]{0,40})\\1(\\s*[:=]\\s*)(?:"[^"\\n]{0,5000}"|'[^'\\n]{0,5000}'|(?!\\[REDACTED)[^\\s"'&;|,}]{1,5000})`, 'i'),
    replace: '$1$2$1$3[REDACTED:secret]',
    redactOnly: true,
  },
  { kind: 'Email', label: 'email', re: /(?<![a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,}/, redactOnly: true },
  { kind: 'UUID', label: 'uuid', re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, redactOnly: true },
  // Currency amounts over $1,000 (heuristic for sensitive finance numbers)
  { kind: 'Currency amount', label: 'amount', re: /\$\s?\d{1,3}(?:[,.]\d{3})+(?:\.\d{2})?/, redactOnly: true },
];

const REDACTORS = SECRET_PATTERNS.map(p => ({
  re: new RegExp(p.re.source, p.re.flags + 'g'),
  replace: p.replace || `[REDACTED:${p.label}]`,
}));

/**
 * Redact secrets and PII (SECRET_PATTERNS) before text reaches a prompt or disk.
 * @param {string} text - input to scan
 * @returns {string} text with sensitive tokens replaced by typed placeholders
 */
function redactForPrompt(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const r of REDACTORS) out = out.replace(r.re, r.replace);
  return out;
}

/**
 * Atomic write with O_NOFOLLOW symlink-clobber defense.
 *
 * Refuses to write if the target path or any parent component resolves through
 * a symlink. Protects predictable user-owned paths (e.g., flag files in
 * ~/.claude/) from local-attacker symlink redirection.
 *
 * Adapted from caveman's safeWriteFlag pattern.
 *
 * @param {string} filePath - absolute path to write
 * @param {string} content - data to write
 * @param {object} options - { mode: number = 0o600 }
 * @returns {{ok: boolean, error?: string}}
 */
function safeWriteFlag(filePath, content, options = {}) {
  const mode = options.mode || 0o600;
  try {
    if (!path.isAbsolute(filePath)) {
      return { ok: false, error: 'safeWriteFlag requires an absolute path' };
    }

    // Refuse if any ancestor in filePath resolves through a symlink
    let cursor = path.dirname(filePath);
    while (cursor !== path.dirname(cursor)) {
      try {
        const st = fs.lstatSync(cursor);
        if (st.isSymbolicLink()) {
          return { ok: false, error: `Refused: ancestor is symlink: ${cursor}` };
        }
      } catch {
        // ancestor doesn't exist — OK, will be created by ensureDir
      }
      cursor = path.dirname(cursor);
    }

    // If target exists, refuse if it's a symlink
    try {
      const targetStat = fs.lstatSync(filePath);
      if (targetStat.isSymbolicLink()) {
        return { ok: false, error: `Refused: target is symlink: ${filePath}` };
      }
    } catch {
      // target doesn't exist yet — fine
    }

    ensureDir(path.dirname(filePath));

    // Open with O_NOFOLLOW | O_CREAT | O_WRONLY | O_TRUNC, mode 0o600
    const flags = fs.constants.O_NOFOLLOW | fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_TRUNC;
    const fd = fs.openSync(filePath, flags, mode);
    try {
      fs.writeSync(fd, String(content));
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Validates a hook entry against Claude Code's settings.json schema before
 * mutating settings. Claude Code's Zod parser silently DROPS the entire
 * settings.json on schema mismatch — defend by validating in advance.
 *
 * Adapted from caveman's validateHookFields pattern.
 *
 * @param {object} settingsObj - parsed settings.json content
 * @returns {{ok: boolean, errors: string[]}}
 */
function validateHookFields(settingsObj) {
  const errors = [];
  if (!settingsObj || typeof settingsObj !== 'object') {
    return { ok: false, errors: ['settings must be an object'] };
  }
  const hooks = settingsObj.hooks;
  if (hooks == null) {
    return { ok: true, errors: [] }; // no hooks section is valid
  }
  if (typeof hooks !== 'object' || Array.isArray(hooks)) {
    return { ok: false, errors: ['settings.hooks must be an object keyed by event name'] };
  }
  const knownEvents = [
    'SessionStart', 'SessionEnd', 'UserPromptSubmit',
    'PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop',
    'Notification', 'PreCompact', 'TaskCompleted',
  ];
  for (const [eventName, eventArray] of Object.entries(hooks)) {
    if (!knownEvents.includes(eventName)) {
      errors.push(`Unknown hook event: ${eventName}`);
      continue;
    }
    if (!Array.isArray(eventArray)) {
      errors.push(`hooks.${eventName} must be an array`);
      continue;
    }
    eventArray.forEach((entry, i) => {
      const loc = `hooks.${eventName}[${i}]`;
      if (typeof entry !== 'object' || entry == null) {
        errors.push(`${loc} must be an object`);
        return;
      }
      if (typeof entry.matcher !== 'string') {
        errors.push(`${loc}.matcher must be a string (not regex, not undefined)`);
      }
      if (!Array.isArray(entry.hooks)) {
        errors.push(`${loc}.hooks must be an array`);
        return;
      }
      entry.hooks.forEach((h, j) => {
        const hloc = `${loc}.hooks[${j}]`;
        if (h.type !== 'command') errors.push(`${hloc}.type must be "command"`);
        if (typeof h.command !== 'string' || h.command.trim() === '') {
          errors.push(`${hloc}.command must be a non-empty string`);
        }
        if (h.timeout != null && typeof h.timeout !== 'number') {
          errors.push(`${hloc}.timeout must be a number when present`);
        }
        // Command lint — schema-valid is not enough. Reject inline interpreters
        // (node -e, python -c, perl -e), curl|sh, wget|sh, base64 → shell
        // pipelines, and free-form shell smuggling. Hostile hook entries must
        // not bypass permission-guard via settings.json.
        if (typeof h.command === 'string') {
          const cmd = h.command;
          const HOSTILE_PATTERNS = [
            { re: /\b(node|nodejs|deno)\s+(-e|--eval|--print|-p)\b/i, why: 'inline node eval (-e/-p) is not allowed in hooks' },
            { re: /\bpython3?\s+(-c|-m\s+code)\b/i, why: 'inline python -c is not allowed in hooks' },
            { re: /\bperl\s+(-e|-E|-p\s|-n\s)/i, why: 'inline perl -e is not allowed in hooks' },
            { re: /\bruby\s+(-e|-r)\b/i, why: 'inline ruby -e is not allowed in hooks' },
            { re: /\b(curl|wget|fetch)\b[^|]*\|\s*(sh|bash|zsh|fish|node|python|perl)/i, why: 'pipe-to-shell pattern is not allowed' },
            { re: /\bbase64\s+(-d|--decode|-D)\b/i, why: 'base64 decode in hooks blocked — wrap in registered script' },
            { re: /\beval\s+/i, why: 'eval in hook command blocked' },
            { re: /\bexec\s*</i, why: 'exec redirection in hook command blocked' },
            { re: /;\s*(rm|curl|wget|nc|telnet)\b/i, why: 'semicolon-chained dangerous command in hook command' },
          ];
          for (const { re, why } of HOSTILE_PATTERNS) {
            if (re.test(cmd)) {
              errors.push(`${hloc}.command rejected — ${why}`);
              break;
            }
          }
        }
      });
    });
  }
  return { ok: errors.length === 0, errors };
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

  const VALID = ['auto', 'bypassPermissions', 'default', 'acceptEdits', 'plan'];

  function checkSettings(p) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const s = JSON.parse(raw);
      // 1. Nested under permissions (current Claude Code shape)
      if (VALID.includes(s?.permissions?.defaultMode)) return s.permissions.defaultMode;
      // 2. Root-level (older / alternate shape)
      if (VALID.includes(s?.defaultMode)) return s.defaultMode;
      // 3. Legacy flag → bypassPermissions
      if (s?.skipDangerousModePermissionPrompt === true) return 'bypassPermissions';
      // 4. New flag → auto
      if (s?.skipAutoPermissionPrompt === true) return 'auto';
      return null;
    } catch (e) {
      return null;
    }
  }

  // Read project-local settings first (override), then global
  const projectSettings = path.join(getProjectDir(), '.claude', 'settings.json');
  const globalSettings = path.join(os.homedir(), '.claude', 'settings.json');
  const mode = checkSettings(projectSettings) || checkSettings(globalSettings) || 'default';
  _cachedPermissionMode = mode;
  return mode;
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
  findAgentsDirs,
  detectProjectStacks,
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
  safeWriteFlag,
  validateHookFields,
  redactForPrompt,
  SECRET_PATTERNS,
  SECRET_NAME,

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

  // Backward-compat aliases for legacy .claude/hooks/ scripts
  PROJECT_DIR: getProjectDir(),
  initDirs: initializeProjectDirs,
  readStdinSync: readStdinJsonSync,
  readJsonFile: (filepath) => {
    try { return JSON.parse(fs.readFileSync(filepath, 'utf8')); } catch { return null; }
  },
};
