#!/usr/bin/env node
/**
 * skill-activator.js — Analyze user prompts and recommend relevant skills
 * Runs on UserPromptSubmit event
 * Outputs additionalContext with skill recommendations
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_DIR, initDirs, readStdinSync, findSkillsDirs, readJsonFile } = require('./_common.js');

initDirs();

const input = readStdinSync();

let inputData = {};
try {
  inputData = JSON.parse(input);
} catch {
  process.exit(0);
}

const prompt = inputData.prompt || '';

if (!prompt) {
  process.exit(0);
}

const CACHE_FILE = path.join(PROJECT_DIR, '.claude/session-cache/skill-manifest.json');
const CACHE_TTL = 300; // 5 minutes

// ── Build/refresh skill manifest cache ────────────────────────────────
let rebuildCache = false;

if (!fs.existsSync(CACHE_FILE)) {
  rebuildCache = true;
} else {
  const stat = fs.statSync(CACHE_FILE);
  const cacheAge = Math.floor((Date.now() - stat.mtime.getTime()) / 1000);
  if (cacheAge > CACHE_TTL) {
    rebuildCache = true;
  }
}

if (rebuildCache) {
  let skillsJson = [];

  const skillDirs = findSkillsDirs();

  for (const skillDir of skillDirs) {
    if (!fs.existsSync(skillDir)) {
      continue;
    }

    const entries = fs.readdirSync(skillDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillPath = path.join(skillDir, entry.name, 'SKILL.md');

      if (!fs.existsSync(skillPath)) {
        continue;
      }

      const skillName = entry.name;
      const content = fs.readFileSync(skillPath, 'utf8');

      // Extract description from YAML frontmatter
      let description = '';
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const descMatch = frontmatterMatch[1].match(/^description:\s*(.*)$/m);
        if (descMatch) {
          description = descMatch[1].trim();
        }
      }

      // Extract trigger keywords (from MANDATORY TRIGGERS line)
      let triggers = '';
      const triggerMatch = content.match(/MANDATORY TRIGGERS:\s*([^\n]+)/);
      if (triggerMatch) {
        triggers = triggerMatch[1]
          .split(',')
          .map(t => t.trim())
          .join(',');
      }

      skillsJson.push({
        name: skillName,
        description,
        triggers,
        path: skillPath
      });
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(skillsJson, null, 2));
}

// ── Match prompt against skills ───────────────────────────────────────
const skillManifest = readJsonFile(CACHE_FILE) || [];
const promptLower = prompt.toLowerCase();
const matchedSkills = [];

for (const skill of skillManifest) {
  const name = skill.name;
  const triggers = skill.triggers || '';
  const desc = skill.description || '';

  // Check trigger keywords
  if (triggers) {
    const triggerList = triggers.split(',').map(t => t.trim());
    for (const trigger of triggerList) {
      if (trigger && promptLower.includes(trigger.toLowerCase())) {
        matchedSkills.push(`- Use the **${name}** skill: ${desc}`);
        break;
      }
    }
  }

  // Check description keywords as fallback
  if (!matchedSkills.some(s => s.includes(name))) {
    const descLower = desc.toLowerCase();
    const stopWords = new Set([
      'using', 'these', 'about', 'which', 'where', 'their', 'would', 'could',
      'should', 'there', 'through', 'between', 'before', 'after', 'other',
      'under', 'during', 'without', 'within', 'including', 'building', 'working', 'following'
    ]);

    const words = descLower.match(/\b[a-z]{7,}\b/g) || [];
    for (const word of words) {
      if (!stopWords.has(word) && promptLower.includes(word)) {
        matchedSkills.push(`- Consider the **${name}** skill: ${desc}`);
        break;
      }
    }
  }
}

// ── Output recommendations ────────────────────────────────────────────
if (matchedSkills.length > 0) {
  const context = `Skill Recommendations:\n${matchedSkills.join('\n')}`;
  const output = {
    additionalContext: context.replace(/"/g, '\\"').replace(/\n/g, ' ')
  };
  console.log(JSON.stringify(output));
}

process.exit(0);
