#!/usr/bin/env node
/**
 * load-context-rules.js
 * Inject the active context and language rules as SessionStart additionalContext.
 *
 * The harness drops an oversized payload to disk and injects only a short preview,
 * so the payload stays under MAX_BYTES: whole files go in most-specific first, code
 * examples are stripped, and a file that does not fit is listed as a path to Read.
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  findForgebeeRoot,
  readFile,
  output,
} = require('./_common.js');

// Body budget; header and the deferred-path line add ~300 bytes on top.
const MAX_BYTES = 3200;

function main() {
  try {
    const projectDir = getProjectDir();
    const forgebeeRoot = findForgebeeRoot();

    // Active context first: it is small and sets the session mode, so rules must not crowd it out.
    const files = [];
    const contextPath = path.join(forgebeeRoot, 'contexts', `${activeContext(projectDir)}.md`);
    if (fs.existsSync(contextPath)) files.push(contextPath);

    detectLanguages(projectDir).forEach(lang => {
      files.push(...mdFiles(path.join(forgebeeRoot, 'rules', lang)));
    });
    files.push(...mdFiles(path.join(forgebeeRoot, 'rules', 'common')));

    const included = [];
    const deferred = [];
    let size = 0;
    for (const file of files) {
      const body = stripCodeBlocks(readFile(file) || '');
      if (!body) continue;
      const bytes = Buffer.byteLength(body, 'utf8');
      if (size + bytes <= MAX_BYTES) {
        included.push(body);
        size += bytes;
      } else {
        const rel = path.relative(projectDir, file);
        deferred.push(rel.startsWith('..') ? file : rel);
      }
    }

    if (!included.length && !deferred.length) process.exit(0);

    const parts = ['## ForgeBee Rules (always apply)', '', ...included];
    if (deferred.length) {
      parts.push('', `More rules — Read when relevant: ${deferred.join(', ')}`);
    }

    output({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: parts.join('\n'),
      },
    });
  } catch (error) {
    // Best-effort context hook — never block session start.
    process.exit(0);
  }
}

function activeContext(projectDir) {
  const stored = readFile(path.join(projectDir, '.claude', 'session-cache', 'active-context'));
  const name = stored ? stored.trim() : '';
  return ['dev', 'research', 'review'].includes(name) ? name : 'dev';
}

function mdFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

// Examples are the largest part of each file; the rules survive without them.
function stripCodeBlocks(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(Bad|Good):\s*$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Prefer the triage JSON; fall back to config files when it is missing or unreadable.
function detectLanguages(projectDir) {
  const langs = new Set();
  try {
    const triage = JSON.parse(readFile(path.join(projectDir, '.claude', 'session-cache', 'project-triage.json')));
    if ((triage.node?.framework || 'none') !== 'none') langs.add('typescript');
    if ((triage.wordpress?.type || 'none') !== 'none' || (triage.php?.framework || 'none') !== 'none') langs.add('php');
    if ((triage.python?.framework || 'none') !== 'none') langs.add('python');
    return langs;
  } catch (e) {
    const has = f => fs.existsSync(path.join(projectDir, f));
    if (has('tsconfig.json') || has('package.json')) langs.add('typescript');
    if (has('composer.json') || has('wp-config.php')) langs.add('php');
    if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) langs.add('python');
    return langs;
  }
}

main();
