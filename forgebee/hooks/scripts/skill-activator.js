#!/usr/bin/env node
/**
 * skill-activator.js — Analyze user prompts and recommend relevant skills/agents
 * Runs on UserPromptSubmit event
 * Outputs hookSpecificOutput.additionalContext with routing recommendations
 * v2: Added intent detection — intercepts build/implement intent to suggest /plan or /workflow
 * v3: Agents are now scanned alongside skills, matches are scored and capped, and the
 *     payload uses hookSpecificOutput (top-level additionalContext was discarded).
 */

const fs = require('fs');
const path = require('path');
const common = require('./_common.js');

// ── Bootstrap: resolve paths for both plugin and legacy installs ──────
const PROJECT_DIR = common.getProjectDir();
const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/routing-manifest.json');
const TRIAGE_CACHE = path.join(PROJECT_DIR, '.claude/session-cache/project-triage.json');
const CACHE_TTL = 300; // 5 minutes
const MAX_RECOMMENDATIONS = 5;
const MIN_SCORE = 3;

// Name prefixes that belong to a detected stack. A prompt about the project's own
// stack should route to these before any generic surface.
const STACK_PREFIXES = {
  wordpress: ['wordpress-', 'wp-', 'woocommerce-', 'phpunit-'],
  nextjs: ['nextjs-', 'saas-'],
  supabase: ['supabase-'],
  llm: ['llm-'],
};

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
      let value = line.substring(colonIndex + 1).trim();
      // Drop surrounding quotes — they leaked into recommendations as \"…\"
      value = value.replace(/^["'](.*)["']$/, '$1');
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

// ── Helper: Build/refresh routing manifest cache (skills + agents) ─────
function buildRoutingManifest() {
  const entries = [];

  // Skills live at <dir>/<name>/SKILL.md
  for (const skillDir of common.findSkillsDirs()) {
    if (!fs.existsSync(skillDir)) {
      continue;
    }

    for (const entry of fs.readdirSync(skillDir)) {
      const skillPath = path.join(skillDir, entry, 'SKILL.md');

      if (!fs.existsSync(skillPath)) {
        continue;
      }

      const content = fs.readFileSync(skillPath, 'utf8');
      const frontmatter = extractFrontmatter(content);

      entries.push({
        kind: 'skill',
        name: entry,
        description: frontmatter.description || '',
        triggers: extractTriggers(content),
      });
    }
  }

  // Agents live at <dir>/<name>.md — flat files, no SKILL.md wrapper
  for (const agentDir of common.findAgentsDirs()) {
    if (!fs.existsSync(agentDir)) {
      continue;
    }

    for (const entry of fs.readdirSync(agentDir)) {
      if (!entry.endsWith('.md')) {
        continue;
      }

      const agentPath = path.join(agentDir, entry);
      const content = fs.readFileSync(agentPath, 'utf8');
      const frontmatter = extractFrontmatter(content);

      entries.push({
        kind: 'agent',
        name: frontmatter.name || entry.replace(/\.md$/, ''),
        description: frontmatter.description || '',
        triggers: extractTriggers(content),
      });
    }
  }

  // Commands live at <dir>/<name>.md and are the "run this task" surface
  const commandsDir = common.findCommandsDir();
  if (commandsDir && fs.existsSync(commandsDir)) {
    for (const entry of fs.readdirSync(commandsDir)) {
      if (!entry.endsWith('.md') || entry.startsWith('_')) {
        continue;
      }

      const commandPath = path.join(commandsDir, entry);
      const content = fs.readFileSync(commandPath, 'utf8');
      const frontmatter = extractFrontmatter(content);

      entries.push({
        kind: 'command',
        name: frontmatter.name || entry.replace(/\.md$/, ''),
        description: frontmatter.description || '',
        triggers: extractTriggers(content),
      });
    }
  }

  // Same name can appear in plugin + project + global installs; keep the first.
  const seen = new Set();
  return entries.filter(e => {
    const key = `${e.kind}:${e.name}`;
    if (seen.has(key) || !e.description) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ── Helper: Check if cache needs rebuild ───────────────────────────────
function shouldRebuildCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return true;
  }

  const age = getFileAge(CACHE_FILE);
  return age > CACHE_TTL;
}

// ── Helper: Get or build routing manifest ──────────────────────────────
function getRoutingManifest() {
  if (shouldRebuildCache()) {
    const entries = buildRoutingManifest();
    try {
      common.ensureDir(path.dirname(CACHE_FILE));
      fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
    } catch (e) {
      // Ignore write errors, return generated entries
    }
    return entries;
  }

  try {
    const content = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

// ── Helper: Normalize a word for loose matching ───────────────────────
function stem(word) {
  return word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word;
}

// ── Helper: Clean word list from description ──────────────────────────
const STOP_WORDS = new Set([
  'about', 'after', 'agent', 'also', 'asked', 'asking', 'before', 'being',
  'best', 'better', 'between', 'both', 'build', 'building', 'could', 'covers',
  'during', 'each', 'every', 'first', 'following', 'from', 'have', 'here',
  'including', 'instead', 'into', 'invoked', 'issue', 'just', 'less', 'like',
  'make', 'many', 'more', 'most', 'much', 'need', 'needs', 'only', 'other',
  'over', 'produce', 'quick', 'reach', 'reaches', 'right', 'runs', 'same',
  'should', 'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'turns', 'under', 'until',
  'usage', 'used', 'user', 'users', 'using', 'value', 'want', 'well', 'were',
  'what', 'when', 'where', 'which', 'while', 'with', 'within', 'without',
  'working', 'would', 'write', 'writing', 'your',
]);

function getSignificantWords(description) {
  // 4-char floor, not 5 — "meta", "hook", "cron", "role" carry real signal.
  const words = description.toLowerCase().match(/\b[a-z][a-z.-]{3,}\b/g) || [];
  return [...new Set(words.map(stem).filter(w => !STOP_WORDS.has(w)))];
}

// ── Helper: Extract acronyms from a description ───────────────────────
// ACF, SCF, SEO, API, RLS, CPT, TDD, HPOS are the highest-signal tokens in this
// domain and every one of them is too short for the word floor above. Capitalisation
// in the source description is what marks them, so read it before lowercasing.
function getAcronyms(description) {
  // Tolerate a plural "s" — "APIs", "CPTs", "CVEs" are written that way and a
  // strict all-caps match skips them entirely rather than yielding the stem.
  const found = description.match(/\b[A-Z][A-Z0-9]+(?=s\b|\b)/g) || [];
  return [...new Set(found.map(a => a.toLowerCase()))];
}

// ── Helper: Split a surface name into matchable tokens ────────────────
function getNameTokens(name) {
  return name
    .toLowerCase()
    .split(/[-_.]/)
    .filter(t => t.length >= 3)
    .map(stem);
}

// ── Helper: Score one surface against the prompt ──────────────────────
function scoreEntry(entry, prompt, promptWords, stacks) {
  let score = 0;

  // Explicit triggers are an exact-intent signal — treat as decisive.
  // Match against the raw prompt, not the token set: a trigger is often a
  // phrase ("design system"), which no single-token lookup can ever hit.
  for (const trigger of (entry.triggers || '').split(',')) {
    const clean = trigger.trim().toLowerCase();
    if (clean && prompt.includes(clean)) {
      score += 6;
      break;
    }
  }

  // A name token in the prompt ("wordpress", "security", "seo") is a strong hint.
  for (const token of getNameTokens(entry.name)) {
    if (promptWords.has(token)) {
      score += 3;
    }
  }

  // An acronym match is far more specific than a common word — weigh it higher.
  for (const acronym of getAcronyms(entry.description)) {
    if (promptWords.has(acronym)) {
      score += 2;
    }
  }

  // Description overlap is the weak signal — one point per distinct term.
  for (const word of getSignificantWords(entry.description)) {
    if (promptWords.has(word)) {
      score += 1;
    }
  }

  // Prefer the surface built for this project's stack over the generic one.
  if (score > 0) {
    for (const stack of stacks) {
      if (STACK_PREFIXES[stack].some(p => entry.name.startsWith(p))) {
        score += 3;
        break;
      }
    }
  }

  return score;
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

  // ── Read project triage (drives both stack routing and the header) ────
  let triage = null;

  if (fs.existsSync(TRIAGE_CACHE)) {
    try {
      triage = JSON.parse(fs.readFileSync(TRIAGE_CACHE, 'utf8'));
    } catch (e) {
      // Ignore triage parsing errors
    }
  }

  const STACKS = common.detectProjectStacks();

  // ── Score every skill and agent against the prompt ────────────────────
  const promptWords = new Set(
    (PROMPT_LOWER.match(/\b[a-z][a-z.-]{2,}\b/g) || []).map(stem)
  );

  // A command usually wraps a same-named skill (e.g. /audit-self). Show the
  // invocable one and drop the duplicate so it does not eat a slot.
  const KIND_RANK = { command: 0, agent: 1, skill: 2 };
  const emitted = new Set();

  const ranked = getRoutingManifest()
    .map(entry => ({
      entry,
      score: scoreEntry(entry, PROMPT_LOWER, promptWords, STACKS),
    }))
    .filter(r => r.score >= MIN_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (KIND_RANK[a.entry.kind] ?? 3) - (KIND_RANK[b.entry.kind] ?? 3) ||
        a.entry.name.localeCompare(b.entry.name)
    )
    .filter(r => {
      if (emitted.has(r.entry.name)) {
        return false;
      }
      emitted.add(r.entry.name);
      return true;
    })
    .slice(0, MAX_RECOMMENDATIONS);

  let MATCHED = '';

  for (const { entry } of ranked) {
    let how;
    if (entry.kind === 'agent') {
      how = `dispatch the **${entry.name}** agent`;
    } else if (entry.kind === 'command') {
      how = `run **/${entry.name}**`;
    } else {
      how = `use the **${entry.name}** skill`;
    }
    MATCHED += `- ${how} — ${entry.description}\n`;
  }

  // ── Inject project triage context ─────────────────────────────────────
  let TRIAGE_CONTEXT = '';
  const PROJECT_TYPE = triage?.project_type || 'unknown';

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

    if (triage.python?.detected === true) {
      const PY_FW = triage.python.framework || 'none';
      TRIAGE_CONTEXT += ` | Python${PY_FW !== 'none' ? ` (${PY_FW})` : ''}`;
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

    const LLM_FW = (triage.llm?.frameworks || []).join(', ');
    if (LLM_FW) {
      TRIAGE_CONTEXT += ` | LLM: ${LLM_FW}`;
    }

    TRIAGE_CONTEXT += ` — Follow conventions from \`project-router\` skill references.\n`;
  }

  // ── Output recommendations ────────────────────────────────────────────
  let CONTEXT = '';

  if (TRIAGE_CONTEXT) {
    CONTEXT += TRIAGE_CONTEXT;
  }

  if (INTENT_CONTEXT) {
    CONTEXT += INTENT_CONTEXT;
  }

  if (MATCHED) {
    CONTEXT += `📌 Routing candidates (state your route before you start work):\n${MATCHED}`;
  }

  if (CONTEXT) {
    common.output({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: CONTEXT,
      },
    });
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
