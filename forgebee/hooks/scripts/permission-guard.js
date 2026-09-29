#!/usr/bin/env node
/**
 * permission-guard.js — Tier 0 blocklist and risk prompts for Claude Code
 * Tiered: Blocklist (deny) → Risk signals (ask) → no decision
 *
 * The guard never emits "allow". A regex allowlist cannot be made bypass-proof
 * against a real shell (zsh expansions, `git rebase --exec`, `rg --pre`, path
 * spellings), so approval belongs to Claude Code's native permission rules.
 * A command that matches no rule gets no output and exit 0.
 *
 * Mode behavior:
 *   - every mode:                      Tier 0 blocklist
 *   - default / acceptEdits / other:   risk signals → "ask"
 *   - auto / plan / bypassPermissions: no "ask"; Claude Code's own flow decides
 *   Mode comes from the hook input (`permission_mode`), settings as fallback.
 *
 * SCOPE — read this before relying on the blocklist:
 *   This hook is BEST-EFFORT DEFENSE-IN-DEPTH, not a security boundary.
 *   Claude Code's own permission classifier is the real gate. The Tier 0
 *   blocklist catches the common, obvious destructive forms (and matches
 *   them regardless of flag order — `rm -fr`, `rm -r -f`, `rm --recursive
 *   --force`, `chmod 0777`, `chmod u+s` are all caught). It is NOT a complete
 *   or bypass-proof denylist: a determined operator with shell access can
 *   construct an equivalent command it does not recognize. Under
 *   `bypassPermissions` there is no upstream gate, so Tier 0 is the only
 *   check — keep that mode for trusted contexts only. Treat Tier 0 as a
 *   tripwire that raises the cost of accidents, not as a guarantee.
 *
 * Exit codes:
 *   0, no output = no decision (Claude Code's permission rules decide)
 *   0 + "ask"    = prompt the user
 *   2            = block (dangerous command, or Bash input the guard cannot check safely)
 *
 * The decision logic lives in pure functions (classify / isBlocklisted /
 * hasDangerousRm / pushRisk / hasUnsafeRedirect / stripQuoted / splitCommands)
 * that are exported for testing. The eval suite (forgebee/eval/scenarios/
 * permission-guard.test.js) imports them directly, so the tests always
 * exercise the live patterns — there is no hand-copied snapshot to drift.
 */

const os = require('os');
const path = require('path');
const common = require('./_common.js');

const PROJECT_DIR = common.getProjectDir();
// Relative rm targets resolve where the command runs; main() sets it from the hook input's cwd.
let baseDir = PROJECT_DIR;
const HOME_DIR = path.posix.normalize(os.homedir()).replace(/(.)\/$/, '$1');

// ── Pattern definitions ───────────────────────────────────────────────

// Matched against the stripped views with quote marks removed: `chmod '777' /`
// is seen, a quoted commit message or grep pattern is not.
const BLOCKLIST_PATTERNS = [
  // System destructive — permission/ownership changes that open or escalate.
  // Order-independent: catches 777/0777, setuid/setgid/sticky octal (4xxx/2xxx/
  // 6xxx/7xxx), symbolic setuid (u+s/+s), and world-writable symbolic (o+w/a+rwx).
  /\bchmod\s+(-[a-zA-Z]+\s+)*0?7{3}\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*[4267][0-7]{3}\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*[ugoa]*\+[a-zA-Z]*s\b/i,
  /\bchmod\s+(-[a-zA-Z]+\s+)*(a|o|ug?o)\+[a-zA-Z]*w/i,
  // Repetition is bounded ({0,N}) throughout: an unbounded `.*` after a repeated
  // prefix is quadratic and can outrun the 5 s hook timeout on large input.
  /dd if=.{0,500}\/dev\//i,
  /pip install.{0,500}--break-system/i,
  // Environment hijacking
  /^export\s+(PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH|RUBYLIB)=/i,
];

// Matched against stripQuoted() output, so the words inside a commit message,
// grep pattern, or quoted heredoc body do not trigger them.
const CODE_BLOCKLIST_PATTERNS = [
  /git reset --hard origin/i,
  // Command substitution (arbitrary execution inside $(...) or backticks).
  // Case-sensitive + word-bounded so prose ("ORM ", "confirm ", "add ") does not match.
  /\$\([^)]{0,200}\b(rm|curl|wget|dd|chmod)\s/,
  /`[^`]{0,200}\brm\s/,
  /`[^`]{0,200}\bcurl\s/,
  /\bchown\s+(-\S+\s+){0,10}root\b/,
  // Process substitution wrapping a network/exec command (RCE / exfiltration vector).
  /[<>]\s*\(\s*(curl|wget|nc|ncat|fetch|ssh|scp|bash|sh|zsh)\b/i,
];

