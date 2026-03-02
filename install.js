#!/usr/bin/env node

/**
 * ForgeBee Installer — Drop-in development framework for Claude Code and OpenClaw
 *
 * Usage: node install.js [target-directory]
 *
 * NOTE: This is the legacy manual installer. The recommended way to install
 * ForgeBee is as a plugin via the Claude Code plugin system:
 *   /plugin marketplace add forbee-dev/ForgeBee
 *   /plugin install forgebee@forbee-dev
 *
 * This script remains for users who prefer git clone + manual installation
 * or who are not using the plugin system.
 */

const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

// Get FORGEBEE_DIR (current directory of this script)
const FORGEBEE_DIR = path.dirname(path.resolve(process.argv[1]));

// Get target directory (first arg, default to current working directory)
const TARGET = process.argv[2] || '.';

// Resolve target to absolute path
const TARGET_ABS = path.resolve(TARGET);

console.log('🔧 ForgeBee Installer (Legacy)');
console.log('==============================');
console.log('');
console.log('💡 Tip: ForgeBee is also available as a plugin. In Claude Code, run:');
console.log('   /plugin marketplace add forbee-dev/ForgeBee');
console.log('   /plugin install forgebee@forbee-dev');
console.log('');
console.log(`Installing to: ${TARGET_ABS}`);
console.log('');

