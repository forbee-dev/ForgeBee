#!/usr/bin/env node

/**
 * ForgeBee → OpenClaw Installer
 * Converts ForgeBee agents and commands into OpenClaw-compatible skills
 *
 * Usage: node install-openclaw.js [workspace-dir]
 * Default workspace: ~/.openclaw/workspace
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get FORGEBEE_DIR (parent of openclaw directory)
const OPENCLAW_DIR = path.dirname(path.resolve(process.argv[1]));
const FORGEBEE_DIR = path.dirname(OPENCLAW_DIR);

// Get workspace directory (first arg, default ~/.openclaw/workspace)
const WORKSPACE = process.argv[2] || path.join(os.homedir(), '.openclaw', 'workspace');
const SKILLS_DIR = path.join(WORKSPACE, 'skills');

console.log('🐝 ForgeBee → OpenClaw Installer');
console.log('=================================');
console.log('');
console.log(`Source:    ${FORGEBEE_DIR}`);
console.log(`Target:    ${SKILLS_DIR}`);
console.log('');

try {
  // Create skills directory
  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  // ── Helper function to parse frontmatter ──────────────────────────────
  function parseFrontmatter(content) {
    const lines = content.split('\n');
    const fields = {};
    let bodyStart = 0;
    let inFrontmatter = false;
    let fenceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '---') {
        fenceCount++;
        if (fenceCount === 1) {
          inFrontmatter = true;
          continue;
        } else if (fenceCount === 2) {
          bodyStart = i + 1;
          break;
        }
      }

      if (inFrontmatter && fenceCount === 1) {
        // Parse key: value format
        const match = line.match(/^([a-z-]+):\s*(.*)$/);
        if (match) {
          fields[match[1]] = match[2].trim();
        }
      }
    }

    const body = lines.slice(bodyStart).join('\n').trim();
    return { fields, body };
  }

  // ── Convert agents to OpenClaw skills ────────────────────────────────
  console.log('📦 Converting agents...');
  const agentsDir = path.join(FORGEBEE_DIR, '.claude', 'agents');
  let agentCount = 0;

  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

    for (const agentFile of agentFiles) {
      const agentPath = path.join(agentsDir, agentFile);
      const agentContent = fs.readFileSync(agentPath, 'utf-8');
      const { fields, body } = parseFrontmatter(agentContent);

      const agentName = path.basename(agentFile, '.md');
      const skillDir = path.join(SKILLS_DIR, `forgebee-${agentName}`);
      fs.mkdirSync(skillDir, { recursive: true });

      // Extract frontmatter fields
      const name = fields.name || agentName;
      const desc = fields.description || 'ForgeBee agent';
      let model = fields.model || 'sonnet';

      // Map Claude Code model names to OpenClaw-compatible names
      const modelMap = {
        opus: 'claude-opus-4-5-20250501',
        haiku: 'claude-haiku-4-5-20251001',
        sonnet: 'claude-sonnet-4-5-20250929',
      };
      const ocModel = modelMap[model] || 'claude-sonnet-4-5-20250929';

      // Write OpenClaw SKILL.md
      const skillContent = `---
name: forgebee-${agentName}
description: "[ForgeBee] ${desc}"
version: 2.3.0
metadata:
  openclaw:
    emoji: "🐝"
    homepage: https://github.com/forbee-dev/ForgeBee
---

${body}
`;

      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(skillPath, skillContent);
      agentCount++;
    }
  }

  console.log(`✅ Converted ${agentCount} agents → OpenClaw skills`);

  // ── Convert commands to OpenClaw skills ──────────────────────────────
  console.log('📦 Converting commands...');
  const commandsDir = path.join(FORGEBEE_DIR, '.claude', 'commands');
  let cmdCount = 0;

  if (fs.existsSync(commandsDir)) {
    const cmdFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));

    for (const cmdFile of cmdFiles) {
      const cmdPath = path.join(commandsDir, cmdFile);
      const cmdContent = fs.readFileSync(cmdPath, 'utf-8');
      const { fields, body } = parseFrontmatter(cmdContent);

      const cmdName = path.basename(cmdFile, '.md');
      const skillDir = path.join(SKILLS_DIR, `forgebee-cmd-${cmdName}`);
      fs.mkdirSync(skillDir, { recursive: true });

      // Extract frontmatter fields
      const name = fields.name || cmdName;
      const desc = fields.description || 'ForgeBee command';

      // Write OpenClaw SKILL.md
      const skillContent = `---
name: forgebee-cmd-${cmdName}
description: "[ForgeBee] ${desc}"
version: 2.3.0
user-invocable: true
metadata:
  openclaw:
    emoji: "🐝"
    homepage: https://github.com/forbee-dev/ForgeBee
---

${body}
`;

      const skillPath = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(skillPath, skillContent);
      cmdCount++;
    }
  }

  console.log(`✅ Converted ${cmdCount} commands → OpenClaw skills (user-invocable)`);

  // ── Install AGENTS.md overlay ────────────────────────────────────────
  console.log('📚 Processing AGENTS.md...');
  const agentsMdPath = path.join(WORKSPACE, 'AGENTS.md');

  if (fs.existsSync(agentsMdPath)) {
    const agentsMdContent = fs.readFileSync(agentsMdPath, 'utf-8');

    if (!agentsMdContent.includes('ForgeBee')) {
      const forgebeeSection = `
## ForgeBee Specialist Agents

ForgeBee provides 44 specialist agents organized by function. Each agent is available as an OpenClaw skill prefixed with \`forgebee-\`.

**Development:** forgebee-frontend-specialist, forgebee-backend-engineer, forgebee-database-specialist, forgebee-security-auditor, forgebee-test-engineer, forgebee-devops-engineer, forgebee-performance-optimizer, forgebee-debugger-detective

**Quality Gates:** forgebee-verification-enforcer, forgebee-tdd-enforcer, forgebee-delivery-agent

**Debate System:** forgebee-requirements-advocate, forgebee-requirements-skeptic, forgebee-requirements-judge, forgebee-code-advocate, forgebee-code-skeptic, forgebee-code-judge, forgebee-strategy-advocate, forgebee-strategy-skeptic, forgebee-strategy-judge

**Growth OS:** forgebee-brand-strategist, forgebee-market-intel, forgebee-audience-architect, forgebee-content-architect, forgebee-hook-engineer, forgebee-idea-machine, forgebee-engagement-strategist, forgebee-content-creator, forgebee-growth-hacker, forgebee-calendar-builder, forgebee-performance-analyst, forgebee-conversion-optimizer, forgebee-email-strategist

**Commands (user-invocable):** forgebee-cmd-workflow, forgebee-cmd-team, forgebee-cmd-plan, forgebee-cmd-growth, forgebee-cmd-review, forgebee-cmd-debug, forgebee-cmd-test, forgebee-cmd-security, forgebee-cmd-perf, and more.
`;

      fs.appendFileSync(agentsMdPath, forgebeeSection);
      console.log('✅ Added ForgeBee section to AGENTS.md');
    } else {
      console.log('⏭️  ForgeBee section already exists in AGENTS.md');
    }
  } else {
    console.log(`⚠️  No AGENTS.md found at ${agentsMdPath} — create one to reference ForgeBee skills`);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('');
  console.log('🐝 ForgeBee installed for OpenClaw!');
  console.log('');
  console.log(`   Skills:   ${agentCount + cmdCount} total`);
  console.log(`   Agents:   ${agentCount} specialist agents (forgebee-*)`);
  console.log(`   Commands: ${cmdCount} slash commands (forgebee-cmd-*)`);
  console.log(`   Location: ${path.join(SKILLS_DIR, 'forgebee-*')}`);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Restart OpenClaw gateway to pick up new skills');
  console.log("   2. Try: 'use forgebee-cmd-review to review my code'");
  console.log('   3. Skills auto-trigger based on their descriptions');
  console.log('');
} catch (error) {
  console.error('❌ Installation failed:', error.message);
  process.exit(1);
}
