#!/usr/bin/env node
// Self-check: install twice into a temp dir, then assert the OpenCode output shape.

const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const INSTALLER = path.join(__dirname, 'install-opencode.js');
const SRC = path.join(__dirname, '..', 'forgebee');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const frontmatter = f => fs.readFileSync(f, 'utf-8').split('\n---')[0].split('\n').slice(1);
const field = (fm, key) => (fm.find(l => l.startsWith(`${key}:`)) || '').slice(key.length + 1).trim();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forgebee-opencode-'));
try {
  for (let i = 0; i < 2; i++) execFileSync('node', [INSTALLER, tmp], { stdio: 'pipe' });

  const skillsDir = path.join(tmp, 'skills');
  const skills = fs.readdirSync(skillsDir);
  assert.ok(skills.length > 0, 'no skills installed');
  for (const dir of skills) {
    const name = field(frontmatter(path.join(skillsDir, dir, 'SKILL.md')), 'name');
    assert.strictEqual(name, dir, `skill name != dir: ${dir}`);
    assert.match(name, NAME_RE);
    assert.ok(name.length <= 64);
  }

  const mds = walk(tmp).filter(f => f.endsWith('.md'));
  for (const f of mds) {
    const text = fs.readFileSync(f, 'utf-8');
    assert.ok(!text.includes('${CLAUDE_PLUGIN_ROOT}'), `CLAUDE_PLUGIN_ROOT left in ${f}`);
    assert.ok(!text.includes('forgebee:'), `forgebee: left in ${f}`);
  }

  const agentsDir = path.join(tmp, 'agents');
  const agents = fs.readdirSync(agentsDir);
  assert.ok(agents.length > 0, 'no agents installed');
  for (const a of agents) {
    const fm = frontmatter(path.join(agentsDir, a));
    assert.ok(field(fm, 'description'), `${a}: no description`);
    assert.strictEqual(field(fm, 'mode'), 'subagent', `${a}: mode`);
    assert.ok(!field(fm, 'model') && !field(fm, 'tools'), `${a}: model/tools left`);
  }
  for (const skip of ['orchestrator', 'direct']) {
    assert.ok(!agents.includes(`forgebee-${skip}.md`), `${skip} must be absent`);
  }

  const srcCmds = fs.readdirSync(path.join(SRC, 'commands')).filter(f => f.endsWith('.md')).length;
  assert.strictEqual(fs.readdirSync(path.join(tmp, 'commands')).length, srcCmds, 'command count');

  assert.ok(fs.existsSync(path.join(tmp, 'forgebee', '.opencode-install.json')), 'manifest missing');
  assert.ok(!fs.existsSync(path.join(tmp, 'forgebee', 'eval')), 'eval must not be copied');

  const own = fs.mkdtempSync(path.join(os.tmpdir(), 'forgebee-opencode-own-'));
  try {
    fs.mkdirSync(path.join(own, 'commands'));
    const mine = path.join(own, 'commands', 'review.md');
    fs.writeFileSync(mine, 'mine');
    for (let i = 0; i < 2; i++) execFileSync('node', [INSTALLER, own], { stdio: 'pipe' });
    assert.strictEqual(fs.readFileSync(mine, 'utf-8'), 'mine', 'user file overwritten');
    const { created } = JSON.parse(fs.readFileSync(path.join(own, 'forgebee', '.opencode-install.json'), 'utf-8'));
    assert.ok(!created.includes(path.join('commands', 'review.md')), 'user file in manifest');
  } finally {
    fs.rmSync(own, { recursive: true, force: true });
  }

  console.log(`OK: ${skills.length} skills, ${agents.length} agents, ${srcCmds} commands`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
