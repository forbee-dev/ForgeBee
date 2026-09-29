#!/usr/bin/env node
/**
 * hooks-hardening.test.js — regressions for shell injection (observe/detect-project,
 * project-triage), observation shape + redaction + file modes (observe.js),
 * project/session scoping (self-improve.js), and secret-scan fail-open paths.
 *
 * Runs every hook as a child process with HOME pointed at a temp dir, so the
 * real ~/.claude/forgebee-learning store is never touched.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OBSERVE = path.join(ROOT, 'skills', 'continuous-learning', 'scripts', 'observe.js');
const TRIAGE = path.join(ROOT, 'hooks', 'scripts', 'project-triage.js');
const SELF_IMPROVE = path.join(ROOT, 'hooks', 'scripts', 'self-improve.js');
const SECRET_SCAN = path.join(ROOT, 'hooks', 'scripts', 'secret-scan.js');

const SCRATCH = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-hooks-hardening-')));
const HOME = path.join(SCRATCH, 'home');
fs.mkdirSync(HOME);

// Built at runtime so this file never trips secret-scan on its own commit.
const AWS_KEY = 'AKIA' + 'QWERTYUIOPASDFGH';

const baseEnv = { ...process.env, HOME };
delete baseEnv.CLAUDE_PROJECT_DIR;
delete baseEnv.FORGEBEE_ALLOW_SECRET;
delete baseEnv.FORGEBEE_DISABLE_SECRET_SCAN;
const gitEnv = {
  ...baseEnv,
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t.invalid',
  GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t.invalid',
};

function run(script, { stdin = '', cwd = SCRATCH, env = baseEnv } = {}) {
  const r = spawnSync(process.execPath, [script], {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
    cwd, env, encoding: 'utf8', timeout: 20000,
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: gitEnv, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function obsFileFor(projectRoot) {
  const registry = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'forgebee-learning', 'projects.json'), 'utf8'));
  const id = Object.keys(registry).find(k => registry[k].root === projectRoot);
  assert.ok(id, `no registry entry for ${projectRoot}`);
  return path.join(HOME, '.claude', 'forgebee-learning', 'projects', id, 'observations.jsonl');
}

function lastObs(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

try {
  const injDir = path.join(SCRATCH, 'proj$(touch INJECTED)');
  fs.mkdirSync(injDir);
  const markers = [path.join(SCRATCH, 'INJECTED'), path.join(injDir, 'INJECTED')];

  test('observe/detect-project: injection dir name runs no command', () => {
    const r = run(OBSERVE, {
      stdin: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }, session_id: 'inj', cwd: injDir },
    });
    assert.strictEqual(r.status, 0);
    for (const m of markers) assert.ok(!fs.existsSync(m), `marker created: ${m}`);
    assert.ok(fs.existsSync(obsFileFor(injDir)), 'observation not written');
  });

  test('project-triage: injection dir name runs no command', () => {
    for (const m of markers) fs.rmSync(m, { force: true }); // independent of the check above
    const r = run(TRIAGE, { env: { ...baseEnv, CLAUDE_PROJECT_DIR: injDir, CLAUDE_PLUGIN_ROOT: ROOT } });
    assert.strictEqual(r.status, 0);
    for (const m of markers) assert.ok(!fs.existsSync(m), `marker created: ${m}`);
    const triage = JSON.parse(r.stdout);
    assert.ok(!triage.error, `triage error: ${triage.error}`);
  });

  const proj = path.join(SCRATCH, 'clean-proj');
  fs.mkdirSync(proj);
  const postPayload = {
    hook_event_name: 'PostToolUse', tool_name: 'Bash',
    tool_input: { command: 'npm test' }, tool_response: { stdout: 'ok' },
    session_id: 's1', cwd: proj,
  };

  test('observe: PostToolUse recorded as tool_complete with object input/output', () => {
    assert.strictEqual(run(OBSERVE, { stdin: postPayload }).status, 0);
    const obs = lastObs(obsFileFor(proj));
    assert.strictEqual(obs.event, 'tool_complete');
    assert.deepStrictEqual(obs.input, { command: 'npm test' });
    assert.deepStrictEqual(obs.output, { stdout: 'ok' });
  });

  test('observe: PreToolUse recorded as tool_start', () => {
    run(OBSERVE, { stdin: { ...postPayload, hook_event_name: 'PreToolUse', tool_response: undefined } });
    assert.strictEqual(lastObs(obsFileFor(proj)).event, 'tool_start');
  });

  test('observe: secrets redacted, file 0600, archive dir 0700', () => {
    const file = obsFileFor(proj);
    fs.chmodSync(file, 0o644); // as left by older versions
    const r = run(OBSERVE, {
      stdin: {
        hook_event_name: 'PostToolUse', tool_name: 'Bash', session_id: 's2', cwd: proj,
        tool_input: { command: 'export API_KEY=sk-live-abc123 && npm test' },
        tool_response: { stdout: `found ${AWS_KEY}` },
      },
    });
    assert.strictEqual(r.status, 0);
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes('sk-live-abc123'), 'sk-live key stored raw');
    assert.ok(!text.includes(AWS_KEY), 'AWS key stored raw');
    const obs = lastObs(file);
    assert.ok(obs.input.command.startsWith('export API_KEY=[REDACTED'), obs.input.command);
    assert.ok(obs.input.command.endsWith('&& npm test'), obs.input.command);
    assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);
    assert.strictEqual(fs.statSync(path.join(path.dirname(file), 'observations.archive')).mode & 0o777, 0o700);
  });

  test('self-improve: current project only, each session counted once', () => {
    for (let i = 0; i < 5; i++) run(OBSERVE, { stdin: postPayload });
    // Another project's store with its own repeated command must not leak in.
    const otherDir = path.join(HOME, '.claude', 'forgebee-learning', 'projects', 'otherproject0');
    fs.mkdirSync(otherDir, { recursive: true });
    const leak = JSON.stringify({ event: 'tool_complete', tool: 'Bash', session: 's1', input: { command: 'leaky other cmd' } });
    fs.writeFileSync(path.join(otherDir, 'observations.jsonl'), `${leak}\n`.repeat(6));

    const env = { ...baseEnv, CLAUDE_PROJECT_DIR: proj };
    const stop = { session_id: 's1', cwd: proj };
    assert.strictEqual(run(SELF_IMPROVE, { stdin: stop, cwd: proj, env }).status, 0);
    assert.strictEqual(run(SELF_IMPROVE, { stdin: stop, cwd: proj, env }).status, 0);

    const pendingFile = path.join(proj, '.claude', 'learnings', 'pending-instincts.jsonl');
    const pending = fs.readFileSync(pendingFile, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    const npm = pending.find(p => p.signal === 'bash-repeat:npm test');
    assert.ok(npm, 'npm test repeat not detected');
    assert.strictEqual(npm.sessions_seen, 1);
    assert.ok(!pending.some(p => p.signal.includes('leaky')), 'other project leaked');
  });

  const repo = path.join(SCRATCH, 'repo');
  fs.mkdirSync(repo);
  git(repo, 'init', '-q');
  fs.writeFileSync(path.join(repo, 'README.md'), 'hi\n');
  git(repo, 'add', 'README.md');
  git(repo, 'commit', '-q', '-m', 'init');
  const scan = (command, cwd = repo) => run(SECRET_SCAN, { stdin: { tool_name: 'Bash', tool_input: { command } }, cwd, env: gitEnv });

  test('secret-scan: untracked new file with key under git add && commit blocks', () => {
    fs.writeFileSync(path.join(repo, 'new.js'), `const k = '${AWS_KEY}';\n`);
    assert.strictEqual(scan('git add new.js && git commit -m x').status, 2);
    fs.unlinkSync(path.join(repo, 'new.js'));
  });

  test('secret-scan: staged key plus 1.2 MB file blocks', () => {
    fs.writeFileSync(path.join(repo, 'big.txt'), 'filler line of plain text\n'.repeat(48000));
    fs.writeFileSync(path.join(repo, 'key.js'), `const k = '${AWS_KEY}';\n`);
    git(repo, 'add', 'big.txt', 'key.js');
    assert.strictEqual(scan('git commit -m x').status, 2);
    git(repo, 'reset', '-q');
    fs.unlinkSync(path.join(repo, 'big.txt'));
    fs.unlinkSync(path.join(repo, 'key.js'));
  });

  test('secret-scan: clean commit allowed silently', () => {
    fs.writeFileSync(path.join(repo, 'ok.js'), 'module.exports = 1;\n');
    git(repo, 'add', 'ok.js');
    const r = scan('git add ok.js && git commit -m ok');
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  test('secret-scan: git add -f of an ignored .env blocks', () => {
    fs.writeFileSync(path.join(repo, '.gitignore'), '.env\n');
    fs.writeFileSync(path.join(repo, '.env'), `AWS_ACCESS_KEY_ID=${AWS_KEY}\n`);
    assert.strictEqual(scan('git add -f .env && git commit -m x').status, 2);
    assert.strictEqual(scan('git add .gitignore && git commit -m x').status, 0, 'ignored file scanned without -f');
    fs.unlinkSync(path.join(repo, '.env'));
    fs.unlinkSync(path.join(repo, '.gitignore'));
  });

  test('secret-scan: forced add via global options, --force prefixes and quoted paths blocks', () => {
    fs.writeFileSync(path.join(repo, '.gitignore'), 'cfg/\nmy dir/\n');
    for (const d of ['cfg', 'my dir']) {
      fs.mkdirSync(path.join(repo, d));
      fs.writeFileSync(path.join(repo, d, 'k.js'), `const k = '${AWS_KEY}';\n`);
    }
    for (const command of [
      'git -C . add -f cfg/k.js && git commit -m x',
      'git -C cfg add -f k.js && git commit -m x',
      'git -c core.quotepath=off --no-pager --git-dir=.git add --force cfg/k.js && git commit -m x',
      'git add --forc cfg/k.js && git commit -m x',
      'git add --for cfg/k.js && git commit -m x',
      'git add --f cfg/k.js && git commit -m x',
      'git add -f "my dir/k.js" && git commit -m x',
      "git add -f 'my dir'/k.js; git commit -m x",
    ]) assert.strictEqual(scan(command).status, 2, command);
    assert.strictEqual(scan('git add --no-force cfg/k.js && git commit -m x').status, 0, '--no-force');
    fs.rmSync(path.join(repo, 'cfg'), { recursive: true });
    fs.rmSync(path.join(repo, 'my dir'), { recursive: true });
    fs.unlinkSync(path.join(repo, '.gitignore'));
  });

  test('secret-scan: added line starting with ++ blocks', () => {
    const file = path.join(repo, 'pp.txt');
    fs.writeFileSync(file, `++${AWS_KEY}\n`);
    assert.strictEqual(scan('git add pp.txt && git commit -m x').status, 2, 'untracked');
    git(repo, 'add', 'pp.txt');
    assert.strictEqual(scan('git commit -m x').status, 2, 'staged');
    git(repo, 'reset', '-q', '--', 'pp.txt');
    fs.unlinkSync(file);
  });

  // Built at runtime so this file never trips secret-scan on its own commit.
  const mix = 'Ab3dEf6hIj9kLm2nOp5qRs8tUv1wYy4zCc7eFg0hIj3kLm6nOp9';
  const providerKeys = [
    ['GitLab token', 'glpat-' + mix.slice(0, 20)],
    ['SendGrid API key', 'SG.' + mix.slice(0, 22) + '.' + mix.slice(0, 43)],
    ['Hugging Face token', 'hf_' + mix.slice(0, 34)],
    ['Stripe test key', 'sk_' + 'test_' + mix.slice(0, 24)],
  ];
  test('secret-scan: GitLab, SendGrid, Hugging Face and Stripe test keys block', () => {
    const file = path.join(repo, 'p.js');
    for (const [kind, key] of providerKeys) {
      fs.writeFileSync(file, `const k = '${key}';\n`);
      git(repo, 'add', 'p.js');
      const r = scan('git commit -m x');
      assert.strictEqual(r.status, 2, kind);
      assert.ok(r.stderr.includes(kind), r.stderr);
      git(repo, 'reset', '-q', '--', 'p.js');
    }
    fs.unlinkSync(file);
  });

  test('secret-scan: 1.1 MB untracked file with key at the end blocks', () => {
    fs.writeFileSync(path.join(repo, 'big.js'), '// filler line of plain text\n'.repeat(40000) + `const k = '${AWS_KEY}';\n`);
    assert.ok(fs.statSync(path.join(repo, 'big.js')).size > 1.1 * 1024 * 1024);
    assert.strictEqual(scan('git add big.js && git commit -m x').status, 2);
    fs.unlinkSync(path.join(repo, 'big.js'));
  });

  test('secret-scan: staged secret reverted in the worktree blocks', () => {
    const file = path.join(repo, 's.js');
    fs.writeFileSync(file, `const k = '${AWS_KEY}';\n`);
    git(repo, 'add', 's.js');
    fs.writeFileSync(file, 'clean\n');
    assert.strictEqual(scan('git commit -m x').status, 2);
    git(repo, 'reset', '-q');
    fs.unlinkSync(file);
  });

  test('secret-scan: single-commit repo push is scanned, not warned', () => {
    const r = scan('git push');
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });

  test('secret-scan: push of a new branch scans every unpushed commit', () => {
    const bare = path.join(SCRATCH, 'origin.git');
    const work = path.join(SCRATCH, 'push-repo');
    git(SCRATCH, 'init', '-q', '--bare', bare);
    fs.mkdirSync(work);
    git(work, 'init', '-q');
    fs.writeFileSync(path.join(work, 'README.md'), 'hi\n');
    git(work, 'add', 'README.md');
    git(work, 'commit', '-q', '-m', 'init');
    git(work, 'remote', 'add', 'origin', bare);
    git(work, 'push', '-q', 'origin', 'HEAD:main');
    git(work, 'checkout', '-q', '-b', 'feat');
    fs.writeFileSync(path.join(work, 'k.js'), `const k = '${AWS_KEY}';\n`);
    git(work, 'add', 'k.js');
    git(work, 'commit', '-q', '-m', 'add key');
    git(work, 'rm', '-q', 'k.js');
    git(work, 'commit', '-q', '-m', 'remove key');
    assert.strictEqual(scan('git push -u origin feat', work).status, 2);
  });

  let pushN = 0;
  function pushRepo() {
    const bare = path.join(SCRATCH, `origin-${pushN}.git`);
    const work = path.join(SCRATCH, `push-${pushN++}`);
    git(SCRATCH, 'init', '-q', '--bare', bare);
    fs.mkdirSync(work);
    git(work, 'init', '-q', '-b', 'main');
    commitFile(work, 'README.md', 'hi\n', 'init');
    git(work, 'remote', 'add', 'origin', bare);
    git(work, 'push', '-q', '-u', 'origin', 'main');
    return work;
  }
  function commitFile(work, name, text, msg) {
    fs.writeFileSync(path.join(work, name), text);
    git(work, 'add', name);
    git(work, 'commit', '-q', '-m', msg);
  }
  const keyJs = `const k = '${AWS_KEY}';\n`;

  test('secret-scan: push with upstream scans each commit, not the net diff', () => {
    const work = pushRepo();
    commitFile(work, 'k.js', keyJs, 'add key');
    git(work, 'rm', '-q', 'k.js');
    git(work, 'commit', '-q', '-m', 'remove key');
    assert.strictEqual(scan('git push', work).status, 2);
    assert.strictEqual(scan('git push origin main 2>&1 | tail -1', work).status, 2, 'redirect');
  });

  test('secret-scan: push of a branch other than HEAD, --all, --mirror and refspecs blocks', () => {
    const work = pushRepo();
    git(work, 'checkout', '-q', '-b', 'leak');
    commitFile(work, 'k.js', keyJs, 'add key');
    git(work, 'checkout', '-q', 'main');
    for (const command of [
      'git push origin leak',
      'git push --all origin',
      'git push --al origin',
      'git push --mirror origin',
      'git push -u origin +leak:refs/heads/other',
      'git -C . push origin leak:main',
    ]) assert.strictEqual(scan(command, work).status, 2, command);
    const clean = scan('git push origin main', work);
    assert.strictEqual(clean.status, 0);
    assert.strictEqual(clean.stdout.trim(), '');
    assert.strictEqual(scan('git push origin --delete leak', work).status, 0, 'delete');
    assert.strictEqual(scan('git push origin :leak', work).status, 0, 'delete refspec');
  });

  test('secret-scan: push of a tag-only commit blocks', () => {
    const work = pushRepo();
    git(work, 'checkout', '-q', '-b', 'tmp');
    commitFile(work, 'k.js', keyJs, 'add key');
    git(work, 'tag', 'v1');
    git(work, 'checkout', '-q', 'main');
    git(work, 'branch', '-q', '-D', 'tmp');
    assert.strictEqual(scan('git push origin tag v1', work).status, 2, 'tag v1');
    assert.strictEqual(scan('git push --tags', work).status, 2, '--tags');
  });

  test('secret-scan: evil merge with the secret only in the resolution blocks', () => {
    const work = pushRepo();
    git(work, 'checkout', '-q', '-b', 'side');
    commitFile(work, 'side.txt', 'side\n', 'side');
    git(work, 'checkout', '-q', '-b', 'feat', 'main');
    commitFile(work, 'feat.txt', 'feat\n', 'feat');
    git(work, 'merge', '-q', '--no-ff', '--no-commit', 'side');
    fs.writeFileSync(path.join(work, 'k.js'), keyJs);
    git(work, 'add', 'k.js');
    git(work, 'commit', '-q', '-m', 'merge side');
    assert.strictEqual(scan('git push -u origin feat', work).status, 2);
  });

  test('secret-scan: unreadable diff warns visibly and allows', () => {
    // No commits: `git log HEAD` fails.
    const empty = path.join(SCRATCH, 'empty-repo');
    fs.mkdirSync(empty);
    git(empty, 'init', '-q');
    const r = scan('git push', empty);
    assert.strictEqual(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(/could not read the diff/.test(out.systemMessage), r.stdout);
    assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.ok(!('permissionDecision' in out.hookSpecificOutput));
  });

  // Built at runtime so this file never trips secret-scan on its own commit.
  const shapes = [
    ['URL credentials, no TLD', 'psql postgres://app:s3cr3tPass@localhost/app', 's3cr3tPass'],
    ['Authorization: Basic', "curl -H 'Authorization: Basic dXNlcjpwYXNzd29yZA==' https://x", 'dXNlcjpwYXNzd29yZA'],
    ['Authorization: Digest', 'Authorization: Digest username="bob", response="6629fae49393a05397450978507c4ef1"', '6629fae49393'],
    ['mysql -p attached', 'mysql -u root -pS3cretPw appdb', 'S3cretPw'],
    ['curl -u', 'curl -u admin:hunter2pass https://api.x.io', 'hunter2pass'],
    ['Azure SAS sig', 'curl "https://a.blob.core.windows.net/c/f?sv=2022-11-02&sig=AbCdEf123456%2BGhIjKl789%3D"', 'AbCdEf123456'],
    ['npm token', `npm config set //r/:_t ${'npm_'}${'a1B2c3D4e5F6g7H8i9J0'}k1L2m3N4o5P6q7R8`, 'a1B2c3D4e5F6g7H8i9J0'],
    ['Slack webhook', `curl -d x https://hooks.slack.com/${'services'}/T0123ABCD/B0123ABCD/abcdefghijklmnopqrstuvwx`, 'abcdefghijklmnopqrstuvwx'],
    ['PGP private key', `echo '-----BEGIN PGP ${'PRIVATE'} KEY BLOCK-----\nlQOYBGabcdef\n-----END PGP PRIVATE KEY BLOCK-----'`, 'lQOYBGabcdef'],
    ['Authorization: Bearer', "curl -H 'Authorization: Bearer abc.def-ghi_123456' https://x", 'abc.def-ghi_123456'],
    ['Authorization: Token', "curl -H 'Authorization: Token 9f8e7d6c5b4a39281706' https://x", '9f8e7d6c5b4a39281706'],
    ['Authorization: ApiKey, JSON', 'fetch(u, {headers: {"Authorization": "ApiKey Zm9vYmFyYmF6cXV4"}})', 'Zm9vYmFyYmF6cXV4'],
    ['Authorization: AWS4-HMAC-SHA256',
      "curl -H 'Authorization: AWS4-HMAC-SHA256 Credential=AKID/20260101/us-east-1/s3/aws4_request, SignedHeaders=host, Signature=fe5f80f77d5fa3beca038a248ff027d0445342fe' https://s3",
      'fe5f80f77d5fa3beca03'],
    ['Cookie', "curl -H 'Cookie: session=4f3c2b1a0e9d8c7b; csrftoken=zz99yy88qq77' https://x", ['4f3c2b1a0e9d8c7b', 'zz99yy88qq77']],
    ['Set-Cookie', 'Set-Cookie: sid=a1b2c3d4e5f6a7b8; Path=/; HttpOnly', 'a1b2c3d4e5f6a7b8'],
    ['docker login -p', 'docker login -u bob -p Hunter2Secret registry.io', 'Hunter2Secret'],
    ['docker login --password', 'docker login --password Hunter2Secret registry.io', 'Hunter2Secret'],
    ['sshpass -p', 'sshpass -p Hunter2Secret ssh bob@host', 'Hunter2Secret'],
    ['gh auth login --token', 'gh auth login --token Qz7Tk2Lm9Np4Rs8V', 'Qz7Tk2Lm9Np4Rs8V'],
    ['cli --password', 'mycli --password Hunter2Secret', 'Hunter2Secret'],
    ['--token', 'deploy --token Qz7Tk2Lm9Np4Rs8V --env prod', 'Qz7Tk2Lm9Np4Rs8V'],
    ['--api-key', "cli --api-key 'Qz7Tk2Lm9Np4Rs8V'", 'Qz7Tk2Lm9Np4Rs8V'],
    ['redis-cli -a', 'redis-cli -h 127.0.0.1 -a Hunter2Secret ping', 'Hunter2Secret'],
    ['mysql --password', 'mysql -u root --password Hunter2Secret appdb', 'Hunter2Secret'],
    ['MY_PASS name', 'export MY_PASS=Hunter2Secret', 'Hunter2Secret'],
    ['DB_PW name', 'DB_PW=Hunter2Secret ./run', 'Hunter2Secret'],
    ['YAML token: >-', 'cat > c.yml <<EOF\ntoken: >-\n  Qz7Tk2Lm9Np4Rs8V\nport: 1\nEOF', 'Qz7Tk2Lm9Np4Rs8V'],
    ['YAML password: |', 'cat > c.yml <<EOF\ndb:\n  password: |\n    Hunter2Secret\nEOF', 'Hunter2Secret'],
    ...providerKeys.map(([kind, key]) => [kind, `export K=${key}`, key]),
  ];
  for (const [name, command, secret] of shapes) {
    test(`observe: ${name} redacted`, () => {
      const r = run(OBSERVE, {
        stdin: { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, session_id: 's3', cwd: proj },
      });
      assert.strictEqual(r.status, 0);
      const stored = lastObs(obsFileFor(proj)).input.command;
      assert.ok([].concat(secret).every(s => !stored.includes(s)) && stored.includes('[REDACTED'), stored);
    });
  }

  test('redactForPrompt: YAML block keeps sibling keys; pass/pw only as a whole word part', () => {
    const { redactForPrompt } = require(path.join(ROOT, 'hooks', 'scripts', '_common.js'));
    const y = redactForPrompt('db:\n  password: |\n    Hunter2Secret\n    line2Secret\n  host: db.local\ntoken: >-\n  Qz7Tk2Lm9Np4Rs8V\nport: 5432\n');
    assert.ok(!/Hunter2Secret|line2Secret|Qz7Tk2Lm9Np4Rs8V/.test(y), y);
    assert.ok(y.includes('  host: db.local\n') && y.includes('port: 5432'), y);
    const kept = 'passthrough=true bypass_mode=on compass=north';
    assert.strictEqual(redactForPrompt(kept), kept);
  });

  test('redactForPrompt: 1 MB adversarial input under 200 ms per shape', () => {
    const { redactForPrompt } = require(path.join(ROOT, 'hooks', 'scripts', '_common.js'));
    const MB = 1024 * 1024;
    const inputs = ['eyJ-'.repeat(100000), ...['eyJ-', 'a:', '-----BEGIN ', '=', 'a', 'a.', 'key.', 'key-', 'mysql ', 'curl ', 'AIza-',
      'glpat-', 'glpat-a', 'SG.', 'SG.a', 'hf_', 'hf_a', 'sk_test_', 'rk_test_a', 'Authorization: ', 'Authorization', 'Authorization: "',
      'Proxy-', 'Cookie: ', 'Set-', 'Cookie', '--password ', '--token=', '--a-', '--a-b-c-', '--pass', 'docker login ', 'docker ',
      'sshpass ', 'sshpass -p', 'redis-cli ', 'redis-cli -a', '_pw', 'pass_', 'token: |\n', '  token: |\n', 'token: >-\n  x\n', ' \n']
      .map(s => s.repeat(Math.ceil(MB / s.length)))];
    let worst = { ms: 0 };
    for (const s of inputs) {
      const t = process.hrtime.bigint();
      redactForPrompt(s);
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      if (ms > worst.ms) worst = { ms, s: s.slice(0, 12) };
      assert.ok(ms < 200, `${JSON.stringify(s.slice(0, 12))}... took ${ms.toFixed(0)} ms`);
    }
    if (process.env.FB_PERF) console.log(`worst redaction: ${JSON.stringify(worst.s)} ${worst.ms.toFixed(0)} ms`);
  });
} finally {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
}

console.log(`hooks-hardening: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
