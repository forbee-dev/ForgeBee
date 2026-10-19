#!/usr/bin/env node
/**
 * compress-learnings.js
 * Compress entries in .claude/learnings/learnings.md older than N days.
 *
 * Implements W8 from docs/planning/5.1.0-comprehensive-plan.md.
 *
 * Rules:
 *   - Preserve EXACTLY: code blocks (fenced), file paths, line refs (path:line),
 *     ISO dates, URLs, commit hashes (7+ hex), error messages in quotes.
 *   - Compress prose: drop articles (the/a/an), filler (actually, basically,
 *     in order to), pleasantries. Allow fragments.
 *   - Refuse to compress entries containing sensitive markers (.env, credentials,
 *     .ssh/, .aws/, private key markers, "secret", "password").
 *   - Archive original to .claude/learnings/archive/learnings-YYYY-Q<N>.md
 *     before compressing.
 *
 * Usage:
 *   node compress-learnings.js [--days N] [--dry-run]
 *
 * Default age threshold: 14 days. Override with --days or FORGEBEE_LEARN_AGE_DAYS env.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LEARNINGS_FILE = path.join(PROJECT_DIR, '.claude', 'learnings', 'learnings.md');
const ARCHIVE_DIR = path.join(PROJECT_DIR, '.claude', 'learnings', 'archive');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const daysFlag = argv.indexOf('--days');
const parsedDays = daysFlag >= 0
  ? parseInt(argv[daysFlag + 1], 10)
  : parseInt(process.env.FORGEBEE_LEARN_AGE_DAYS || '14', 10);
const ageDays = Number.isFinite(parsedDays) ? parsedDays : 14;

const SENSITIVE_PATTERNS = [
  /\.env\b/i,
  /credentials?/i,
  /\.ssh\//i,
  /\.aws\//i,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /\bsecret(s|_key)?\b/i,
  /\bapi[_-]?key\b/i,
  /\bpassword\b/i,
  /\bbearer [A-Za-z0-9._-]+/i,
];

const FILLER_PATTERNS = [
  // articles at word boundaries
  { from: /\b(the|a|an)\s+/g, to: '' },
  // common fillers
  { from: /\b(actually|basically|essentially|literally|simply|just|really|very)\s+/gi, to: '' },
  { from: /\bin order to\b/gi, to: 'to' },
  { from: /\b(I |we )?(noticed|observed|realized|found) that\b/gi, to: '' },
  // pleasantries that LLMs add
  { from: /\b(of course|naturally|obviously|clearly|as expected),?\s+/gi, to: '' },
  // collapse multiple spaces
  { from: /(\S)  +/g, to: '$1 ' },
];

/**
 * Split learnings.md into sessions delimited by `### Session: <ISO timestamp>` headers.
 * Returns an array of { header, body, date, raw }.
 */
