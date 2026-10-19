#!/usr/bin/env node
/**
 * check-references.js — Validate persona ↔ references/ symmetry + integrity.
 *
 * Implements H-1 + H-3 from docs/planning/elicit-2026-05-19.md.
 *
 * Checks:
 *   1. Every `forgebee/references/<name>.md` has a matching persona.
 *   2. Every persona with a `## Reference Library` block points to a real file.
 *   3. References that exist are not silently empty (>=20 lines).
 *   4. Reference file's first heading matches its filename.
 *   5. Agent/skill markdown files have balanced code fences (even ``` count).
 *   6. SKILL.md files that point to a ${CLAUDE_PLUGIN_ROOT}/skills/_<shared>.md include reference a real file.
 *   7. Agent/skill/command/reference markdown uses ${CLAUDE_PLUGIN_ROOT}/, not repo-relative forgebee/ paths.
 *
 * Usage:
 *   node scripts/check-references.js          → exit 1 if any problems
 *   node scripts/check-references.js --fix    → delete orphan references
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'forgebee', 'agents');
const REFS_DIR = path.join(ROOT, 'forgebee', 'references');
const SKILLS_DIR = path.join(ROOT, 'forgebee', 'skills');

const fixMode = process.argv.slice(2).includes('--fix');

function listAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
}

function listReferences() {
  if (!fs.existsSync(REFS_DIR)) return [];
  return fs.readdirSync(REFS_DIR).filter(f => f.endsWith('.md'));
}

function personaReferencesName(content) {
  const m = content.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/references\/([\w-]+)\.md/);
  return m ? `${m[1]}.md` : null;
}

function main() {
  const agents = listAgents();
  const refs = listReferences();
  const refSet = new Set(refs);
  const problems = [];

  // Check 1: orphan references
  for (const refFile of refs) {
    if (!fs.existsSync(path.join(AGENTS_DIR, refFile))) {
      problems.push({ type: 'orphan-reference', file: `forgebee/references/${refFile}`, msg: `No matching persona at forgebee/agents/${refFile}` });
    }
  }

  // Checks 2-4
  for (const agentFile of agents) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, agentFile), 'utf8');

    // Check 5: fence parity — an odd number of ``` lines means an unclosed code
    // fence (this catches the growth-agent unclosed-fence bug).
    const fenceCount = content.split('\n').filter(l => l.startsWith('```')).length;
    if (fenceCount % 2 !== 0) {
      problems.push({ type: 'fence-parity', file: `forgebee/agents/${agentFile}`, msg: `Odd number of code fences (${fenceCount}) — unclosed \`\`\` block` });
    }

    if (!content.includes('## Reference Library')) continue;
    const referenced = personaReferencesName(content);
    if (!referenced) {
      problems.push({ type: 'persona-points-nowhere', file: `forgebee/agents/${agentFile}`, msg: 'Has Reference Library section but no link' });
      continue;
    }
    if (!refSet.has(referenced)) {
      problems.push({ type: 'missing-reference', file: `forgebee/agents/${agentFile}`, msg: `Points to forgebee/references/${referenced} — file does not exist` });
      continue;
    }
    const refContent = fs.readFileSync(path.join(REFS_DIR, referenced), 'utf8');
    const nonBlank = refContent.split('\n').filter(l => l.trim().length > 0).length;
    if (nonBlank < 20) {
      problems.push({ type: 'empty-reference', file: `forgebee/references/${referenced}`, msg: `Only ${nonBlank} non-blank lines — likely stub` });
    }
    const heading = refContent.match(/^#\s+([^\n]+)/m);
    // Match the FULL filename stem (e.g. "wordpress-backend"), not just the first
    // token. Normalize both sides to space-separated lowercase words so a heading
    // like "WordPress Backend" matches "wordpress-backend".
    const expected = referenced.replace(/\.md$/, '').replace(/-/g, ' ').toLowerCase();
    if (heading && !heading[1].toLowerCase().replace(/-/g, ' ').includes(expected)) {
      problems.push({ type: 'heading-mismatch', file: `forgebee/references/${referenced}`, msg: `Heading "${heading[1]}" doesn't reference "${expected}"` });
    }
  }

  // Check 6: skill shared-include integrity — SKILL.md files that point to a
  // forgebee/skills/_<name>.md shared include (e.g. _debate-protocol.md,
  // _review-finding-contract.md) must reference a file that exists.
  const skillDirs = fs.existsSync(SKILLS_DIR)
    ? fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];
  for (const dir of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const content = fs.readFileSync(skillPath, 'utf8');
    const includes = new Set(content.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/(_[\w-]+\.md)/g) || []);
    for (const inc of includes) {
      const incFile = inc.replace('${CLAUDE_PLUGIN_ROOT}/skills/', '');
      if (!fs.existsSync(path.join(SKILLS_DIR, incFile))) {
        problems.push({ type: 'missing-shared-include', file: `forgebee/skills/${dir}/SKILL.md`, msg: `Points to forgebee/skills/${incFile} — shared include does not exist` });
      }
    }
  }

  // Check 7: runtime paths into the plugin must use ${CLAUDE_PLUGIN_ROOT}. A repo-relative
  // `forgebee/...` path resolves only inside this repo, never in a user's project.
  // audit-self is exempt: it audits this repo's working copy on purpose.
  const RELATIVE_RUNTIME_PATH = /(?<![\w./}-])forgebee\/(?:skills\/[\w-]+(?:\/[\w.-]+)*\.md|references\/[\w-]+\.md|templates\/[\w.-]+|commands\/[\w-]+\.md|INDEX\.md)/g;
  const mdRoots = ['agents', 'skills', 'commands', 'references'].map(d => path.join(ROOT, 'forgebee', d));
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.md') ? [path.join(dir, e.name)] : []);
  for (const file of mdRoots.filter(fs.existsSync).flatMap(walk)) {
    const rel = path.relative(ROOT, file);
    if (rel.startsWith(path.join('forgebee', 'skills', 'audit-self'))) continue;
    const hits = fs.readFileSync(file, 'utf8').match(RELATIVE_RUNTIME_PATH);
    if (hits) problems.push({ type: 'repo-relative-path', file: rel, msg: `Use \${CLAUDE_PLUGIN_ROOT}/ instead of: ${[...new Set(hits)].join(', ')}` });
  }

  console.log(`Personas:    ${agents.length}`);
  console.log(`References:  ${refs.length}`);
  console.log(`Problems:    ${problems.length}`);
  if (problems.length === 0) {
    console.log('\n✓ All persona ↔ reference pairs check out.');
    process.exit(0);
  }

  for (const p of problems) console.log(`\n[${p.type}] ${p.file}\n  ${p.msg}`);

  if (fixMode) {
    let fixed = 0;
    for (const p of problems) {
      if (p.type === 'orphan-reference') {
        fs.unlinkSync(path.join(ROOT, p.file));
        console.log(`  → deleted ${p.file}`);
        fixed++;
      }
    }
    console.log(`\nAuto-fixed: ${fixed} / ${problems.length}.`);
  } else {
    console.log('\nRun with --fix to delete orphan references.');
  }

  process.exit(problems.length === 0 ? 0 : 1);
}

main();