// `eval` of a command substitution. Anchored at command position (start or after
// whitespace) and requires `eval ` followed by `$(` — so a path like
// forgebee/eval/golden/… plus an unrelated $(...) elsewhere is NOT a false match.
// Shell setup (`eval "$(direnv hook bash)"`) is routine, so this prompts; a Tier 0
// payload inside the substitution is denied by the patterns above.
const EVAL_SUBST_RE = /(?:^|\s)eval\s+[^|;&]{0,500}\$\(/i;

// SQL checks read only a pipeline that runs a DB client (its -c/-e argument,
// stdin, heredoc) or is a bare statement — "DELETE FROM" in a commit message
// or doc is not a query.
const DB_CLIENT_RE = /^(psql|mysql|mariadb|sqlite3|mongosh)$/;
const SQL_HEAD_RE = /^(DROP|DELETE|TRUNCATE)$/i;
const SQL_BLOCKLIST_PATTERNS = [
  /DROP TABLE/i,
  /DROP DATABASE/i,
  /DELETE FROM.{0,500}WHERE\s+(1|true|1\s*=\s*1)/i,
  /\bTRUNCATE\s/i,
];

// Secret material and home dotfiles: reading them is exfiltration, writing
// them (cp/tee/ln) is persistence — both prompt.
const SECRET_PATH_RE = /(\.ssh\b|id_rsa|id_ed25519|\.pem\b|(^|[\s/=@:'"])\.env(rc)?(\s|$|\.|:|'|")|\.aws\b|\.npmrc\b|\/etc\/(passwd|shadow|sudoers)\b)/i;
const HOME_DOTFILE_RE = /(^|[\s=@:'"])(~|\$\{?HOME\}?|\/Users\/[^/\s'"]+|\/home\/[^/\s'"]+)\/\./;
// Names a glob such as `.env*`, `.en[v]`, or `id_*` can expand to.
const SECRET_NAMES = ['.env', '.envrc', '.aws', '.ssh', '.npmrc', 'id_rsa', 'id_ed25519'];

// curl/wget flags that send local data (-d, -F, -T, -K and long forms). Case-sensitive: -f/-t are harmless.
const HTTP_UPLOAD_RE = /\s(-[a-zA-Z]*[dFTK]|--(data|form|upload-file|json|config|url-query|post-data|post-file|body-data|body-file))/;

// Sensitive paths/files: system dirs, credentials, and secret material. Used to
// prompt for mv/cp/unlink/rmdir/tee/sed -i that touch them.
const SENSITIVE_PATH_RE = /(\/etc\b|\/usr\/|\/bin\/|\/sbin\/|\/lib\/|\/boot\/|\/sys\/|\/proc\/|\/dev\/|\/root\b|\/var\/(?!folders|tmp)|\/System\/|\/Library\/|(^|\s|=)(~|\$\{?HOME\}?)\/\.?ssh\b|\.ssh\/|id_rsa|id_ed25519|\.pem(\s|$|\b)|(^|\s|\/|=|'|")\.env(\s|$|\.|:|'|")|\.aws\b|\.npmrc\b|\/passwd\b|\/shadow\b|\bsecrets?\b|\bcredentials?\b)/i;
const WRITE_VERB_RE = /^(mv|cp|unlink|rmdir|tee)$/;

function touchesSensitivePath(cmd) {
  return SENSITIVE_PATH_RE.test(cmd);
}

// ── Shell text views ──────────────────────────────────────────────────

// A quoted string that is one plain word is kept (dequoted) so `'sh' -c` and
// `'+main'` are still seen; anything with spaces or metacharacters is data.
const SAFE_WORD_RE = /^[\w@%+=:,./~-]*$/;
const VAR_RE = /\$(?:[A-Za-z_]\w*|[0-9@*#?$!-])?/y;
const HEREDOC_RE = /<<(-?)[ \t]*((?:[^\s;&|<>()'"\\]|'[^'\n]{0,200}'|"[^"\n]{0,200}"|\\.)+)/y;
// In the word view, whitespace and separators inside quotes become NUL, so a
// quoted string stays one word and cannot split or redirect a command.
const QUOTED_SEP_RE = /[\s;&|()<>`]/g;

// End of `${…}`, `$((…))`, `((…))`, or `$[…]` that starts at i. `<<` inside
// is a shift, not a heredoc, and a `}` inside a nested "…" does not close
// `${`. Outside double quotes `'…'` in `${…}` quotes a `}` too; inside them
// `'` is literal. An unclosed form runs to the end, so its text is exposed.
function expansionEnd(cmd, i, inDq = false) {
  const n = cmd.length;
  let j = cmd[i] === '$' ? i + 1 : i;
  const open = cmd[j];
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  let depth = 0;
  while (j < n) {
    const c = cmd[j];
    if (c === '\\') { j += 2; continue; }
    if (c === "'" && open === '{' && !inDq) {
      const end = cmd.indexOf("'", j + 1);
      if (end === -1) return n;
      j = end + 1;
      continue;
    }
    if (c === '"' && open === '{') {
      j++;
      while (j < n && cmd[j] !== '"') j += cmd[j] === '\\' ? 2 : 1;
      j++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return j + 1;
    j++;
  }
  return n;
}

function startsExpansion(cmd, i) {
  return cmd[i] === '$' && (cmd[i + 1] === '{' || cmd[i + 1] === '[' || cmd.startsWith('((', i + 1));
}

// `#` starts a comment only at the start of a word (`a#b`, `$#` are words).
function startsComment(cmd, i) {
  return i === 0 || (/[\s;&|()]/.test(cmd[i - 1]) && cmd[i - 2] !== '\\');
}

const ANSI_C_ESC_RE = /\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8}|[\s\S])/g;
const ANSI_C_CHARS = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"' };

// The body of `$'…'` as the shell reads it, so `$'\x72m'` is seen as `rm`.
function decodeAnsiC(s) {
  return s.replace(ANSI_C_ESC_RE, (m, e) => {
    if (e.length === 1) return /[0-7]/.test(e) ? String.fromCharCode(parseInt(e, 8)) : ANSI_C_CHARS[e] ?? m;
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e[0] === 'u' || e[0] === 'U') {
      const cp = parseInt(e.slice(1), 16);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    }
    return String.fromCharCode(parseInt(e, 8) & 0xff);
  });
}

// Single-quoted text and quoted-heredoc bodies are data, never code, so the
// text-sensitive checks must not read them. Double-quoted text and unquoted
// heredoc bodies keep only their $(…), `…`, and $VAR parts, which the shell
// executes. Comments are dropped. One linear pass.
// With `keep`, quoted text is kept instead (quote marks removed, separators
// made NUL) and a heredoc body joins the line of its command: the word view.
function stripQuoted(cmd, keep = false, inHeredoc = false) {
  let out = '';
  let lit = '';
  const stack = inHeredoc ? ['H'] : [];
  const heredocs = [];
  const n = cmd.length;
  const data = s => (keep ? s.replace(QUOTED_SEP_RE, '\0') : SAFE_WORD_RE.test(s) ? s : '');
  const flush = () => { out += data(lit); lit = ''; };
  const dq = keep ? '' : '"';
  let i = 0;
  while (i < n) {
    const c = cmd[i];
    const top = stack[stack.length - 1];
    if (top === '"' || top === 'H') {
      if (c === '\\') { lit += cmd.slice(i, i + 2); i += 2; continue; }
      if (c === '"' && top === '"') { flush(); stack.pop(); out += dq; i++; continue; }
      if (startsExpansion(cmd, i)) { flush(); const e = expansionEnd(cmd, i, true); out += cmd.slice(i, e); i = e; continue; }
      if (c === '$' && cmd[i + 1] === '(') { flush(); stack.push(')'); out += '$('; i += 2; continue; }
      if (c === '`') { flush(); stack.push('`'); out += '`'; i++; continue; }
      if (c === '$') {
        flush();
        VAR_RE.lastIndex = i;
        const v = VAR_RE.exec(cmd)[0];
        out += v;
        i += v.length;
        continue;
      }
      lit += c;
      i++;
      continue;
    }
    if (c === '#' && startsComment(cmd, i)) {
      // A backquoted command ends at its closing backquote, comment or not.
      while (i < n && cmd[i] !== '\n' && !(top === '`' && cmd[i] === '`')) i++;
      continue;
    }
    // `\(` is a literal word, as in `find \( … \)`, not a subshell.
    if (c === '\\') { out += cmd[i + 1] === '\n' ? ' ' : /[()]/.test(cmd[i + 1] || '') ? data(cmd[i + 1]) : cmd.slice(i, i + 2); i += 2; continue; }
    if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end === -1) { out += cmd.slice(i); break; }
      const body = cmd.slice(i + 1, end);
      out += keep ? data(body) : SAFE_WORD_RE.test(body) ? body : "''";
      i = end + 1;
      continue;
    }
    if (c === '$' && cmd[i + 1] === "'") {
      let j = i + 2;
      while (j < n && cmd[j] !== "'") j += cmd[j] === '\\' ? 2 : 1;
      const body = decodeAnsiC(cmd.slice(i + 2, j));
      out += keep ? data(body) : SAFE_WORD_RE.test(body) ? body : "''";
      i = j + 1;
      continue;
    }
    if (c === '"') { stack.push('"'); out += dq; i++; continue; }
    if (startsExpansion(cmd, i) || (c === '(' && cmd[i + 1] === '(')) {
      const e = expansionEnd(cmd, i);
      out += cmd.slice(i, e);
      i = e;
      continue;
    }
    if (c === '$' && cmd[i + 1] === '(') { stack.push(')'); out += '$('; i += 2; continue; }
    if (c === '(') { stack.push(')'); out += c; i++; continue; }
    if (c === ')') { if (top === ')') stack.pop(); out += c; i++; continue; }
    if (c === '`') { if (top === '`') stack.pop(); else stack.push('`'); out += c; i++; continue; }
    if (c === '<' && cmd.startsWith('<<<', i)) { out += '<<<'; i += 3; continue; }
    if (c === '<' && cmd[i + 1] === '<') {
      HEREDOC_RE.lastIndex = i;
      const m = HEREDOC_RE.exec(cmd);
      if (m) {
        heredocs.push({ delim: m[2].replace(/['"\\]/g, ''), quoted: /['"\\]/.test(m[2]), dash: m[1] === '-' });
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    if (c === '\n' && heredocs.length) {
      out += keep ? ' ' : '\n';
      i++;
      for (const h of heredocs) {
        let j = i;
        let end = -1;
        while (j < n) {
          let eol = cmd.indexOf('\n', j);
          if (eol === -1) eol = n;
          const line = cmd.slice(j, eol);
          if ((h.dash ? line.replace(/^\t+/, '') : line) === h.delim) { end = j; j = eol + 1; break; }
          j = eol + 1;
        }
        const body = cmd.slice(i, end === -1 ? n : end);
        if (keep) out += (h.quoted ? data(body) : stripQuoted(body, true, true)) + ' ';
        else out += (h.quoted ? '' : stripQuoted(body, false, true)) + '\n';
        i = end === -1 ? n : Math.min(j, n);
      }
      if (keep) out += '\n';
      heredocs.length = 0;
      continue;
    }
    out += c;
    i++;
  }
  flush();
  return out;
}

// `&` inside `&&`, `|&`, `2>&1`, `&>` is not a command separator.
const PIPELINE_SEP_RE = /&&|\|\||[;\n\r()`]|(?<![<>&|])&(?![>&])/;

function splitPipelines(cmd) {
  return cmd
    .split(PIPELINE_SEP_RE)
    .map(part => part.split(/\|&?/).map(stage => stage.trim()).filter(Boolean))
    .filter(stages => stages.length > 0);
}

function splitCommands(cmd) {
  return splitPipelines(cmd).flat();
}

// These run a later word as the command; judge that command, not the wrapper.
// Value: the wrapper's short options that take a value, so the value is not
// read as the command (`sudo -u me git …`, `nice -n 5 sh`).
const WRAPPERS = new Map(Object.entries({
  env: 'uC', time: 'fo', gtime: 'fo', sudo: 'ugCDhprtU', doas: 'uaC', nohup: '', nice: 'n', ionice: 'cnp',
  timeout: 'sk', stdbuf: 'ioe', busybox: '', exec: 'a', command: '', builtin: '', xargs: 'ILnPsdEa', eval: '',
}));
const WRAPPER_LONG_VALUE_RE = /^--(user|group|chdir|close-from|host|prompt|role|type|other-user|adjustment|unset|signal|kill-after|input|output|error|class|classdata|pid|arg-file|delimiter|max-args|max-lines|max-procs|max-chars|eof|format)$/;
const KEYWORDS = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{', '}']);

// Words of one command with quotes/backslashes removed, starting at the real
// command name (basename, so `/bin/sh` is `sh`). `.wrappers` lists the
// wrappers that were skipped; `.path` is the command name as written.
function commandWords(seg) {
  const words = seg.split(/\s+/).filter(Boolean).map(w => w.replace(/['"\\]/g, ''));
  const wrappers = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (KEYWORDS.has(w) || /^[A-Za-z_]\w*=/.test(w)) { i++; continue; }
    const valueOpts = WRAPPERS.get(w);
    if (valueOpts === undefined) break;
    wrappers.push(w);
    i++;
    while (i < words.length && words[i].startsWith('-')) {
      const opt = words[i++];
      if (opt === '--') break;
      const split = w === 'env' && /^(-S|--split-string)=?/.exec(opt);
      if (split) {
        // `env -S 'bash -c id'`: the string is itself a command line.
        if (opt.length > split[0].length) words.splice(i, 0, opt.slice(split[0].length));
        if (i < words.length) words.splice(i, 1, ...words[i].split('\0'));
        break;
      }
      if (opt.startsWith('--')) {
        if (!opt.includes('=') && WRAPPER_LONG_VALUE_RE.test(opt)) i++;
        continue;
      }
      for (let j = 1; j < opt.length; j++) {
        if (valueOpts.includes(opt[j])) { if (j === opt.length - 1) i++; break; }
      }
    }
    if (w === 'timeout') i++;   // the DURATION operand
  }
  const out = words.slice(i);
  out.path = out[0] || '';
  if (out.length) out[0] = out[0].slice(out[0].lastIndexOf('/') + 1);
  out.wrappers = wrappers;
  return out;
}

const SHELL_RE = /^(ba|z|da|k)?sh$/;

// A shell, eval, or inline-code interpreter executes its data (`echo '…' | sh`,
// `sh <<'EOF'`, `eval '…'`, `bash -c '…'`), so for such commands quoted text is code too.
function feedsShell(commands) {
  return commands.some((w) => {
    const head = w[0] || '';
    return SHELL_RE.test(head) || head === 'source' || head === '.' || w.wrappers.includes('eval') || hasInlineExec(w);
  });
}

// `$(pwd)` and `` `pwd` `` name the cwd, like `$PWD`.
const PWD_SUBST_RE = /\$\(\s*pwd(\s+-[LP])?\s*\)|`\s*pwd(\s+-[LP])?\s*`/g;
// `$(whoami)` and `$(id -un)` name the current user, like `$USER`.
const USER_SUBST_RE = /\$\(\s*(whoami|id\s+-un)\s*\)|`\s*(whoami|id\s+-un)\s*`/g;

function pipelinesOf(view) {
  return splitPipelines(view.replace(PWD_SUBST_RE, () => '$PWD').replace(USER_SUBST_RE, () => '$USER'))
    .map(stages => stages.map(commandWords));
}

// Text views for the regex checks, and the commands of every view. `words`
// (the word view) keeps quoted arguments, for the SQL and path checks.
// `byView` keeps each view's pipelines apart, in command order.
function analyze(command) {
  const code = stripQuoted(command);
  const words = pipelinesOf(stripQuoted(command, true));
  const views = [code];
  const byView = [pipelinesOf(code), words];
  if (feedsShell(byView.flat(2))) {
    // Each quote becomes a command start, so a command inside a quoted string is seen.
    const exposed = command.replace(/['"]/g, '\n');
    views.push(exposed);
    byView.push(pipelinesOf(exposed));
  }
  return { views, pipelines: byView.flat(), byView, words, sql: sqlTexts(words) };
}

// ── Command checks (one command's words) ──────────────────────────────

function hasInlineExec(w) {
  const h = w[0] || '';
  let flag;
  if (SHELL_RE.test(h)) flag = /^-[a-zA-Z]*c/;
  else if (/^node(js)?$/.test(h)) flag = /^(-[a-zA-Z]*[ep]|--eval|--print)/;
  else if (/^python[0-9.]*$/.test(h)) flag = /^-[a-zA-Z]*c/;
  else if (h === 'perl') flag = /^-[a-zA-Z]*[eE]/;
  else if (h === 'ruby') flag = /^-[a-zA-Z]*e/;
  else if (h === 'php') flag = /^-[a-zA-Z]*r/;
  else return false;
  for (let i = 1; i < w.length && w[i].startsWith('-') && w[i] !== '--'; i++) {
    if (flag.test(w[i])) return true;
    if (w[i] === '-o' || w[i] === '-O') i++;
  }
  return false;
}

const INTERPRETER_RE = /^(python[0-9.]*|node(js)?|perl|ruby|php|fish)$/;

// A shell always runs its stdin; another interpreter does when it has no
// script argument or the script is `-`.
function runsStdin(w) {
  const h = w[0] || '';
  if (SHELL_RE.test(h)) return true;
  if (!INTERPRETER_RE.test(h)) return false;
  const arg = w.slice(1).find(t => t === '-' || !t.startsWith('-'));
  return arg === undefined || arg === '-';
}

// Tokens are checked stage by stage, so no filler length can separate the
// download from the shell it feeds.
function pipesIntoShell(stages) {
  let source = false;
  for (const w of stages) {
    const h = w[0] || '';
    if (source && runsStdin(w)) return true;
    if (h === 'curl' || h === 'wget' || (h === 'base64' && w.some(t => /^(-d|-D|--decode)$/.test(t)))) source = true;
  }
  return false;
}

// A command that runs file F: `./F` or `/abs/F` as the command, or F as the
// script of a shell, an interpreter, `source`, or `.`.
function runsFile(w, has) {
  if (w.path.includes('/') && has(w.path)) return true;
  const h = w[0] || '';
  const shell = SHELL_RE.test(h);
  if (!shell && !INTERPRETER_RE.test(h) && h !== 'source' && h !== '.') return false;
  for (let i = 1; i < w.length; i++) {
    if (shell && /^[-+][oO]$/.test(w[i])) { i++; continue; }
    if (!w[i].startsWith('-')) return has(w[i]);
  }
  return false;
}

// `curl -o F …; sh F` is `curl … | sh` in two steps. A pipeline with curl or
// wget writes F by -o/-O or a redirect; a later pipeline of the same view runs it.
function downloadThenRun(pipelines) {
  const files = new Set();
  // After a cd the relative path no longer names the same file, so fall back to the basename.
  let moved = false;
  const base = p => p.replace(/^.*\//, '');
  const has = p => files.has(normalizePath(p)) || (moved && [...files].some(f => base(f) === base(p)));
  for (const stages of pipelines) {
    if (files.size && stages.some(w => runsFile(w, has))) return true;
    if (stages.some(w => w[0] === 'cd' || w[0] === 'pushd')) moved = true;
    if (!stages.some(w => w[0] === 'curl' || w[0] === 'wget')) continue;
    for (const w of stages) {
      for (const t of outputTargets(w).concat(redirectTargets(w.join(' ')))) if (t) files.add(t);
    }
  }
  return false;
}

const FIND_EXEC_RE =/^(rm|mv|dd|chmod|chown|unlink|shred|truncate|sh|bash|zsh|eval)$/;

function hasDestructiveFind(w) {
  if (w[0] !== 'find') return false;
  for (let i = 1; i < w.length; i++) {
    if (w[i] === '-delete') return true;
    if ((w[i] === '-exec' || w[i] === '-execdir') && FIND_EXEC_RE.test((w[i + 1] || '').replace(/^.*\//, ''))) return true;
  }
  return false;
}

// A destructive find prompts; on a root the rm rules call dangerous it is
// Tier 0. `.` is the usual root of a filtered cleanup, so it only prompts.
function findRisk(w) {
  if (!hasDestructiveFind(w)) return null;
  for (let i = 1; i < w.length; i++) {
    const t = w[i];
    if (/^-[HLP]$/.test(t)) continue;
    // A NUL word is a quoted or escaped `(` in the word view.
    if (t.startsWith('-') || t === '(' || t === '\0' || t === '!') break;
    if (normalizePath(t) !== '.' && rmTargetRisk(t) === 'deny') return 'deny';
  }
  return 'ask';
}

const isPrivileged = w => w.wrappers.some(x => x === 'sudo' || x === 'doas');

// sudo/doas reaching rm, chmod, or chown (also `rmdir`).
function isPrivilegedDestroy(w) {
  return isPrivileged(w) && /^(rm|chmod|chown)/.test(w[0] || '') && !chownsToUser(w);
}

// os.userInfo() throws when the uid has no passwd entry (some containers).
const USER_NAME = (() => { try { return os.userInfo().username; } catch { return null; } })();

// `chown -R $USER ~/.npm` takes back files under HOME that a root run left
// behind; it prompts instead of Tier 0. HOME itself or any other path does not.
function chownsToUser(w) {
  if (w[0] !== 'chown' || w.some(t => /^--(from|reference)/.test(t))) return false;
  const [owner, ...targets] = w.slice(1).filter(t => !t.startsWith('-'));
  const name = (owner || '').split(':')[0];
  if (!/^(\$USER|\$\{USER\})$/.test(name) && !(USER_NAME && name === USER_NAME)) return false;
  if (!/^[^:]*(:[\w.-]*)?$/.test(owner)) return false;
  return targets.length > 0 && targets.every((t) => {
    const n = normalizePath(t);
    if (!n || n.includes('$')) return false;
    return path.posix.resolve(baseDir, n).startsWith(HOME_DIR + '/');
  });
}

function isPublish(w) {
  if (w[0] !== 'npm') return false;
  return w.slice(1).find(t => !t.startsWith('-')) === 'publish' && !w.includes('--dry-run');
}

const GIT_GLOBAL_ARG_RE = /^(-C|-c|--git-dir|--work-tree|--namespace)$/;

function gitSubcommand(w) {
  if (w[0] !== 'git') return null;
  let i = 1;
  while (i < w.length && w[i].startsWith('-')) i += GIT_GLOBAL_ARG_RE.test(w[i]) ? 2 : 1;
  return i < w.length ? { sub: w[i], args: w.slice(i + 1) } : null;
}

// `git -c alias.p=push p -f` renames a subcommand past the checks below.
function definesGitAlias(w) {
  return w[0] === 'git' && w.some((t, i) => /^-calias\./i.test(t) || (w[i - 1] === '-c' && /^alias\./i.test(t)));
}

// Git accepts any unambiguous prefix of a long option (`--forc`, `--mirr`).
function isLongOpt(tok, name, min = 4) {
  const flag = tok.split('=')[0];
  return flag.length >= min && name.startsWith(flag);
}

const COMMIT_VALUE_FLAGS = 'mFcCt';   // value is the rest of the group or the next word
const COMMIT_ATTACHED_FLAGS = 'uS';   // optional value attached to the group

function skipsHooks(w) {
  const git = gitSubcommand(w);
  if (!git || !/^(commit|push|merge|rebase)$/.test(git.sub)) return false;
  const args = git.args;
  for (let i = 0; i < args.length; i++) {
    const tok = args[i];
    if (tok === '--') break;
    if (tok.startsWith('--')) {
      if (isLongOpt(tok, '--no-verify', 9)) return true;
      continue;
    }
    if (git.sub !== 'commit' || !/^-[a-zA-Z]/.test(tok)) continue;
    for (let j = 1; j < tok.length; j++) {
      if (tok[j] === 'n') return true;
      if (COMMIT_ATTACHED_FLAGS.includes(tok[j])) break;
      if (COMMIT_VALUE_FLAGS.includes(tok[j])) { if (j === tok.length - 1) i++; break; }
    }
  }
  return false;
}

// `git clean` with force + directories is rm -rf of untracked files; -n is a dry run.
function isForcedClean(w) {
  const git = gitSubcommand(w);
  if (!git || git.sub !== 'clean') return false;
  const short = git.args.filter(t => /^-[a-zA-Z]+$/.test(t)).join('');
  const force = short.includes('f') || git.args.some(t => t.startsWith('--') && isLongOpt(t, '--force'));
  const dry = short.includes('n') || git.args.some(t => t.startsWith('--') && isLongOpt(t, '--dry-run', 5));
  return force && short.includes('d') && !dry;
}

// Force, mirror, and `+ref` rewrite remote history (deny). Delete and `:ref`
// remove a ref, and a `$` expands to anything (ask).
function pushRiskOf(commands) {
  let risk = null;
  for (const w of commands) {
    const git = gitSubcommand(w);
    if (!git || git.sub !== 'push') continue;
    let opts = true;
    for (const tok of git.args) {
      if (tok.includes('$')) { risk = 'ask'; continue; }
      if (opts && tok === '--') { opts = false; continue; }
      if (opts && tok.startsWith('--')) {
        if (isLongOpt(tok, '--force') || isLongOpt(tok, '--mirror')) return 'deny';
        if (isLongOpt(tok, '--delete')) risk = 'ask';
        continue;
      }
      if (opts && /^-[a-zA-Z]+$/.test(tok)) {
        if (tok.includes('f')) return 'deny';
        if (tok.includes('d')) risk = 'ask';
        continue;
      }
      if (tok.startsWith('+')) return 'deny';
      if (tok.startsWith(':')) risk = 'ask';
    }
  }
  return risk;
}

function pushRisk(cmd) {
  return pushRiskOf(analyze(cmd).pipelines.flat());
}

// SQL text of each word-view pipeline that runs a DB client or is a bare statement.
function sqlTexts(pipelines) {
  return pipelines
    .filter(stages => stages.some(w => SQL_HEAD_RE.test(w[0] || '') || w.some(t => DB_CLIENT_RE.test(t.slice(t.lastIndexOf('/') + 1)))))
    .map(stages => stages.map(w => w.join(' ')).join(' | ').replace(/\0/g, ' '));
}

// ── Path checks ───────────────────────────────────────────────────────

const HOME_RE = /^(~[\w.+-]*|\$HOME|\$\{HOME\})(?=\/|$)/;

// One spelling per path: quotes/backslashes removed, every home form mapped
// to HOME_DIR, `//`, `/./`, `..` and the trailing slash resolved.
function normalizePath(tok) {
  const t = tok.replace(/['"\\]/g, '').replace(HOME_RE, HOME_DIR);
  if (!t) return '';
  return path.posix.normalize(t).replace(/(.)\/$/, '$1');
}

// Deletes a whole system tree, a home directory or one of its top-level
// folders, the project root, or the cwd. Deeper project paths and per-user
// temp dirs are not Tier 0. `t` is normalized.
function isDangerousRmTarget(t) {
  // A glob component deletes every sibling, so judge its parent directory.
  const parts = t.split('/');
  const g = parts.findIndex(s => /[*?[]/.test(s));
  if (g !== -1) t = parts.slice(0, g).join('/') || (t.startsWith('/') ? '/' : '.');
  if (!t.startsWith('/')) {
    if (t === '.' || /^\.\.(\/\.\.)*$/.test(t)) return true;
    t = path.posix.resolve(baseDir, t);
  }
  if (t === PROJECT_DIR) return true;
  // HOME can live anywhere (/root, /var/lib/jenkins, a temp dir), not only /Users or /home.
  if (HOME_DIR.length > 1 && (t === HOME_DIR || path.posix.dirname(t) === HOME_DIR)) return true;
  if (PROJECT_DIR.length > 1 && t.startsWith(PROJECT_DIR + '/')) return false;
  const seg = t.split('/').filter(Boolean);
  if (seg[0] === 'private') seg.shift();
  if (seg.length === 0) return true;
  if (seg[0] === 'Users' || seg[0] === 'home') return seg.length <= 3;
  if (seg[0] === 'opt') return seg.length <= 2;
  if (seg[0] === 'var' && (seg[1] === 'folders' || seg[1] === 'tmp')) return seg.length <= 2;
  return /^(etc|usr|var|lib|bin|sbin|boot|sys|dev|proc|root|System|Library)$/i.test(seg[0]);
}

// `{a,b}` expands before `~` and paths do, so `{~,x}` and `~{,}` name `~`.
// Bounded: long words and deep or wide expansions are left as they are.
function expandBraces(t, out = [], depth = 0) {
  const m = t.length <= 256 && depth < 4 && out.length < 16 ? /(^|[^$])\{([^{}]*,[^{}]*)\}/.exec(t) : null;
  if (!m) { out.push(t); return out; }
  const start = m.index + m[1].length;
  const end = m.index + m[0].length;
  for (const alt of m[2].split(',')) expandBraces(t.slice(0, start) + alt + t.slice(end), out, depth + 1);
  return out;
}

// 'deny' for a dangerous target, 'ask' when a `$` part cannot be resolved.
function rmTargetRisk(raw) {
  const t0 = raw.replace(/^[(`]+|[`);]+$/g, '').replace(/['"\\]/g, '')
    .replace(/^\$(\{PWD\}|PWD\b)/, '.')
    .replace(/^\$(\{CLAUDE_PROJECT_DIR\}|CLAUDE_PROJECT_DIR\b)/, PROJECT_DIR)
    .replace(/^\$\{HOME[^}]*\}/, '$HOME');   // ${HOME%/}, ${HOME:-x} are still $HOME
  let risk = null;
  for (const alt of expandBraces(t0)) {
    const t = normalizePath(alt);
    if (!t) continue;
    const parts = t.split('/');
    const v = parts.findIndex(s => s.includes('$'));
    if (v === -1) {
      if (isDangerousRmTarget(t)) return 'deny';
      continue;
    }
    risk = 'ask';
    // The variable can be empty, so the path before it is a possible target.
    const parent = parts.slice(0, v).join('/') || (t.startsWith('/') ? '/' : '');
    if (parent && isDangerousRmTarget(parent)) return 'deny';
  }
  return risk;
}

// `rm` with BOTH recursive and force flags (any order, short or long form,
// GNU long-option prefixes) aimed at a dangerous target (deny), or at a target
// the guard cannot resolve: a variable, a substitution, xargs input (ask).
function rmRiskOf(commands) {
  let risk = null;
  for (const w of commands) {
    if (w[0] !== 'rm') continue;
    let recursive = false;
    let force = false;
    let opts = true;
    const targets = [];
    for (const tok of w.slice(1)) {
      if (opts && tok === '--') { opts = false; continue; }
      if (opts && tok.startsWith('--')) {
        if (isLongOpt(tok, '--recursive', 3) || isLongOpt(tok, '--dir', 3)) recursive = true;
        if (isLongOpt(tok, '--force', 3)) force = true;
        continue;
      }
      if (opts && /^-[a-zA-Z]+$/.test(tok)) {
        if (/[rR]/.test(tok)) recursive = true;
        if (tok.includes('f')) force = true;
        continue;
      }
      // '' is quoted text this view dropped; the word view judges it.
      targets.push(tok);
    }
    if (!recursive || !force) continue;
    if (targets.length === 0 || w.wrappers.includes('xargs')) risk = 'ask';
    for (const t of targets) {
      const r = rmTargetRisk(t);
      if (r === 'deny') return 'deny';
      if (r) risk = 'ask';
    }
  }
  return risk;
}

function hasDangerousRm(cmd) {
  return rmRiskOf(analyze(cmd).pipelines.flat()) === 'deny';
}

// Targets of `>`, `>>`, `>|` (including `2>` and `&>`), normalized.
function redirectTargets(cmd) {
  const out = [];
  const re = />{1,2}\|?\s*([^\s|;&()<>]+)/g;
  let m;
  while ((m = re.exec(cmd)) !== null) out.push(normalizePath(m[1]));
  return out;
}

// Writing these is a backdoor/persistence primitive, so block outright.
function isPersistenceTarget(t) {
  if (/(^|\/)\.ssh\/authorized_keys2?$/.test(t)) return true;
  if (t === HOME_DIR + '/.ssh' || t.startsWith(HOME_DIR + '/.ssh/') || /^\/((Users|home)\/[^/]+|root)\/\.ssh(\/|$)/.test(t)) return true;
  const agents = HOME_DIR + '/Library/LaunchAgents';
  if (t === agents || t.startsWith(agents + '/') || /^\/((Users|home)\/[^/]+\/)?Library\/Launch(Agents|Daemons)(\/|$)/.test(t)) return true;
  return /^\/(private\/)?etc\/(cron|sudoers|ssh\/|passwd|shadow|profile|(bash|zsh)rc$|zshenv$)/i.test(t);
}

const COPY_VERB_RE = /^(cp|mv|install|ln|rsync)$/;

// Paths one command writes, normalized. For cp/mv/install/ln/rsync only the
// destination: copying a key out of ~/.ssh is a read, which prompts elsewhere.
function writeTargets(w) {
  const h = w[0] || '';
  const args = w.slice(1);
  if (h === 'tee') return args.filter(t => !t.startsWith('-')).map(normalizePath);
  if (h === 'dd') return args.filter(t => t.startsWith('of=')).map(t => normalizePath(t.slice(3)));
  if (h === 'sed') return args.some(t => /^(-i|--in-place)/.test(t)) ? args.filter(t => !t.startsWith('-')).map(normalizePath) : [];
  if (!COPY_VERB_RE.test(h)) return [];
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const m = /^(-t|--target-directory=?)(.*)$/.exec(args[i]);
    if (m) out.push(m[2] || args[++i] || '');
  }
  const operands = args.filter(t => !t.startsWith('-'));
  if (operands.length) out.push(operands[operands.length - 1]);
  return out.map(normalizePath);
}

function hasPersistenceWrite(cmd, a = analyze(cmd)) {
  if (a.views.some(v => redirectTargets(v).some(isPersistenceTarget))) return true;
  return a.pipelines.flat().some(w => writeTargets(w).some(isPersistenceTarget));
}

// Home dotfiles, system dirs, parent-escaping paths.
function isUnsafeWriteTarget(t) {
  if (t === '/dev/null' || t === '/dev/stdout' || t === '/dev/stderr') return false;
  if (t === HOME_DIR || t.startsWith(HOME_DIR + '/.')) return true;
  if (/^\/(Users|home)\/[^/]+\/\./.test(t)) return true;
  if (/^\/(private\/)?(etc|root|boot|sys|usr|bin|sbin|lib|opt|proc|dev|System|Library)(\/|$)/i.test(t)) return true;
  if (/^\/(private\/)?var\/(?!folders|tmp)/i.test(t)) return true;
  return t === '..' || t.startsWith('../');
}

function hasUnsafeRedirect(cmd, a = analyze(cmd)) {
  return a.views.some(v => redirectTargets(v).some(isUnsafeWriteTarget));
}

// A glob component with a literal prefix (`.env*`, `.en[v]`, `id_*`) that can
// expand to a secret name. Length-capped so the built regex stays cheap.
function globMatchesSecret(c) {
  if (c.length > 64 || /^[*?[]/.test(c)) return false;
  const src = c.replace(/\*+/g, '*').replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\[!/g, '[^');
  let re;
  try { re = new RegExp(`^${src}$`); } catch { return false; }
  return SECRET_NAMES.some(s => re.test(s));
}

// One word-view word (NUL-joined parts of a quoted string) names secret
// material or a home dotfile once quotes, `~`, and `//` are resolved.
function touchesSecret(word) {
  for (const part of word.split('\0')) {
    const t = part.replace(/^[^=]*=|^@/, '');
    const n = normalizePath(t);
    if (SECRET_PATH_RE.test(t) || SECRET_PATH_RE.test(n)) return true;
    if (n.startsWith(HOME_DIR + '/.') || /^\/(Users|home)\/[^/]+\/\./.test(n)) return true;
    if (/[*?[]/.test(n) && n.split('/').some(c => /[*?[]/.test(c) && globMatchesSecret(c))) return true;
  }
  return false;
}

// Files a download or sed script writes: curl -o, wget -O, sed `w file`.
function outputTargets(w) {
  const h = w[0] || '';
  const out = [];
  if (h === 'curl' || h === 'wget') {
    const short = h === 'curl' ? /^-[a-zA-Z]*o$/ : /^-[a-zA-Z]*O$/;
    const long = h === 'curl' ? '--output' : '--output-document';
    for (let i = 1; i < w.length; i++) {
      if (short.test(w[i]) || w[i] === long) out.push(w[i + 1] || '');
      else if (w[i].startsWith(long + '=')) out.push(w[i].slice(long.length + 1));
    }
  } else if (h === 'sed') {
    const toks = w.flatMap(t => t.split('\0')).filter(Boolean);
    for (let i = 1; i < toks.length; i++) if (/[wW]$/.test(toks[i - 1])) out.push(toks[i]);
  }
  return out.map(normalizePath);
}

// ── Tiers ─────────────────────────────────────────────────────────────

function isBlocklisted(cmd, a = analyze(cmd)) {
  if (a.views.some((v) => {
    const unquoted = v.replace(/['"]/g, '');
    return BLOCKLIST_PATTERNS.some(pattern => pattern.test(unquoted));
  })) return true;
  if (a.views.some(v => CODE_BLOCKLIST_PATTERNS.some(pattern => pattern.test(v)))) return true;
  if (a.sql.some(t => SQL_BLOCKLIST_PATTERNS.some(pattern => pattern.test(t)))) return true;
  if (hasPersistenceWrite(cmd, a) || a.pipelines.some(pipesIntoShell) || a.byView.some(downloadThenRun)) return true;
  const commands = a.pipelines.flat();
  if (commands.some(w => skipsHooks(w) || isPrivilegedDestroy(w) || isPublish(w) || /^mkfs\./.test(w[0] || '') || findRisk(w) === 'deny')) return true;
  return pushRiskOf(commands) === 'deny' || rmRiskOf(commands) === 'deny';
}

// Risk signals that warrant a prompt even when a native rule would allow.
function askReason(cmd, a) {
  const commands = a.pipelines.flat();
  if (pushRiskOf(commands) === 'ask') return 'git push deletes a remote ref or uses a variable refspec';
  if (rmRiskOf(commands) === 'ask') return 'rm -rf target is a variable, substitution, or xargs input';
  if (commands.some(w => isPrivileged(w) && chownsToUser(w))) return 'sudo chown gives files under HOME to the current user';
  if (commands.some(hasInlineExec)) return 'Interpreter runs inline code';
  if (commands.some(w => findRisk(w) === 'ask')) return 'find deletes or runs a command on each match';
  if (commands.some(isForcedClean)) return 'git clean deletes untracked files';
  if (a.views.some(v => EVAL_SUBST_RE.test(v))) return 'eval runs the output of a command substitution';
  if (commands.some(definesGitAlias)) return 'git -c defines an alias';
  if (commands.some(w => w[0] === 'crontab' && w.slice(1).some(t => t === '-' || !t.startsWith('-')))) return 'crontab replaces the user crontab';
  if (hasUnsafeRedirect(cmd, a)) return 'Redirect writes outside the project';
  const words = a.words.flat();
  if (SECRET_PATH_RE.test(cmd) || HOME_DOTFILE_RE.test(cmd) || words.some(w => w.slice(1).some(touchesSecret))) {
    return 'Command touches secret material or a home dotfile';
  }
  if (words.some(w => outputTargets(w).some(isUnsafeWriteTarget))) return 'Download or sed script writes outside the project';
  for (const seg of splitCommands(cmd)) {
    const w = commandWords(seg);
    const writes = WRITE_VERB_RE.test(w[0]) || (w[0] === 'sed' && w.some(t => /^(-i|--in-place)/.test(t)));
    if (writes && (touchesSensitivePath(seg) || w.slice(1).some(t => !t.startsWith('-') && isUnsafeWriteTarget(normalizePath(t))))) {
      return 'Write or move touches a sensitive path';
    }
    if ((w[0] === 'curl' || w[0] === 'wget') && HTTP_UPLOAD_RE.test(seg)) return 'curl/wget sends local data';
  }
  return null;
}

/**
 * Pure decision function — no I/O, no process.exit.
 *
 * @returns {{decision: 'deny'|'ask'|'defer', reason: string}}
 */
function classify(command, mode) {
  const a = analyze(command);

  // ── TIER 0 (BLOCKLIST) — evaluated in ALL modes ──────────────────────
  if (isBlocklisted(command, a)) {
    return { decision: 'deny', reason: 'Command matches dangerous pattern (Tier 0 — enforced in all modes)' };
  }
  if (a.sql.some(t => /DELETE FROM/i.test(t) && !/DELETE FROM.{0,500}WHERE/i.test(t))) {
    return { decision: 'deny', reason: 'DELETE FROM without WHERE clause (Tier 0 — enforced in all modes)' };
  }

  if (mode === 'auto' || mode === 'plan' || mode === 'bypassPermissions') {
    return { decision: 'defer', reason: `${mode} mode (Tier 0 passed) — Claude Code decides` };
  }

  const reason = askReason(command, a);
  if (reason) return { decision: 'ask', reason };
  return { decision: 'defer', reason: 'No rule matched — Claude Code decides' };
}

// ── Output helpers (I/O — used only by main) ─────────────────────────

function ask(reason) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function deny(reason) {
  console.error(`BLOCKED: ${reason}`);
  process.exit(2);
}

// ── Input limits ──────────────────────────────────────────────────────
// The hook is registered on the Bash matcher only, so input the guard cannot
// read or parse is an unchecked Bash command: deny rather than exit 0.
const STDIN_MAX_BYTES = 1024 * 1024;
const STDIN_TIMEOUT_MS = 3000;           // below the 5 s hook timeout, so the deny still lands
const MAX_COMMAND_BYTES = 64 * 1024;     // Tier 0 checks are timed against this size

// Unlike common.readStdinJson(), reports WHY input is missing so main() can fail closed.
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve({ data: '' });
    let data = '';
    const timer = setTimeout(() => done({ error: 'hook input read timed out' }), STDIN_TIMEOUT_MS);
    function done(result) {
      clearTimeout(timer);
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(result);
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (data.length > STDIN_MAX_BYTES) done({ error: 'hook input exceeds 1 MB' });
    });
    process.stdin.on('end', () => done({ data }));
    process.stdin.on('error', (e) => done({ error: `hook input read failed (${e.message})` }));
  });
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const raw = await readStdin();
  if (raw.error) deny(`${raw.error} — command not checked (fail closed)`);
  if (!raw.data) process.exit(0);

  let input;
  try {
    input = JSON.parse(raw.data);
  } catch (e) {
    deny('hook input is not valid JSON — command not checked (fail closed)');
  }

  const TOOL_NAME = input?.tool_name;
  const COMMAND = input?.tool_input?.command;

  // Only process Bash commands
  if (TOOL_NAME !== 'Bash') {
    process.exit(0);
  }
  if (typeof COMMAND !== 'string') deny('Bash command is not a string — command not checked (fail closed)');
  if (!COMMAND) process.exit(0);
  if (Buffer.byteLength(COMMAND, 'utf8') > MAX_COMMAND_BYTES) {
    deny('Bash command exceeds 64 KB — too large to check safely (fail closed)');
  }

  // Live mode from the hook input; settings files are only a fallback.
  const PERMISSION_MODE = input.permission_mode || common.detectPermissionMode();
  if (typeof input.cwd === 'string' && input.cwd.startsWith('/')) {
    baseDir = path.posix.normalize(input.cwd).replace(/(.)\/$/, '$1');
  }
  const result = classify(COMMAND, PERMISSION_MODE);

  if (result.decision === 'deny') deny(result.reason);
  if (result.decision === 'ask') ask(result.reason);
  process.exit(0);
}

// ── Exports for testing — the eval suite imports these so it always
//    exercises the live patterns (no hand-copied snapshot to drift). ──
module.exports = {
  BLOCKLIST_PATTERNS,
  CODE_BLOCKLIST_PATTERNS,
  stripQuoted,
  splitCommands,
  isBlocklisted,
  hasDangerousRm,
  pushRisk,
  hasUnsafeRedirect,
  touchesSensitivePath,
  classify,
};

if (require.main === module) {
  // A throw means the command was never classified — fail closed, not open.
  main().catch((e) => deny(`permission-guard error (${e && e.message}) — command not checked (fail closed)`));
}
