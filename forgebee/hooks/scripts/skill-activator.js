#!/usr/bin/env node
/**
 * skill-activator.js — Analyze user prompts and recommend relevant skills
 * Runs on UserPromptSubmit event
 * Outputs additionalContext with skill recommendations
 * v2: Added intent detection — intercepts build/implement intent to suggest /plan or /workflow
 */

const fs = require('fs');
const path = require('path');
const common = require('./_common.js');

// ── Bootstrap: resolve paths for both plugin and legacy installs ──────
const PROJECT_DIR = common.getProjectDir();
const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/skill-manifest.json');
const TRIAGE_CACHE = path.join(PROJECT_DIR, '.claude/session-cache/project-triage.json');
const CACHE_TTL = 300; // 5 minutes

// ── Helper: Get file modification time ─────────────────────────────────
function getFileAge(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return Math.floor(Date.now() / 1000) - Math.floor(stats.mtimeMs / 1000);
  } catch (e) {
    return Infinity;
  }
}

// ── Helper: Extract YAML frontmatter from file ─────────────────────────
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  const yaml = match[1];
  const frontmatter = {};

  // Simple YAML parsing for key: value pairs
  const lines = yaml.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

// ── Helper: Extract triggers from content ──────────────────────────────
function extractTriggers(content) {
  const match = content.match(/MANDATORY TRIGGERS:\s*(.+)/i);
  if (!match) {
    return '';
  }

  return match[1]
    .split(',')
    .map(t => t.trim())
    .join(',');
}

// ── Helper: Build/refresh skill manifest cache ─────────────────────────
function buildSkillManifest() {
  const skillsDirs = common.findSkillsDirs();
  const skills = [];

  for (const skillDir of skillsDirs) {
    if (!fs.existsSync(skillDir)) {
      continue;
    }

    const entries = fs.readdirSync(skillDir);
    for (const entry of entries) {
      const skillPath = path.join(skillDir, entry, 'SKILL.md');

      if (!fs.existsSync(skillPath)) {
        continue;
      }

      const skillName = entry;
      const content = fs.readFileSync(skillPath, 'utf8');
      const frontmatter = extractFrontmatter(content);
      const description = frontmatter.description || '';
      const triggers = extractTriggers(content);

      skills.push({
        name: skillName,
        description: description,
        triggers: triggers,
        path: skillPath,
      });
    }
  }

  return skills;
}

// ── Helper: Check if cache needs rebuild ───────────────────────────────
function shouldRebuildCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return true;
  }

  const age = getFileAge(CACHE_FILE);
  return age > CACHE_TTL;
}

