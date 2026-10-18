#!/usr/bin/env node
/**
 * learning-cli.js
 * Code learnings for ForgeBee Continuous Learning: what a session worked out
 * about the code, stored in <project>/docs/learnings/, committed with the code,
 * and recalled on prompts that name the same files or words.
 *
 * Commands:
 *   add     - Save one learning (body on stdin)
 *   recall  - Print the learnings that match a prompt, as JSON
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let SECRET_PATTERNS = null;
try {
  ({ SECRET_PATTERNS } = require('../../../hooks/scripts/_common.js'));
} catch (e) { /* safeTitle fails closed below */ }
// Titles are prose: the loose redactOnly shapes (for example `keys: value`) would mangle them.
const TITLE_REDACTORS = (SECRET_PATTERNS || [])
  .filter(p => !p.redactOnly)
  .map(p => ({ re: new RegExp(p.re.source, p.re.flags.includes('g') ? p.re.flags : p.re.flags + 'g'), label: p.label }));

const LEARNINGS_REL = 'docs/learnings';
const MAX_TITLE_CHARS = 200;
const MAX_BODY_BYTES = 6 * 1024;
const MAX_TOUCHES = 12;
const MAX_FILES = 500;
const MAX_READ_BYTES = 64 * 1024;
const LEAD_CHARS = 180;
// A path-shaped word: optional dirs, then a name with an extension.
const MENTION = /(?:^|[\s(`'"[])((?:[\w.-]+\/)*[\w-][\w.-]*\.[A-Za-z][A-Za-z0-9]{0,5})(?=$|[\s:#)`'",.;\]])/gm;
const EXCLUDED = /^(?:\.claude|docs\/learnings)(?:\/|$)|(?:^|\/)node_modules(?:\/|$)/;
const STOP = new Set((
  'the and for with from that this what when where which into does how why are was were not but you your our out ' +
  "its it's can should would could about after before over under use using used fix find make"
).split(' '));

// No shell: dir comes from the environment or hook stdin.
function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
  } catch (e) {
    return '';
  }
}

function projectRoot() {
  if (process.env.CLAUDE_PROJECT_DIR && fs.existsSync(process.env.CLAUDE_PROJECT_DIR)) {
    return path.resolve(process.env.CLAUDE_PROJECT_DIR);
  }
  return git(process.cwd(), ['rev-parse', '--show-toplevel']).trim() || process.cwd();
}

// ─────────────────────────────────────────────
// Format: frontmatter + markdown body
// ─────────────────────────────────────────────

// Plain when it round-trips, else a JSON string (valid YAML double-quoted).
function scalar(s) {
  return /^[A-Za-z0-9][^:#\n"'{}[\],&*!|>%@`]*$/.test(s) && s.trim() === s ? s : JSON.stringify(s);
}

function unscalar(v) {
  const s = v.trim();
  if (s.startsWith('"')) {
    try { return JSON.parse(s); } catch (e) { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function renderLearning({ title, author, date, standing, touches, body }) {
  const fm = ['---', `title: ${scalar(title)}`, `author: ${scalar(author)}`, `date: ${date}`];
  if (standing) fm.push('standing: true');
  if (touches.length) fm.push('touches:', ...touches.map(t => `  - ${scalar(t)}`));
  fm.push('---', '');
  return `${fm.join('\n')}\n${body.trim()}\n`;
}

function parseLearning(text, file) {
  const lines = String(text).split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return null;
  const data = { touches: [] };
  let list = null;
  for (const line of lines.slice(1, end)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && list) {
      data[list].push(unscalar(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    list = null;
    if (kv[1] === 'touches') {
      list = 'touches';
      if (kv[2].trim()) data.touches = kv[2].replace(/^\[|\]$/g, '').split(',').map(unscalar).filter(Boolean);
    } else {
      data[kv[1]] = unscalar(kv[2]);
    }
  }
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) return null;
  return {
    file,
    title,
    author: data.author || '',
    date: String(data.date || ''),
    standing: data.standing === 'true',
    touches: data.touches.map(String),
    body: lines.slice(end + 1).join('\n').trim(),
  };
}

function safeTitle(title) {
  if (!SECRET_PATTERNS) return '[REDACTED:title]';
  let out = String(title);
  for (const r of TITLE_REDACTORS) out = out.replace(r.re, `[REDACTED:${r.label}]`);
  return out;
}

// First line under `## <heading>`, or null when the section is missing.
function sectionLead(body, heading) {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex(l => l.trim().toLowerCase() === `## ${heading.toLowerCase()}`);
  if (at === -1) return null;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('## ')) break;
    if (l) return l.replace(/^[-*]\s+/, '');
  }
  return null;
}

function decidedLead(learning) {
  const lead = sectionLead(learning.body, 'Decided')
    || learning.body.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')) || '';
  return lead.length > LEAD_CHARS ? lead.slice(0, LEAD_CHARS - 1) + '…' : lead;
}

// ─────────────────────────────────────────────
// Reading the store
// ─────────────────────────────────────────────

function readHead(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(MAX_READ_BYTES);
    const n = fs.readSync(fd, buf, 0, MAX_READ_BYTES, 0);
    return buf.toString('utf8', 0, n);
  } finally {
    fs.closeSync(fd);
  }
}

function listLearnings(projectDir) {
  const dir = path.join(projectDir, LEARNINGS_REL);
  let names;
  try {
    names = fs.readdirSync(dir).filter(n => n.endsWith('.md')).sort().slice(-MAX_FILES);
  } catch (e) {
    return [];
  }
  const out = [];
  for (const name of names) {
    try {
      const full = path.join(dir, name);
      if (!fs.lstatSync(full).isFile()) continue;
      const learning = parseLearning(readHead(full), name);
      if (learning) out.push(learning);
    } catch (e) { /* unreadable file: skip */ }
  }
  return out;
}

// ─────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────

function terms(s) {
  return [...new Set(String(s).toLowerCase().split(/[^a-z0-9_]+/).filter(t => t.length >= 3 && !STOP.has(t)))];
}

// A bare name in the prompt (`learn-auto.js`) also matches a deeper touch.
function sameFile(a, b) {
  return a === b || a.endsWith('/' + b) || b.endsWith('/' + a);
}

function findLearnings(learnings, prompt, files = [], limit = 3) {
  const q = terms(prompt);
  const out = [];
  for (const learning of learnings) {
    const title = new Set(terms(learning.title));
    const text = new Set(terms(`${learning.body} ${learning.touches.join(' ')}`));
    let score = 0;
    let matched = 0;
    for (const t of q) {
      if (title.has(t)) { score += 3; matched++; } else if (text.has(t)) { score += 1; matched++; }
    }
    const shared = [...new Set(learning.touches)].filter(t => files.some(f => sameFile(f, t)));
    score += shared.length * 4;
    const clears = shared.length > 0 || matched >= 2 || [...title].some(t => q.includes(t));
    if (clears && score >= 3) out.push({ learning, score, shared });
  }
  return out
    .sort((a, b) => b.score - a.score || b.learning.date.localeCompare(a.learning.date))
    .slice(0, limit);
}

function relPath(projectDir, p) {
  const raw = String(p).trim().replace(/^\.\//, '');
  const rel = path.isAbsolute(raw) ? path.relative(projectDir, raw) : path.normalize(raw);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

function mentionedPaths(text, projectDir) {
  const out = [];
  for (const m of String(text).matchAll(MENTION)) {
    const rel = relPath(projectDir, m[1]);
    if (rel && !out.includes(rel)) out.push(rel);
  }
  return out;
}

// ─────────────────────────────────────────────
// Add Command
// ─────────────────────────────────────────────

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function slug(title) {
  return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/).filter(Boolean).slice(0, 6).join('-') || 'learning';
}

// `git status -z`: NUL-separated `XY path`; a rename or copy adds the old path after it.
function changedFiles(projectDir) {
  const root = git(projectDir, ['rev-parse', '--show-toplevel']).trim();
  if (!root) return [];
  const parts = git(projectDir, ['status', '--porcelain', '-z']).split('\0');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    if (/^[RC]/.test(entry)) i++;
    const name = entry.slice(3);
    if (name.endsWith('/')) continue;
    const rel = relPath(projectDir, path.join(root, name));
    if (rel) out.push(rel);
  }
  return out;
}

function defaultTouches(projectDir, body) {
  const mentioned = mentionedPaths(body, projectDir).filter(f => fs.existsSync(path.join(projectDir, f)));
  return [...mentioned, ...changedFiles(projectDir)];
}

function author(projectDir) {
  const name = git(projectDir, ['config', 'user.name']).trim() || process.env.USER || 'unknown';
  return name.replace(/\s+/g, ' ');
}

function cmdAdd(options) {
  let redactForPrompt;
  try {
    ({ redactForPrompt } = require('../../../hooks/scripts/_common.js'));
  } catch (e) {
    console.error('Error: redactor unavailable. Refusing to save unredacted text.');
    return 1;
  }

  const title = String(options.title || '').replace(/\s+/g, ' ').trim();
  if (!title || title.length > MAX_TITLE_CHARS) {
    console.error(`Error: --title is required, at most ${MAX_TITLE_CHARS} characters.`);
    return 1;
  }
  let body = '';
  if (!process.stdin.isTTY) {
    try { body = fs.readFileSync(0, 'utf8').trim(); } catch (e) { body = ''; }
  }
  if (!body) {
    console.error('Error: pass the learning body on stdin (## Decided, ## Tried and ruled out, ## Watch out).');
    return 1;
  }
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    console.error(`Error: body is over ${MAX_BODY_BYTES} bytes. Write a summary, not a transcript.`);
    return 1;
  }

  const projectDir = projectRoot();
  const candidates = options.touches !== undefined
    ? String(options.touches).split(',').map(t => relPath(projectDir, t)).filter(Boolean)
    : defaultTouches(projectDir, body);
  const touches = [...new Set(candidates)].filter(t => !EXCLUDED.test(t)).slice(0, MAX_TOUCHES);

  const cleanTitle = safeTitle(title);
  const date = localDate();
  const dir = path.join(projectDir, LEARNINGS_REL);
  fs.mkdirSync(dir, { recursive: true });
  const content = renderLearning({
    title: cleanTitle, author: author(projectDir), date, standing: !!options.standing, touches, body: redactForPrompt(body),
  });

  // 'wx' fails on an existing name, so a learning is never overwritten.
  const base = `${date}-${slug(cleanTitle)}`;
  let name;
  for (let n = 1; n < 1000; n++) {
    name = n === 1 ? `${base}.md` : `${base}-${n}.md`;
    try {
      fs.writeFileSync(path.join(dir, name), content, { flag: 'wx' });
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      name = null;
    }
  }
  if (!name) {
    console.error(`Error: no free file name for ${base}.`);
    return 1;
  }

  console.log(`saved learning ${LEARNINGS_REL}/${name} (touches: ${touches.length})`);
  console.log(`close your reply with: 📝 Saved learning: ${cleanTitle}`);
  return 0;
}

// ─────────────────────────────────────────────
// Recall Command
// ─────────────────────────────────────────────

function cmdRecall(options) {
  const prompt = String(options.prompt || '');
  const projectDir = projectRoot();
  const files = [
    ...mentionedPaths(prompt, projectDir),
    ...String(options.files || '').split(',').map(f => relPath(projectDir, f)).filter(Boolean),
  ];
  const limit = Math.max(1, parseInt(options.limit, 10) || 3);
  const hits = findLearnings(listLearnings(projectDir), prompt, files, limit).map(h => ({
    file: `${LEARNINGS_REL}/${h.learning.file}`,
    title: h.learning.title,
    author: h.learning.author,
    date: h.learning.date,
    standing: h.learning.standing,
    touches: h.learning.touches,
    decided: decidedLead(h.learning),
    score: h.score,
    shared: h.shared,
  }));
  console.log(JSON.stringify(hits, null, 2));
  return 0;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--standing') options.standing = true;
    else if (['--title', '--touches', '--prompt', '--files', '--limit'].includes(arg) && args[i + 1] !== undefined) {
      options[arg.slice(2)] = args[++i];
    }
  }
  return { command: args[0] || 'help', options };
}

function main() {
  const { command, options } = parseArgs();
  let exitCode;
  if (command === 'add') exitCode = cmdAdd(options);
  else if (command === 'recall') exitCode = cmdRecall(options);
  else {
    console.log('ForgeBee Learning CLI');
    console.log('\nCommands:');
    console.log('  add     --title "<what it was about>" [--touches a,b] [--standing]   body on stdin');
    console.log('  recall  --prompt "<text>" [--files a,b] [--limit 3]                  prints JSON');
    exitCode = command === 'help' ? 0 : 1;
  }
  process.exit(exitCode);
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    LEARNINGS_REL,
    parseLearning,
    listLearnings,
    findLearnings,
    mentionedPaths,
    decidedLead,
    relPath,
    safeTitle,
  };
}
