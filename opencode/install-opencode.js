#!/usr/bin/env node

/**
 * ForgeBee → OpenCode installer (skills, agents, commands, rules; no hooks)
 * Usage: node opencode/install-opencode.js [target-dir]
 * Default target: ~/.config/opencode. For a project install pass ./.opencode
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.join(path.dirname(path.dirname(path.resolve(__filename))), 'forgebee');
const TARGET = path.resolve(process.argv[2] || path.join(os.homedir(), '.config', 'opencode'));
const ROOT = path.join(TARGET, 'forgebee');
const MANIFEST = path.join(ROOT, '.opencode-install.json');

const SKIP_AGENTS = { orchestrator: 'main-thread agent, needs Claude Code hooks', direct: 'main-thread agent, needs Claude Code hooks' };
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COLOR_RE = /^(#[0-9a-fA-F]{6}|primary|secondary|accent|success|warning|error|info)$/;
const TOOL_MAP = { Read: 'read', Write: 'edit', Edit: 'edit', Glob: 'glob', Grep: 'grep', Bash: 'bash', Task: 'task', WebSearch: 'websearch', WebFetch: 'webfetch' };
const PERMISSION_KEYS = ['read', 'edit', 'glob', 'grep', 'list', 'bash', 'task', 'webfetch', 'websearch'];

function fail(msg) {
  throw new Error(msg);
}

// Split a markdown file into frontmatter lines and body text.
function splitFrontmatter(text, file) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') fail(`${file}: missing frontmatter`);
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) fail(`${file}: unterminated frontmatter`);
  return { fm: lines.slice(1, end), body: lines.slice(end + 1).join('\n') };
}

function fmFields(fm) {
  const fields = {};
  for (const line of fm) {
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

const join = (fm, body) => `---\n${fm.join('\n')}\n---\n${body}`;

function rewrite(text) {
  return text.replaceAll('${CLAUDE_PLUGIN_ROOT}', ROOT).replaceAll('forgebee:', 'forgebee-');
}

function mdFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? mdFiles(p) : e.name.endsWith('.md') ? [p] : [];
  });
}

function rewriteTree(dir) {
  for (const f of mdFiles(dir)) fs.writeFileSync(f, rewrite(fs.readFileSync(f, 'utf-8')));
}

function removeOldInstall() {
  if (!fs.existsSync(MANIFEST)) return;
  const old = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
  for (const rel of old.created || []) {
    const abs = path.resolve(TARGET, rel);
    // Guard: a tampered manifest must not delete outside the target or the resource root.
    if (path.isAbsolute(rel) || !abs.startsWith(TARGET + path.sep) || abs === ROOT || abs.startsWith(ROOT + path.sep)) {
      fail(`manifest has unsafe path: ${rel}`);
    }
    fs.rmSync(abs, { recursive: true, force: true });
  }
}

function copyResources() {
  fs.mkdirSync(ROOT, { recursive: true });
  // shortcut: stale files from older versions stay in forgebee/, upgrade when files are renamed often.
  fs.cpSync(SRC, ROOT, {
    recursive: true,
    force: true,
    filter: src => src !== path.join(SRC, 'eval'),
  });
  rewriteTree(ROOT);
}

// removeOldInstall() ran first, so any path that still exists is user-owned.
const kept = [];
function isUserOwned(rel) {
  if (!fs.existsSync(path.join(TARGET, rel))) return false;
  kept.push(path.join(TARGET, rel));
  return true;
}

function listDir(dir, pred) {
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(pred).map(e => e.name) : [];
}

function installSkills(created) {
  const srcDir = path.join(SRC, 'skills');
  let count = 0;
  for (const name of listDir(srcDir, e => e.isDirectory())) {
    const file = path.join(srcDir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const full = `forgebee-${name}`;
    if (full.length > 64 || !NAME_RE.test(full)) fail(`skill ${name}: invalid OpenCode name "${full}"`);
    const { fm, body } = splitFrontmatter(fs.readFileSync(file, 'utf-8'), file);
    const desc = fmFields(fm).description || '';
    if (desc.length < 1 || desc.length > 1024) fail(`skill ${name}: description must be 1-1024 chars (got ${desc.length})`);
    if (isUserOwned(path.join('skills', full))) continue;
    const dest = path.join(TARGET, 'skills', full);
    fs.cpSync(path.join(srcDir, name), dest, { recursive: true });
    const newFm = fm.map(l => (/^name:/.test(l) ? `name: ${full}` : l));
    fs.writeFileSync(path.join(dest, 'SKILL.md'), rewrite(join(newFm, body)));
    rewriteTree(dest);
    created.push(path.join('skills', full));
    count++;
  }
  return count;
}

function permissionBlock(toolsLine) {
  const allowed = new Set(toolsLine.split(',').map(t => TOOL_MAP[t.trim()]).filter(Boolean));
  if (allowed.has('glob')) allowed.add('list');
  return ['permission:', ...PERMISSION_KEYS.map(k => `  ${k}: ${allowed.has(k) ? 'allow' : 'deny'}`)];
}

function installAgents(created) {
  const srcDir = path.join(SRC, 'agents');
  const skipped = [];
  let count = 0;
  for (const file of listDir(srcDir, e => e.isFile() && e.name.endsWith('.md'))) {
    const name = path.basename(file, '.md');
    if (SKIP_AGENTS[name]) {
      skipped.push(`${name} (${SKIP_AGENTS[name]})`);
      continue;
    }
    const { fm, body } = splitFrontmatter(fs.readFileSync(path.join(srcDir, file), 'utf-8'), file);
    const f = fmFields(fm);
    if (!f.description) fail(`agent ${name}: description is required`);
    // model: is dropped on purpose. Claude aliases like `opus` are invalid in OpenCode,
    // so the subagent inherits the caller's model. Users can set `model: provider/model-id` by hand.
    const out = [`description: ${f.description}`, 'mode: subagent'];
    if (f.color && COLOR_RE.test(f.color.replace(/^["']|["']$/g, ''))) out.push(`color: ${f.color}`);
    if (f.tools !== undefined) out.push(...permissionBlock(f.tools));
    const rel = path.join('agents', `forgebee-${file}`);
    if (isUserOwned(rel)) continue;
    fs.mkdirSync(path.join(TARGET, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(TARGET, rel), rewrite(join(out, body)));
    created.push(rel);
    count++;
  }
  return { count, skipped };
}

function installCommands(created) {
  const srcDir = path.join(SRC, 'commands');
  const keep = new Set(['description', 'agent', 'subtask']);
  let count = 0;
  for (const file of listDir(srcDir, e => e.isFile() && e.name.endsWith('.md'))) {
    const { fm, body } = splitFrontmatter(fs.readFileSync(path.join(srcDir, file), 'utf-8'), file);
    const kept = fm.filter(l => keep.has((l.match(/^([A-Za-z-]+):/) || [])[1]));
    const rel = path.join('commands', file);
    if (isUserOwned(rel)) continue;
    fs.mkdirSync(path.join(TARGET, 'commands'), { recursive: true });
    fs.writeFileSync(path.join(TARGET, rel), rewrite(join(kept, body)));
    created.push(rel);
    count++;
  }
  return count;
}

function printSummary({ skills, agents, commands }) {
  const lines = [
    '',
    'ForgeBee installed for OpenCode.',
    `  Target:   ${TARGET}`,
    `  Skills:   ${skills}`,
    `  Agents:   ${agents.count}`,
    `  Commands: ${commands}`,
    `  Skipped agents: ${agents.skipped.join('; ') || 'none'}`,
    ...(kept.length ? [`  Kept your existing files: ${kept.join(', ')}`] : []),
    '',
    'Hooks do not run on OpenCode: orchestrator mode, guards, learning, and PM sync are off.',
    '',
    'Rules: add this to your opencode.json (the installer does not edit it):',
    JSON.stringify({ instructions: [path.join(ROOT, 'rules', 'common', 'general.md')] }, null, 2),
    `Optional, add for your stack: ${['php', 'python', 'typescript'].map(l => path.join(ROOT, 'rules', l, 'conventions.md')).join(', ')}`,
    'OpenCode falls back to CLAUDE.md when no AGENTS.md exists.',
    'Model: agents have no model set. They inherit the model of the calling agent.',
  ];
  console.log(lines.join('\n'));
}

function main() {
  const version = JSON.parse(fs.readFileSync(path.join(SRC, '.claude-plugin', 'plugin.json'), 'utf-8')).version;
  console.log(`ForgeBee ${version} -> OpenCode\n  Source: ${SRC}\n  Target: ${TARGET}`);
  removeOldInstall();
  copyResources();
  const created = [];
  const skills = installSkills(created);
  const agents = installAgents(created);
  const commands = installCommands(created);
  fs.writeFileSync(MANIFEST, JSON.stringify({ version, created }, null, 2) + '\n');
  printSummary({ skills, agents, commands });
}

try {
  main();
} catch (err) {
  console.error(`Install failed: ${err.message}`);
  process.exit(1);
}