function parseSessions(content) {
  const sessionRegex = /^### Session:\s*(\S+)/m;
  const lines = content.split('\n');
  const sessions = [];
  let preamble = [];
  let current = null;

  for (const line of lines) {
    const m = sessionRegex.exec(line);
    if (m) {
      if (current) sessions.push(current);
      current = { header: line, date: parseDate(m[1]), bodyLines: [], raw: [line] };
    } else if (current) {
      current.bodyLines.push(line);
      current.raw.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sessions.push(current);

  return { preamble: preamble.join('\n'), sessions };
}

function parseDate(s) {
  // Accept ISO timestamps and "YYYY-MM-DD HH:MM UTC"
  const d = new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function ageInDays(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function isSensitive(text) {
  return SENSITIVE_PATTERNS.some(re => re.test(text));
}

/**
 * Compress a body string while preserving fenced code blocks, paths, dates, etc.
 * Returns { compressed, ratio }.
 */
function compressBody(body) {
  // Stash code fences and inline code, replace with placeholders
  const stash = [];
  let stashed = body.replace(/```[\s\S]*?```|`[^`]+`/g, m => {
    stash.push(m);
    return `\u0000${stash.length - 1}\u0000`;
  });

  // Quoted text (error messages) is kept verbatim; stash it too
  stashed = stashed.replace(/"[^"\n]*"|“[^”\n]*”/g, m => {
    stash.push(m);
    return `\u0000${stash.length - 1}\u0000`;
  });

  // Apply filler rules (paths/dates/urls left alone — they're not articles/fillers)
  for (const { from, to } of FILLER_PATTERNS) {
    stashed = stashed.replace(from, to);
  }

  // NUL-delimited placeholders cannot occur in learnings text, so user text never collides.
  // Two passes: a stashed quote can hold a stashed code span, never deeper.
  const restore = t => t.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
  const compressed = restore(restore(stashed));

  return {
    compressed,
    ratio: body.length > 0 ? compressed.length / body.length : 1,
  };
}

function archiveOriginal(content) {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const archiveName = `learnings-${now.getFullYear()}-Q${quarter}.md`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const header = `\n\n--- Archived ${now.toISOString()} ---\n\n`;
  fs.appendFileSync(archivePath, header + content);
  return archivePath;
}

function main() {
  if (!fs.existsSync(LEARNINGS_FILE)) {
    console.log(`No learnings file at ${LEARNINGS_FILE} — nothing to compress.`);
    return;
  }

  const original = fs.readFileSync(LEARNINGS_FILE, 'utf8');
  const { preamble, sessions } = parseSessions(original);

  let compressed_n = 0;
  let skipped_recent = 0;
  let skipped_sensitive = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  const out = [preamble];
  const archived = [];

  for (const s of sessions) {
    const body = s.bodyLines.join('\n');
    totalBefore += body.length;

    if (body.trimStart().startsWith('<!-- compressed -->')) {
      out.push(s.raw.join('\n'));
      totalAfter += body.length;
      continue;
    }
    if (!s.date || ageInDays(s.date) < ageDays) {
      skipped_recent++;
      out.push(s.raw.join('\n'));
      totalAfter += body.length;
      continue;
    }
    if (isSensitive(body)) {
      skipped_sensitive++;
      out.push(s.raw.join('\n'));
      totalAfter += body.length;
      continue;
    }

    const { compressed } = compressBody(body);
    archived.push(s.raw.join('\n'));
    compressed_n++;
    totalAfter += compressed.length;
    out.push([s.header, '<!-- compressed -->', compressed].join('\n'));
  }

  const finalContent = out.join('\n').replace(/\n{3,}/g, '\n\n');

  console.log(`Sessions found: ${sessions.length}`);
  console.log(`Compressed: ${compressed_n}`);
  console.log(`Skipped (too recent, <${ageDays} days): ${skipped_recent}`);
  console.log(`Skipped (sensitive content): ${skipped_sensitive}`);
  if (totalBefore > 0) {
    console.log(`Size: ${totalBefore} → ${totalAfter} chars (${Math.round((1 - totalAfter / totalBefore) * 100)}% reduction)`);
  }

  if (dryRun) {
    console.log('--dry-run: no files changed');
    return;
  }

  if (compressed_n > 0) {
    const archivePath = archiveOriginal(archived.join('\n'));
    // Atomic write: stage to a temp file then rename, so a crash mid-write can
    // never truncate learnings.md (the original is already safely archived above).
    const tmpFile = `${LEARNINGS_FILE}.tmp.${process.pid}`;
    fs.writeFileSync(tmpFile, finalContent);
    fs.renameSync(tmpFile, LEARNINGS_FILE);
    console.log(`Original archived to: ${archivePath}`);
    console.log(`Compressed file written to: ${LEARNINGS_FILE}`);
  } else {
    console.log('Nothing to compress.');
  }
}

try {
  main();
} catch (e) {
  // The atomic rename above guarantees learnings.md is never half-written;
  // report the failure and exit non-zero so /learn surfaces it.
  console.error(`compress-learnings failed: ${e.message}`);
  process.exit(1);
}