// ── Helper: Get or build skill manifest ────────────────────────────────
function getSkillManifest() {
  if (shouldRebuildCache()) {
    const skills = buildSkillManifest();
    try {
      common.ensureDir(path.dirname(CACHE_FILE));
      fs.writeFileSync(CACHE_FILE, JSON.stringify(skills, null, 2));
    } catch (e) {
      // Ignore write errors, return generated skills
    }
    return skills;
  }

  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

// ── Helper: Clean word list from description ──────────────────────────
function getSignificantWords(description) {
  const STOP_WORDS = new Set([
    'using',
    'these',
    'about',
    'which',
    'where',
    'their',
    'would',
    'could',
    'should',
    'there',
    'through',
    'between',
    'before',
    'after',
    'other',
    'under',
    'during',
    'without',
    'within',
    'including',
    'building',
    'working',
    'following',
  ]);

  // Extract words longer than 6 characters
  const words = description
    .toLowerCase()
    .match(/\b[a-z]{7,}\b/g) || [];

  return words.filter(w => !STOP_WORDS.has(w));
}

// ── Main script ───────────────────────────────────────────────────────
async function main() {
  const input = await common.readStdinJson();

  if (!input) {
    process.exit(0);
  }

  const PROMPT = input.prompt;

  if (!PROMPT) {
    process.exit(0);
  }

  // ── Intent Detection — intercept build/implement requests ─────────────
  const PROMPT_LOWER = PROMPT.toLowerCase();
  let INTENT_CONTEXT = '';

  // Detect implementation intent (build, implement, create feature, add feature, etc.)
  // Skip if the user is already using a command (starts with /)
  if (!PROMPT.startsWith('/')) {
    // Strong implementation signals — suggest /workflow
    const BUILD_PATTERNS =
      /build a |build the |implement |create a new |add a new feature|develop a |ship a |code a |make a new |architect a |set up a new |scaffold /i;
    if (BUILD_PATTERNS.test(PROMPT_LOWER)) {
      INTENT_CONTEXT = `**Implementation intent detected.** Before jumping into code, consider:\n- \`/workflow\` — Full pipeline with planning, debate, and delivery\n- \`/plan\` — Lightweight planning (brief → requirements → architecture → stories)\n- \`/team\` — Quick multi-agent delegation without ceremony\n\nPlanning first catches design issues before they become code rewrites.\n`;
    }

    // Debug/fix signals — suggest /debug
    const DEBUG_PATTERNS =
      /fix this bug|debug |broken |not working|crashes when|error when|fails to |throwing an error|can.t figure out why/i;
    if (!INTENT_CONTEXT && DEBUG_PATTERNS.test(PROMPT_LOWER)) {
      INTENT_CONTEXT = `**Debug intent detected.** Consider using \`/debug\` for systematic debugging (reproduce → isolate → diagnose → fix) instead of ad-hoc investigation.\n`;
    }

    // Refactor signals — suggest /refactor
    const REFACTOR_PATTERNS =
      /refactor |clean up |restructure |reorganize |simplify |extract |decouple |split this /i;
    if (!INTENT_CONTEXT && REFACTOR_PATTERNS.test(PROMPT_LOWER)) {
      INTENT_CONTEXT = `**Refactor intent detected.** Consider using \`/refactor\` for safe refactoring with test verification and behavior preservation checks.\n`;
    }

    // TDD signals — suggest tdd-enforcer
    const TDD_PATTERNS = /test.first|test.driven|tdd|write tests before|red.green.refactor/i;
    if (TDD_PATTERNS.test(PROMPT_LOWER)) {
      INTENT_CONTEXT += `**TDD mode available.** The \`tdd-enforcer\` agent can enforce RED-GREEN-REFACTOR discipline throughout implementation.\n`;
    }
  }

  // ── Match prompt against skills ───────────────────────────────────────
  const skills = getSkillManifest();
  let MATCHED_SKILLS = '';

  for (const skill of skills) {
    const NAME = skill.name;
    const TRIGGERS = skill.triggers || '';
    const DESC = skill.description || '';

    // Check trigger keywords
    if (TRIGGERS) {
      const triggerList = TRIGGERS.split(',').map(t => t.trim());
      let matched = false;

      for (const trigger of triggerList) {
        if (trigger && new RegExp(trigger, 'i').test(PROMPT_LOWER)) {
          MATCHED_SKILLS += `- Use the **${NAME}** skill: ${DESC}\n`;
          matched = true;
          break;
        }
      }

      if (matched) {
        continue;
      }
    }

    // Check description keywords as fallback
    if (!MATCHED_SKILLS.includes(NAME)) {
      const significantWords = getSignificantWords(DESC);
      for (const word of significantWords) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(PROMPT_LOWER)) {
          MATCHED_SKILLS += `- Consider the **${NAME}** skill: ${DESC}\n`;
          break;
        }
      }
    }
  }

  // ── Inject project triage context ─────────────────────────────────────
  let TRIAGE_CONTEXT = '';

  if (fs.existsSync(TRIAGE_CACHE)) {
    try {
      const triageContent = fs.readFileSync(TRIAGE_CACHE, 'utf8');
      const triage = JSON.parse(triageContent);

      const PROJECT_TYPE = triage.project_type || 'unknown';
      if (PROJECT_TYPE !== 'unknown' && PROJECT_TYPE !== 'null') {
        const WP_TYPE = triage.wordpress?.type || 'none';
        const WP_SUB = triage.wordpress?.subtype || '';
        const NODE_FW = triage.node?.framework || 'none';
        const HAS_TS = triage.node?.typescript || false;
        const STYLING = (triage.styling?.systems || []).join(', ');
        const DB_ORM = triage.database?.orm || 'none';
        const WP_ECO = (triage.wordpress?.ecosystem || []).join(', ');

        TRIAGE_CONTEXT = `**Project:** ${PROJECT_TYPE}`;

        if (WP_TYPE !== 'none') {
          TRIAGE_CONTEXT += ` (WP ${WP_TYPE}${WP_SUB ? ` / ${WP_SUB}` : ''})`;
        }

        if (WP_ECO) {
          TRIAGE_CONTEXT += ` [${WP_ECO}]`;
        }

        if (NODE_FW !== 'none') {
          TRIAGE_CONTEXT += ` | Framework: ${NODE_FW}`;
        }

        if (HAS_TS === true || HAS_TS === 'true') {
          TRIAGE_CONTEXT += ` + TypeScript`;
        }

        if (STYLING) {
          TRIAGE_CONTEXT += ` | Styling: ${STYLING}`;
        }

        if (DB_ORM !== 'none') {
          TRIAGE_CONTEXT += ` | DB: ${DB_ORM}`;
        }

        const SUPABASE = triage.supabase?.detected || false;
        if (SUPABASE === true || SUPABASE === 'true') {
          const SB_FEATURES = (triage.supabase?.features || []).join(', ');
          TRIAGE_CONTEXT += ` | Supabase`;
          if (SB_FEATURES) {
            TRIAGE_CONTEXT += ` [${SB_FEATURES}]`;
          }
        }

        TRIAGE_CONTEXT += ` — Follow conventions from \`project-router\` skill references.\n`;
      }
    } catch (e) {
      // Ignore triage parsing errors
    }
  }

  // ── Output recommendations ────────────────────────────────────────────
  let CONTEXT = '';

  if (TRIAGE_CONTEXT) {
    CONTEXT += TRIAGE_CONTEXT;
  }

  if (INTENT_CONTEXT) {
    CONTEXT += INTENT_CONTEXT;
  }

  if (MATCHED_SKILLS) {
    CONTEXT += `📌 Skill Recommendations:\n${MATCHED_SKILLS}`;
  }

  if (CONTEXT) {
    // Escape quotes and format for JSON
    const escapedContext = CONTEXT.replace(/"/g, '\\"').replace(/\n/g, ' ');
    console.log(JSON.stringify({ additionalContext: escapedContext }));
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
