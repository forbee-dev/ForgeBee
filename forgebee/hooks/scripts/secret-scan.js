#!/usr/bin/env node
/**
 * secret-scan.js — Block commits/pushes that introduce hardcoded secrets.
 *
 * PreToolUse(Bash) hook. permission-guard gates secret *paths* (.env, .ssh); this
 * gates secret *content* in the diff being committed/pushed — the counterpart the
 * security-auditor / review-security agents imply but no hook enforced. Runs only
 * when the command is a git commit/push (fast exit otherwise), scans ADDED lines
 * for known key shapes, and blocks (exit 2) with an override path.
 *
 * Override a false positive: FORGEBEE_ALLOW_SECRET=1
 * Disable entirely:          FORGEBEE_DISABLE_SECRET_SCAN=1
 *
 * Best-effort: any internal error exits 0 (never wedge the user's git).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const common = require('./_common.js');

const PATTERNS = common.SECRET_PATTERNS.filter(p => !p.redactOnly);

// execSync's 1 MB default would throw on a big diff and silently skip the scan.
const GIT_OPTS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] };
// Total bytes read from new files; bounds `git add -f .` over node_modules
// so the scan finishes inside the 5 s hook timeout.
const MAX_FILE_SCAN_BYTES = 16 * 1024 * 1024;

// argv form: pathspecs come from the command text and must not reach a shell.
function git(args) {
  try {
    return { success: true, output: execFileSync('git', args, GIT_OPTS) };
  } catch (e) {
    return { success: false, output: '', error: e };
  }
}

// Quote-aware split into simple commands, so `"my dir/k.js"` stays one word and
// a quoted `;` does not end a command.
function shellCommands(cmd) {
  const cmds = [[]];
  let tok = null;
  let redirect = false;
  const end = () => {
    if (tok !== null && !redirect) cmds[cmds.length - 1].push(tok);
    if (tok !== null) redirect = false;
    tok = null;
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'") {
      const j = cmd.indexOf("'", i + 1);
      const stop = j < 0 ? cmd.length : j;
      tok = (tok || '') + cmd.slice(i + 1, stop);
      i = stop;
    } else if (c === '"') {
      tok = tok || '';
      for (i++; i < cmd.length && cmd[i] !== '"'; i++) {
        if (cmd[i] === '\\' && '"\\$`\n'.includes(cmd[i + 1])) i++;
        tok += cmd[i];
      }
    } else if (c === '\\') {
      if (cmd[i + 1] !== '\n') tok = (tok || '') + (cmd[i + 1] || '');
      i++;
    } else if (c === ' ' || c === '\t') {
      end();
    } else if (c === '<' || c === '>') {
      // `2>&1 | tail` must not add `2` and `1` as refspecs or pathspecs.
      if (!/^\d+$/.test(tok || '')) end();
      tok = null;
      while (cmd[i + 1] === '>' || cmd[i + 1] === '&') i++;
      redirect = true;
    } else if ('\n;&|()'.includes(c)) {
      end();
      redirect = false;
      cmds.push([]);
    } else {
      tok = (tok || '') + c;
    }
  }
  end();
  return cmds.filter(c => c.length);
}

// Global options that take the next word as their value.
const GIT_GLOBAL_WITH_ARG = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--attr-source']);

// `git [global opts] <sub> args` → { dir, sub, args }; dir applies every `-C`.
function gitCalls(cmd) {
  const calls = [];
  for (const words of shellCommands(cmd)) {
    let i = 0;
    while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
    if (i >= words.length || path.basename(words[i]) !== 'git') continue;
    let dir = process.cwd();
    for (i++; i < words.length && words[i].startsWith('-'); i++) {
      if (words[i] === '-C') dir = path.resolve(dir, words[++i] || '');
      else if (GIT_GLOBAL_WITH_ARG.has(words[i])) i++;
    }
    if (i < words.length) calls.push({ dir, sub: words[i], args: words.slice(i + 1) });
  }
  return calls;
}

// git accepts any unambiguous prefix of a long option: `--forc` is `--force`.
// Returns { name, neg } or null.
function longOpt(tok, names) {
  const word = tok.slice(2).split('=')[0];
  const pick = w => {
    if (!w) return null;
    if (names.includes(w)) return w;
    const c = names.filter(n => n.startsWith(w));
    return c.length === 1 ? c[0] : null;
  };
  const name = pick(word);
  if (name) return { name, neg: false };
  const negated = word.startsWith('no-') ? pick(word.slice(3)) : null;
  return negated ? { name: negated, neg: true } : null;
}

// From `git add -h` / `git push -h` (git 2.54); needed to judge prefix uniqueness.
const ADD_LONG = ['dry-run', 'verbose', 'interactive', 'patch', 'auto-advance', 'unified', 'inter-hunk-context', 'edit',
  'force', 'update', 'renormalize', 'intent-to-add', 'all', 'ignore-removal', 'refresh', 'ignore-errors', 'ignore-missing',
  'sparse', 'chmod', 'pathspec-from-file', 'pathspec-file-nul'];
const PUSH_LONG = ['all', 'branches', 'mirror', 'delete', 'tags', 'dry-run', 'porcelain', 'force', 'force-with-lease',
  'force-if-includes', 'repo', 'set-upstream', 'thin', 'receive-pack', 'exec', 'quiet', 'verbose', 'progress', 'prune',
  'recurse-submodules', 'verify', 'no-verify', 'follow-tags', 'signed', 'atomic', 'push-option', 'ipv4', 'ipv6'];
const PUSH_WITH_ARG = new Set(['repo', 'receive-pack', 'exec', 'push-option', 'recurse-submodules']);

// `git add -f` stages ignored files, which `--exclude-standard` hides.
// Returns the pathspecs of every forced add in the command.
function forcedAddPaths(calls) {
  const paths = [];
  for (const c of calls) {
    if (c.sub !== 'add') continue;
    let force = false;
    let endOfOpts = false;
    const args = [];
    for (const t of c.args) {
      if (!endOfOpts && t === '--') endOfOpts = true;
      else if (!endOfOpts && t.startsWith('--')) {
        const o = longOpt(t, ADD_LONG);
        if (o && o.name === 'force') force = !o.neg;
      } else if (!endOfOpts && t.startsWith('-') && t !== '-') force = force || /^-[A-Za-z]*f[A-Za-z]*$/.test(t);
      else if (t) args.push(t.startsWith(':') ? t : path.resolve(c.dir, t)); // `:/` is already repo-rooted
    }
    if (force) paths.push(...(args.length ? args : [':/']));
  }
  return paths;
}

// Revisions whose history the push commands send: `src:dst` → src,
// `--all` → branches, `--mirror` → every ref, `--tags` adds tags.
function pushRevs(calls) {
  const revs = [];
  let found = false;
  for (const c of calls) {
    if (c.sub !== 'push') continue;
    found = true;
    const positional = [];
    let all = false;
    let mirror = false;
    let tags = false;
    let del = false;
    let endOfOpts = false;
    for (let i = 0; i < c.args.length; i++) {
      const t = c.args[i];
      if (endOfOpts || !t.startsWith('-') || t === '-') positional.push(t);
      else if (t === '--') endOfOpts = true;
      else if (t.startsWith('--')) {
        const o = longOpt(t, PUSH_LONG);
        if (!o) continue;
        if (!o.neg && !t.includes('=') && PUSH_WITH_ARG.has(o.name)) i++;
        if (o.name === 'all' || o.name === 'branches') all = !o.neg;
        else if (o.name === 'mirror') mirror = !o.neg;
        else if (o.name === 'tags') tags = !o.neg;
        else if (o.name === 'delete') del = !o.neg;
      } else {
        const o = t.indexOf('o', 1); // -o takes the rest of the word or the next word
        if (o === t.length - 1) i++;
        if ((o < 0 ? t : t.slice(0, o)).includes('d')) del = true;
      }
    }
    if (del) continue; // deletions send no content
    const srcs = [];
    const refspecs = positional.slice(1);
    for (let i = 0; i < refspecs.length; i++) {
      const r = refspecs[i] === 'tag' && i + 1 < refspecs.length ? `refs/tags/${refspecs[++i]}` : refspecs[i];
      const src = r.replace(/^\+/, '').split(':')[0];
      // Empty src is `:dst` (delete); a leading `-` would reach git log as an option.
      if (src && !src.startsWith('-')) srcs.push(src.includes('*') ? `--glob=${src}` : src);
    }
    if (all) revs.push('--branches');
    if (mirror) revs.push('--all');
    if (tags) revs.push('--tags');
    if (!srcs.length && !all && !mirror) srcs.push('HEAD');
    revs.push(...srcs);
  }
  return found ? [...new Set(revs)] : ['HEAD'];
}

// PreToolUse runs before `git add` in `git add X && git commit`, so new files
// are not in the diffs yet. Returns their text as added lines, or null.
function newFilesAsDiff(forced) {
  const lists = [git(['ls-files', '-z', '--others', '--exclude-standard', '--', ':/'])];
  if (forced.length) lists.push(git(['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', ...forced]));
  if (lists.some(r => !r.success)) return null;
  const files = new Set(lists.flatMap(r => r.output.split('\0').filter(Boolean)));
  let budget = MAX_FILE_SCAN_BYTES;
  const skipped = [];
  let diff = '';
  for (const rel of files) {
    try {
      const file = path.resolve(process.cwd(), rel);
      const st = fs.lstatSync(file);
      if (!st.isFile()) continue;
      if (st.size > budget) {
        skipped.push(rel);
        continue;
      }
      budget -= st.size;
      const buf = fs.readFileSync(file);
      if (buf.subarray(0, 8000).includes(0)) continue; // binary
      diff += buf.toString('utf8').split('\n').map(l => `+${l}`).join('\n') + '\n';
    } catch (e) {
      // vanished or unreadable — git add will fail on it too
    }
  }
  return { diff, skipped };
}

// stderr on exit 0 reaches neither the user nor the model; JSON on stdout does.
function warnUnscanned(why) {
  const msg = `secret-scan could not read the diff (${why}); verify manually that no secret is committed or pushed.`;
  console.log(JSON.stringify({
    systemMessage: msg,
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: msg },
  }));
  process.exit(0);
}

// Skip lines that are clearly placeholders / examples / test fixtures.
const PLACEHOLDER = /\b(example|placeholder|your[_-]?(api[_-]?)?key|xxxx+|changeme|dummy|sample|redacted|fake|test[_-]?key|<[^>]+>)\b/i;

function scanAddedLines(diff) {
  const hits = [];
  for (const line of diff.split('\n')) {
    // Only added content; an added line may itself start with `++`.
    if (!line.startsWith('+') || /^\+\+\+ (?:"?[ab]\/|\/dev\/null)/.test(line)) continue;
    const body = line.slice(1);
    if (PLACEHOLDER.test(body)) continue;
    for (const p of PATTERNS) {
      const m = body.match(p.re);
      if (m) {
        const tok = m[0];
        const preview = tok.length > 14 ? `${tok.slice(0, 7)}…${tok.slice(-3)}` : tok;
        hits.push({ kind: p.kind, preview });
        break; // one hit per line is enough
      }
    }
  }
  return hits;
}

async function main() {
  if (process.env.FORGEBEE_DISABLE_SECRET_SCAN === '1') process.exit(0);

  const input = await common.readStdinJson();
  if (!input || input.tool_name !== 'Bash') process.exit(0);

  const cmd = (input.tool_input && input.tool_input.command) || '';
  const isCommit = /\bgit\b[^|;&]*\bcommit\b/.test(cmd);
  const isPush = /\bgit\b[^|;&]*\bpush\b/.test(cmd);
  if (!isCommit && !isPush) process.exit(0);

  if (!common.isGitRepo()) process.exit(0);

  // Commit: staged and worktree separately — `git add s.js; echo clean > s.js`
  // leaves the secret only in the index, which `diff HEAD` never shows; the
  // worktree diff covers `-a`.
  // Push: each commit no remote has yet, one by one — a net diff hides a secret
  // added then removed, and plain `log -p` shows nothing for a merge's own
  // resolution. Root commit included, so a new branch or repo is fully scanned.
  const calls = gitCalls(cmd);
  const reads = [];
  if (isCommit) {
    reads.push(git(['diff', '--no-color', '--cached']));
    const worktree = git(['diff', '--no-color', 'HEAD']);
    reads.push(worktree.success ? worktree : git(['diff', '--no-color'])); // unborn HEAD (first commit)
  } else {
    const revs = pushRevs(calls);
    const range = [...revs, '--not', '--remotes'];
    let log = revs.length ? git(['log', '-p', '--no-color', '--format=', '--diff-merges=first-parent', ...range]) : null;
    if (log && !log.success && /diff-merges/.test(String(log.error && log.error.stderr))) { // git < 2.31
      log = git(['log', '-p', '--no-color', '--format=', '-m', '--first-parent', ...range]);
    }
    if (log) reads.push(log);
  }
  let diff = reads.map(r => r.output).join('\n');
  const problems = reads.filter(r => !r.success)
    .map(r => (r.error && r.error.code === 'ENOBUFS' ? 'diff over 64 MB' : 'git error'));

  // The regex still catches `bash -c "git add …"`, which the parser does not open.
  if (isCommit && (/\bgit\s+add\b/.test(cmd) || calls.some(c => c.sub === 'add'))) {
    const extra = newFilesAsDiff(forcedAddPaths(calls));
    if (extra === null) {
      problems.push('untracked files could not be listed');
    } else {
      diff += '\n' + extra.diff;
      if (extra.skipped.length) {
        const more = extra.skipped.length > 5 ? ` and ${extra.skipped.length - 5} more` : '';
        problems.push(`not scanned, over the ${MAX_FILE_SCAN_BYTES / 1024 / 1024} MB budget: ${extra.skipped.slice(0, 5).join(', ')}${more}`);
      }
    }
  }

  const hits = scanAddedLines(diff);
  if (hits.length === 0) {
    if (problems.length) warnUnscanned([...new Set(problems)].join('; '));
    process.exit(0);
  }

  if (process.env.FORGEBEE_ALLOW_SECRET === '1') {
    console.error('[secret-scan] FORGEBEE_ALLOW_SECRET=1 — allowing despite a potential secret.');
    process.exit(0);
  }

  console.error('BLOCKED: potential secret(s) in the changes you are about to commit/push (secret-scan):');
  const seen = new Set();
  for (const h of hits) {
    const key = `${h.kind}|${h.preview}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`  ${h.kind}: ${h.preview}`);
    if (seen.size >= 10) break;
  }
  console.error('Move the secret to an env var / secret manager and remove it from the diff.');
  console.error('If this is a false positive, re-run with FORGEBEE_ALLOW_SECRET=1.');
  process.exit(2);
}

main().catch(() => process.exit(0));