try {
  // Check if .claude directory already exists
  const settingsPath = path.join(TARGET_ABS, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    console.log('⚠️  Existing .claude/settings.json detected.');
    console.log('   Your current settings will be backed up to .claude/settings.json.bak');
    const backupPath = path.join(TARGET_ABS, '.claude', 'settings.json.bak');
    fs.copyFileSync(settingsPath, backupPath);
  }

  // Create directory structure
  console.log('📁 Creating directory structure...');
  const dirsToCreate = [
    '.claude/hooks',
    '.claude/commands',
    '.claude/agents',
    '.claude/sessions',
    '.claude/session-cache/context-backups',
    '.claude/learnings',
    'docs/pm/features',
    'docs/planning/briefs',
    'docs/planning/requirements',
    'docs/planning/stories',
    'docs/marketing/brand',
    'docs/marketing/intel',
    'docs/marketing/audience',
    'docs/marketing/content-architecture',
    'docs/marketing/hooks',
    'docs/marketing/ideas',
    'docs/marketing/engagement',
    'docs/marketing/growth',
    'docs/marketing/analytics',
    'docs/marketing/calendar',
    'docs/marketing/cro',
    'docs/marketing/email',
  ];

  for (const dir of dirsToCreate) {
    const fullPath = path.join(TARGET_ABS, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Copy hooks (.js files)
  console.log('🪝 Installing hooks...');
  const hooksDir = path.join(FORGEBEE_DIR, '.claude', 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));
    for (const hookFile of hookFiles) {
      const srcPath = path.join(hooksDir, hookFile);
      const destPath = path.join(TARGET_ABS, '.claude', 'hooks', hookFile);
      fs.copyFileSync(srcPath, destPath);
      // Make executable on Unix-like systems
      try {
        fs.chmodSync(destPath, 0o755);
      } catch (e) {
        // Windows doesn't support chmod, ignore
      }
    }
  }

  // Copy commands (.md files)
  console.log('🤖 Installing agent commands...');
  const commandsDir = path.join(FORGEBEE_DIR, '.claude', 'commands');
  if (fs.existsSync(commandsDir)) {
    const cmdFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
    for (const cmdFile of cmdFiles) {
      const srcPath = path.join(commandsDir, cmdFile);
      const destPath = path.join(TARGET_ABS, '.claude', 'commands', cmdFile);
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Copy specialist agents (.md files)
  console.log('🧠 Installing specialist agents...');
  const agentsDir = path.join(FORGEBEE_DIR, '.claude', 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const agentFile of agentFiles) {
      const srcPath = path.join(agentsDir, agentFile);
      const destPath = path.join(TARGET_ABS, '.claude', 'agents', agentFile);
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Copy settings (merge if existing)
  const settingsBackupPath = path.join(TARGET_ABS, '.claude', 'settings.json.bak');
  if (fs.existsSync(settingsBackupPath)) {
    console.log('⚙️  Merging settings.json (keeping your existing settings + adding ForgeBee hooks)...');
    const srcSettings = path.join(FORGEBEE_DIR, '.claude', 'settings.json');
    const destSettings = path.join(TARGET_ABS, '.claude', 'settings.json');
    fs.copyFileSync(srcSettings, destSettings);
    console.log('   Note: Review .claude/settings.json and merge any custom settings from .claude/settings.json.bak');
  } else {
    const srcSettings = path.join(FORGEBEE_DIR, '.claude', 'settings.json');
    const destSettings = path.join(TARGET_ABS, '.claude', 'settings.json');
    fs.copyFileSync(srcSettings, destSettings);
  }

  // Copy CLAUDE.md template (only if none exists)
  const claudeMdPath = path.join(TARGET_ABS, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    console.log('📝 Installing CLAUDE.md template...');
    const srcClaude = path.join(FORGEBEE_DIR, 'CLAUDE.md');
    fs.copyFileSync(srcClaude, claudeMdPath);
  } else {
    console.log(`📝 CLAUDE.md already exists — skipping (template available at ${FORGEBEE_DIR}/CLAUDE.md)`);
  }

  // Copy PM templates (only if not already set up)
  const pmStatePath = path.join(TARGET_ABS, 'docs', 'pm', 'state.yaml');
  if (!fs.existsSync(pmStatePath)) {
    console.log('📊 Installing PM system templates...');
    const srcState = path.join(FORGEBEE_DIR, 'docs', 'pm', 'state.yaml');
    const srcIndex = path.join(FORGEBEE_DIR, 'docs', 'pm', 'index.md');
    const srcDecisions = path.join(FORGEBEE_DIR, 'docs', 'pm', 'decisions.md');
    const destState = path.join(TARGET_ABS, 'docs', 'pm', 'state.yaml');
    const destIndex = path.join(TARGET_ABS, 'docs', 'pm', 'index.md');
    const destDecisions = path.join(TARGET_ABS, 'docs', 'pm', 'decisions.md');

    if (fs.existsSync(srcState)) fs.copyFileSync(srcState, destState);
    if (fs.existsSync(srcIndex)) fs.copyFileSync(srcIndex, destIndex);
    if (fs.existsSync(srcDecisions)) fs.copyFileSync(srcDecisions, destDecisions);
  } else {
    console.log('📊 PM system already exists — skipping templates');
  }

  // Initialize learnings file
  const learningsPath = path.join(TARGET_ABS, '.claude', 'learnings', 'learnings.md');
  if (!fs.existsSync(learningsPath)) {
    const learningsContent = `# Project Learnings

Auto-captured patterns, insights, and useful commands from Claude Code sessions.

---

`;
    fs.writeFileSync(learningsPath, learningsContent);
  }

  // Validate JSON
  console.log('🔗 Configuring paths...');
  try {
    const settingsContent = fs.readFileSync(
      path.join(TARGET_ABS, '.claude', 'settings.json'),
      'utf-8'
    );
    JSON.parse(settingsContent);
    console.log('✅ settings.json is valid JSON');
  } catch (e) {
    console.log('❌ settings.json has invalid JSON');
  }

  console.log('');
  console.log('✅ ForgeBee installed successfully!');
  console.log('');
  console.log("📋 What's included:");
  console.log('   HOOKS (10 scripts):');
  console.log('   • permission-guard     — Auto-approve safe commands, block dangerous ones');
  console.log('   • skill-activator      — Auto-recommend relevant skills per prompt');
  console.log('   • session-save/load    — Save/restore context across sessions');
  console.log('   • self-improve          — Auto-capture learnings with structured indexing');
  console.log('   • task-sync             — Bidirectional sync with TASKS.md');
  console.log('   • pm-sync               — Project management state sync and stale detection');
  console.log('   • context-guard         — Backup context before compaction');
  console.log('   • checkpoint            — Phase-level durability checkpoints for crash recovery');
  console.log('   • audit-trail           — Append-only governance log (permissions, debates, verifications)');
  console.log('');
  console.log('   COMMANDS (27 slash commands):');
  console.log('   • Plan:   /plan');
  console.log('   • Dev:    /review /debug /architect /refactor /test /docs /security /perf /migrate /deploy /browser-debug');
  console.log('   • Growth: /growth /content /gtm /seo /social /launch /competitive /landing /payments /analytics');
  console.log('   • Meta:   /workflow /team /idea /pm /audit');
  console.log('');
  console.log('   AGENTS (45 specialists for Agent Teams):');
  console.log('   • Design:     ux-designer, scrum-master');
  console.log('   • Dev Debate:  requirements-advocate/skeptic/judge, code-advocate/skeptic/judge');
  console.log('   • Mkt Debate:  strategy-advocate/skeptic/judge');
  console.log('   • Quality:     verification-enforcer, tdd-enforcer, contract-validator');
  console.log('   • Delivery:    delivery-agent, dashboard-generator');
  console.log('   • Dev:         frontend, backend, database, security, testing, devops, perf, debug');
  console.log('   • Research:    deep-researcher, content-writer, seo, session-librarian');
  console.log('   • Growth OS:   brand-strategist, market-intel, audience-architect, content-architect,');
  console.log('                  hook-engineer, idea-machine, engagement-strategist, content-creator,');
  console.log('                  growth-hacker, calendar-builder, performance-analyst,');
  console.log('                  conversion-optimizer, email-strategist');
  console.log('   • Platform:    supabase, ios, flutter, n8n');
  console.log('');
  console.log('   INFRASTRUCTURE:');
  console.log('   • Agent Teams enabled (multi-agent orchestration)');
  console.log('   • TaskCompleted evidence-based verification gate');
  console.log('   • Intent detection hook (suggests /workflow, /plan, /debug before ad-hoc coding)');
  console.log('   • Crash recovery via phase-level checkpointing (.claude/checkpoints/)');
  console.log('   • Governance audit trail (.claude/audit/) — immutable log of all decisions');
  console.log('   • Structured learnings index (.claude/learnings/index.jsonl) for cross-session querying');
  console.log('   • CLAUDE.md project memory template');
  console.log('   • TASKS.md auto-managed task tracking');
  console.log('   • docs/pm/ project management system (state.yaml + markdown dashboards)');
  console.log('   • docs/marketing/ Growth OS output directory (brand, intel, audience, hooks, etc.)');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Edit CLAUDE.md with your project-specific details');
  console.log('   2. Start Claude Code in your project directory');
  console.log('   3. Try: /review, /debug, /test, or any other command');
  console.log('');
  console.log('📚 Files:');
  console.log('   .claude/settings.json          — Hook configuration');
  console.log('   .claude/hooks/                  — Hook scripts');
  console.log('   .claude/agents/                 — Specialist agent definitions');
  console.log('   .claude/commands/               — Agent commands');
  console.log('   .claude/sessions/               — Session state (auto-managed)');
  console.log('   .claude/learnings/learnings.md  — Captured patterns (auto-managed)');
  console.log('   docs/pm/                        — Project management (state.yaml + dashboards)');
  console.log('   docs/marketing/                 — Growth OS outputs (brand, intel, content, etc.)');
  console.log('   CLAUDE.md                       — Project memory');
} catch (error) {
  console.error('❌ Installation failed:', error.message);
  process.exit(1);
}
