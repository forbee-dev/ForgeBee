#!/usr/bin/env node
/**
 * instinct-cli.js
 * Manage instincts for ForgeBee Continuous Learning
 * 
 * Commands:
 *   status   - Show all instincts (project + global) with confidence
 *   import   - Import instincts from file
 *   export   - Export instincts to file
 *   evolve   - Cluster instincts into skills/commands/agents
 *   promote  - Promote project instincts to global scope
 *   projects - List known projects and instinct counts
 */

const fs = require('fs');
const path = require('path');
const {
  LEARNING_DIR, PROJECTS_DIR, REGISTRY_FILE,
  GLOBAL_PERSONAL_DIR, GLOBAL_INHERITED_DIR, GLOBAL_EVOLVED_DIR,
  GLOBAL_OBSERVATIONS_FILE,
  ensureDir, ensureGlobalDirs, detectProject,
} = require('./detect-project.js');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const PROMOTE_CONFIDENCE_THRESHOLD = 0.8;
const PROMOTE_MIN_PROJECTS = 2;
const ALLOWED_EXTENSIONS = ['.yaml', '.yml', '.md'];

// ─────────────────────────────────────────────
// Instinct ID Validation
// ─────────────────────────────────────────────

function validateInstinctId(id) {
  if (!id || id.length > 128) return false;
  if (id.includes('/') || id.includes('\\')) return false;
  if (id.includes('..') || id.startsWith('.')) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id);
}

// ─────────────────────────────────────────────
// Instinct Parser
// ─────────────────────────────────────────────

function parseInstinctFile(content) {
  const instincts = [];
  let current = {};
  let inFrontmatter = false;
  let contentLines = [];

  for (const line of content.split('\n')) {
    if (line.trim() === '---') {
      if (inFrontmatter) {
        // End of frontmatter
        inFrontmatter = false;
      } else {
        // Start of frontmatter
        inFrontmatter = true;
        if (current.id) {
          current.content = contentLines.join('\n').trim();
          instincts.push(current);
        }
        current = {};
        contentLines = [];
      }
    } else if (inFrontmatter) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key === 'confidence') {
          value = parseFloat(value);
        }
        current[key] = value;
      }
    } else {
      contentLines.push(line);
    }
  }

  // Last instinct
  if (current.id) {
    current.content = contentLines.join('\n').trim();
    instincts.push(current);
  }

  return instincts.filter(i => i.id);
}

function loadInstinctsFromDir(directory, sourceType, scopeLabel) {
  const instincts = [];
  if (!fs.existsSync(directory)) return instincts;

  let files;
  try {
    files = fs.readdirSync(directory)
      .filter(f => ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .sort();
  } catch (e) {
    return instincts;
  }

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(directory, file), 'utf8');
      const parsed = parseInstinctFile(content);
      for (const inst of parsed) {
        inst._source_file = path.join(directory, file);
        inst._source_type = sourceType;
        inst._scope_label = scopeLabel;
        if (!inst.scope) inst.scope = scopeLabel;
      }
      instincts.push(...parsed);
    } catch (e) {
      console.error(`Warning: Failed to parse ${file}: ${e.message}`);
    }
  }

  return instincts;
}

function loadAllInstincts(project, includeGlobal = true) {
  const instincts = [];

  // 1. Load project-scoped instincts
  if (project.id !== 'global') {
    instincts.push(...loadInstinctsFromDir(project.instincts_personal, 'personal', 'project'));
    instincts.push(...loadInstinctsFromDir(project.instincts_inherited, 'inherited', 'project'));
  }

  // 2. Load global instincts
  if (includeGlobal) {
    const globalInstincts = [];
    globalInstincts.push(...loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global'));
    globalInstincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));

    // Deduplicate: project-scoped wins over global when same ID
    const projectIds = new Set(instincts.map(i => i.id));
    for (const gi of globalInstincts) {
      if (!projectIds.has(gi.id)) {
        instincts.push(gi);
      }
    }
  }

  return instincts;
}

function loadProjectOnlyInstincts(project) {
  if (project.id === 'global') {
    const instincts = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global');
    instincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));
    return instincts;
  }
  return loadAllInstincts(project, false);
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

// ─────────────────────────────────────────────
// Status Command
// ─────────────────────────────────────────────

function cmdStatus() {
  const project = detectProject();
  const instincts = loadAllInstincts(project);

  if (!instincts.length) {
    console.log('No instincts found.');
    console.log(`\nProject: ${project.name} (${project.id})`);
    console.log(`  Project instincts:  ${project.instincts_personal}`);
    console.log(`  Global instincts:   ${GLOBAL_PERSONAL_DIR}`);
    return 0;
  }

  const projectInstincts = instincts.filter(i => i._scope_label === 'project');
  const globalInstincts = instincts.filter(i => i._scope_label === 'global');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  INSTINCT STATUS - ${instincts.length} total`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`  Project:  ${project.name} (${project.id})`);
  console.log(`  Project instincts: ${projectInstincts.length}`);
  console.log(`  Global instincts:  ${globalInstincts.length}`);
  console.log();

  if (projectInstincts.length) {
    console.log(`## PROJECT-SCOPED (${project.name})\n`);
    printInstinctsByDomain(projectInstincts);
  }

  if (globalInstincts.length) {
    console.log(`## GLOBAL (apply to all projects)\n`);
    printInstinctsByDomain(globalInstincts);
  }

  // Observations stats
  const obsFile = project.observations_file;
  if (fs.existsSync(obsFile)) {
    try {
      const obsContent = fs.readFileSync(obsFile, 'utf8');
      const obsCount = obsContent.split('\n').filter(l => l.trim()).length;
      console.log('-'.repeat(60));
      console.log(`  Observations: ${obsCount} events logged`);
      console.log(`  File: ${obsFile}`);
    } catch (e) { /* ignore */ }
  }

  console.log(`\n${'='.repeat(60)}\n`);
  return 0;
}

function printInstinctsByDomain(instincts) {
  const byDomain = {};
  for (const inst of instincts) {
    const domain = inst.domain || 'general';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(inst);
  }

  for (const domain of Object.keys(byDomain).sort()) {
    const domainInstincts = byDomain[domain];
    console.log(`  ### ${domain.toUpperCase()} (${domainInstincts.length})\n`);

    domainInstincts.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));
    for (const inst of domainInstincts) {
      const conf = inst.confidence || 0.5;
      const filled = Math.round(conf * 10);
      const confBar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
      const trigger = inst.trigger || 'unknown trigger';
      const scopeTag = `[${inst.scope || '?'}]`;

      console.log(`    ${confBar} ${String(Math.round(conf * 100)).padStart(3)}%  ${inst.id} ${scopeTag}`);
      console.log(`              trigger: ${trigger}`);

      // Extract action from content
      const content = inst.content || '';
      const actionMatch = content.match(/## Action\s*\n\s*(.+?)(?:\n\n|\n##|$)/s);
      if (actionMatch) {
        const action = actionMatch[1].trim().split('\n')[0];
        console.log(`              action: ${action.length > 60 ? action.slice(0, 60) + '...' : action}`);
      }
      console.log();
    }
  }
}

// ─────────────────────────────────────────────
// Import Command
// ─────────────────────────────────────────────

function cmdImport(source, options = {}) {
  const project = detectProject();
  let targetScope = options.scope || 'project';

  if (targetScope === 'project' && project.id === 'global') {
    console.log('No project detected. Importing as global scope.');
    targetScope = 'global';
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(path.resolve(source), 'utf8');
  } catch (e) {
    console.error(`Error reading file: ${e.message}`);
    return 1;
  }

  const newInstincts = parseInstinctFile(content);
  if (!newInstincts.length) {
    console.log('No valid instincts found in source.');
    return 1;
  }

  console.log(`\nFound ${newInstincts.length} instincts to import.`);
  console.log(`Target scope: ${targetScope}`);
  if (targetScope === 'project') {
    console.log(`Target project: ${project.name} (${project.id})`);
  }
  console.log();

  // Load existing for dedup
  const existing = loadAllInstincts(project);
  const existingMap = {};
  for (const e of existing) existingMap[e.id] = e;

  const toAdd = [];
  const toUpdate = [];
  const duplicates = [];
  const minConf = options.minConfidence || 0;

  for (const inst of newInstincts) {
    if ((inst.confidence || 0.5) < minConf) continue;
    if (existingMap[inst.id]) {
      if ((inst.confidence || 0) > (existingMap[inst.id].confidence || 0)) {
        toUpdate.push(inst);
      } else {
        duplicates.push(inst);
      }
    } else {
      toAdd.push(inst);
    }
  }

  if (toAdd.length) {
    console.log(`NEW (${toAdd.length}):`);
    for (const inst of toAdd) {
      console.log(`  + ${inst.id} (confidence: ${(inst.confidence || 0.5).toFixed(2)})`);
    }
  }
  if (toUpdate.length) {
    console.log(`\nUPDATE (${toUpdate.length}):`);
    for (const inst of toUpdate) {
      console.log(`  ~ ${inst.id} (confidence: ${(inst.confidence || 0.5).toFixed(2)})`);
    }
  }
  if (duplicates.length) {
    console.log(`\nSKIP (${duplicates.length} - already exists with equal/higher confidence):`);
    for (const inst of duplicates.slice(0, 5)) {
      console.log(`  - ${inst.id}`);
    }
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return 0;
  }

  if (!toAdd.length && !toUpdate.length) {
    console.log('\nNothing to import.');
    return 0;
  }

  // Determine output directory
  const outputDir = targetScope === 'global' ? GLOBAL_INHERITED_DIR : project.instincts_inherited;
  ensureDir(outputDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sourceName = path.basename(source, path.extname(source));
  const outputFile = path.join(outputDir, `${sourceName}-${timestamp}.yaml`);

  let outputContent = `# Imported from ${source}\n# Date: ${new Date().toISOString()}\n# Scope: ${targetScope}\n`;
  if (targetScope === 'project') {
    outputContent += `# Project: ${project.name} (${project.id})\n`;
  }
  outputContent += '\n';

  for (const inst of [...toAdd, ...toUpdate]) {
    outputContent += '---\n';
    outputContent += `id: ${inst.id}\n`;
    outputContent += `trigger: "${inst.trigger || 'unknown'}"\n`;
    outputContent += `confidence: ${inst.confidence || 0.5}\n`;
    outputContent += `domain: ${inst.domain || 'general'}\n`;
    outputContent += `source: inherited\n`;
    outputContent += `scope: ${targetScope}\n`;
    outputContent += `imported_from: "${source}"\n`;
    if (targetScope === 'project') {
      outputContent += `project_id: ${project.id}\n`;
      outputContent += `project_name: ${project.name}\n`;
    }
    outputContent += '---\n\n';
    outputContent += (inst.content || '') + '\n\n';
  }

  fs.writeFileSync(outputFile, outputContent);

  console.log(`\nImport complete!`);
  console.log(`   Scope: ${targetScope}`);
  console.log(`   Added: ${toAdd.length}`);
  console.log(`   Updated: ${toUpdate.length}`);
  console.log(`   Saved to: ${outputFile}`);
  return 0;
}

// ─────────────────────────────────────────────
// Export Command
// ─────────────────────────────────────────────

function cmdExport(options = {}) {
  const project = detectProject();
  let instincts;

  if (options.scope === 'project') {
    instincts = loadProjectOnlyInstincts(project);
  } else if (options.scope === 'global') {
    instincts = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global');
    instincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));
  } else {
    instincts = loadAllInstincts(project);
  }

  if (options.domain) {
    instincts = instincts.filter(i => i.domain === options.domain);
  }
  if (options.minConfidence) {
    instincts = instincts.filter(i => (i.confidence || 0.5) >= options.minConfidence);
  }

  if (!instincts.length) {
    console.log('No instincts to export.');
    return 1;
  }

  let output = `# Instincts export\n# Date: ${new Date().toISOString()}\n# Total: ${instincts.length}\n`;
  if (options.scope) output += `# Scope: ${options.scope}\n`;
  if (project.id !== 'global') output += `# Project: ${project.name} (${project.id})\n`;
  output += '\n';

  for (const inst of instincts) {
    output += '---\n';
    for (const key of ['id', 'trigger', 'confidence', 'domain', 'source', 'scope', 'project_id', 'project_name']) {
      if (inst[key] !== undefined && inst[key] !== null) {
        if (key === 'trigger') {
          output += `${key}: "${inst[key]}"\n`;
        } else {
          output += `${key}: ${inst[key]}\n`;
        }
      }
    }
    output += '---\n\n';
    output += (inst.content || '') + '\n\n';
  }

  if (options.output) {
    fs.writeFileSync(path.resolve(options.output), output);
    console.log(`Exported ${instincts.length} instincts to ${options.output}`);
  } else {
    process.stdout.write(output);
  }

  return 0;
}

// ─────────────────────────────────────────────
// Evolve Command
// ─────────────────────────────────────────────

function cmdEvolve(options = {}) {
  const project = detectProject();
  const instincts = loadAllInstincts(project);

  if (instincts.length < 3) {
    console.log(`Need at least 3 instincts to analyze patterns.`);
    console.log(`Currently have: ${instincts.length}`);
    return 1;
  }

  const projectInstincts = instincts.filter(i => i._scope_label === 'project');
  const globalInstincts = instincts.filter(i => i._scope_label === 'global');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  EVOLVE ANALYSIS - ${instincts.length} instincts`);
  console.log(`  Project: ${project.name} (${project.id})`);
  console.log(`  Project-scoped: ${projectInstincts.length} | Global: ${globalInstincts.length}`);
  console.log(`${'='.repeat(60)}\n`);

  const highConf = instincts.filter(i => (i.confidence || 0) >= 0.8);
  console.log(`High confidence instincts (>=80%): ${highConf.length}`);

  // Find trigger clusters
  const triggerClusters = {};
  for (const inst of instincts) {
    let triggerKey = (inst.trigger || '').toLowerCase();
    for (const kw of ['when', 'creating', 'writing', 'adding', 'implementing', 'testing']) {
      triggerKey = triggerKey.replace(new RegExp(kw, 'g'), '').trim();
    }
    triggerKey = triggerKey.replace(/\s+/g, ' ').trim();
    if (!triggerKey) continue;
    if (!triggerClusters[triggerKey]) triggerClusters[triggerKey] = [];
    triggerClusters[triggerKey].push(inst);
  }

  // Skill candidates (2+ instincts per cluster)
  const skillCandidates = [];
  for (const [trigger, cluster] of Object.entries(triggerClusters)) {
    if (cluster.length >= 2) {
      const avgConf = cluster.reduce((s, i) => s + (i.confidence || 0.5), 0) / cluster.length;
      skillCandidates.push({
        trigger,
        instincts: cluster,
        avg_confidence: avgConf,
        domains: [...new Set(cluster.map(i => i.domain || 'general'))],
        scopes: [...new Set(cluster.map(i => i.scope || 'project'))],
      });
    }
  }
  skillCandidates.sort((a, b) => b.instincts.length - a.instincts.length || b.avg_confidence - a.avg_confidence);

  console.log(`\nPotential skill clusters found: ${skillCandidates.length}`);

  if (skillCandidates.length) {
    console.log(`\n## SKILL CANDIDATES\n`);
    for (let i = 0; i < Math.min(5, skillCandidates.length); i++) {
      const cand = skillCandidates[i];
      console.log(`${i + 1}. Cluster: "${cand.trigger}"`);
      console.log(`   Instincts: ${cand.instincts.length}`);
      console.log(`   Avg confidence: ${Math.round(cand.avg_confidence * 100)}%`);
      console.log(`   Domains: ${cand.domains.join(', ')}`);
      console.log(`   Scopes: ${cand.scopes.join(', ')}`);
      console.log(`   Instincts:`);
      for (const inst of cand.instincts.slice(0, 3)) {
        console.log(`     - ${inst.id} [${inst.scope || '?'}]`);
      }
      console.log();
    }
  }

  // Command candidates (workflow instincts with high confidence)
  const workflowInstincts = instincts.filter(i => i.domain === 'workflow' && (i.confidence || 0) >= 0.7);
  if (workflowInstincts.length) {
    console.log(`\n## COMMAND CANDIDATES (${workflowInstincts.length})\n`);
    for (const inst of workflowInstincts.slice(0, 5)) {
      let cmdName = (inst.trigger || 'unknown').replace(/^when /i, '').replace(/implementing /i, '').replace(/a /i, '');
      cmdName = cmdName.replace(/\s+/g, '-').slice(0, 20);
      console.log(`  /${cmdName}`);
      console.log(`    From: ${inst.id} [${inst.scope || '?'}]`);
      console.log(`    Confidence: ${Math.round((inst.confidence || 0.5) * 100)}%`);
      console.log();
    }
  }

  // Agent candidates (complex clusters 3+)
  const agentCandidates = skillCandidates.filter(c => c.instincts.length >= 3 && c.avg_confidence >= 0.75);
  if (agentCandidates.length) {
    console.log(`\n## AGENT CANDIDATES (${agentCandidates.length})\n`);
    for (const cand of agentCandidates.slice(0, 3)) {
      const agentName = cand.trigger.replace(/\s+/g, '-').slice(0, 20) + '-agent';
      console.log(`  ${agentName}`);
      console.log(`    Covers ${cand.instincts.length} instincts`);
      console.log(`    Avg confidence: ${Math.round(cand.avg_confidence * 100)}%`);
      console.log();
    }
  }

  // Promotion candidates
  showPromotionCandidates(project);

  // Generate if requested
  if (options.generate) {
    const evolvedDir = project.id !== 'global' ? project.evolved_dir : GLOBAL_EVOLVED_DIR;
    const generated = generateEvolved(skillCandidates, workflowInstincts, agentCandidates, evolvedDir);
    if (generated.length) {
      console.log(`\nGenerated ${generated.length} evolved structures:`);
      for (const p of generated) console.log(`   ${p}`);
    } else {
      console.log('\nNo structures generated (need higher-confidence clusters).');
    }
  }

  console.log(`\n${'='.repeat(60)}\n`);
  return 0;
}

// ─────────────────────────────────────────────
// Promote Command
// ─────────────────────────────────────────────

function findCrossProjectInstincts() {
  const registry = loadRegistry();
  const crossProject = {};

  for (const [pid, pinfo] of Object.entries(registry)) {
    const projectDir = path.join(PROJECTS_DIR, pid);
    const personalDir = path.join(projectDir, 'instincts', 'personal');
    const inheritedDir = path.join(projectDir, 'instincts', 'inherited');

    for (const [d, stype] of [[personalDir, 'personal'], [inheritedDir, 'inherited']]) {
      for (const inst of loadInstinctsFromDir(d, stype, 'project')) {
        if (inst.id) {
          if (!crossProject[inst.id]) crossProject[inst.id] = [];
          crossProject[inst.id].push({ pid, pname: pinfo.name || pid, inst });
        }
      }
    }
  }

  // Filter to 2+ projects
  const result = {};
  for (const [iid, entries] of Object.entries(crossProject)) {
    // Deduplicate by project
    const uniqueProjects = [...new Set(entries.map(e => e.pid))];
    if (uniqueProjects.length >= 2) {
      result[iid] = entries;
    }
  }
  return result;
}

function showPromotionCandidates(project) {
  const cross = findCrossProjectInstincts();
  if (!Object.keys(cross).length) return;

  const globalInstincts = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global');
  globalInstincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));
  const globalIds = new Set(globalInstincts.map(i => i.id));

  const candidates = [];
  for (const [iid, entries] of Object.entries(cross)) {
    if (globalIds.has(iid)) continue;
    const avgConf = entries.reduce((s, e) => s + (e.inst.confidence || 0.5), 0) / entries.length;
    if (avgConf >= PROMOTE_CONFIDENCE_THRESHOLD) {
      candidates.push({
        id: iid,
        projects: entries.map(e => ({ pid: e.pid, pname: e.pname })),
        avg_confidence: avgConf,
        sample: entries[0].inst,
      });
    }
  }

  if (candidates.length) {
    console.log(`\n## PROMOTION CANDIDATES (project -> global)\n`);
    console.log(`  These instincts appear in ${PROMOTE_MIN_PROJECTS}+ projects with high confidence:\n`);
    for (const cand of candidates.slice(0, 10)) {
      const projNames = cand.projects.map(p => p.pname).join(', ');
      console.log(`  * ${cand.id} (avg: ${Math.round(cand.avg_confidence * 100)}%)`);
      console.log(`    Found in: ${projNames}`);
      console.log();
    }
    console.log(`  Run \`node instinct-cli.js promote\` to promote these to global scope.\n`);
  }
}

function cmdPromote(instinctId, options = {}) {
  const project = detectProject();

  if (instinctId) {
    return promoteSpecific(project, instinctId);
  } else {
    return promoteAuto(project, options);
  }
}

function promoteSpecific(project, instinctId) {
  if (!validateInstinctId(instinctId)) {
    console.error(`Invalid instinct ID: '${instinctId}'.`);
    return 1;
  }

  const projectInstincts = loadProjectOnlyInstincts(project);
  const target = projectInstincts.find(i => i.id === instinctId);

  if (!target) {
    console.log(`Instinct '${instinctId}' not found in project ${project.name}.`);
    return 1;
  }

  // Check if already global
  const globalInstincts = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global');
  globalInstincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));
  if (globalInstincts.some(i => i.id === instinctId)) {
    console.log(`Instinct '${instinctId}' already exists in global scope.`);
    return 1;
  }

  console.log(`\nPromoting: ${instinctId}`);
  console.log(`  From: project '${project.name}'`);
  console.log(`  Confidence: ${Math.round((target.confidence || 0.5) * 100)}%`);
  console.log(`  Domain: ${target.domain || 'general'}`);

  // Write to global
  const outputFile = path.join(GLOBAL_PERSONAL_DIR, `${instinctId}.yaml`);
  let content = '---\n';
  content += `id: ${target.id}\n`;
  content += `trigger: "${target.trigger || 'unknown'}"\n`;
  content += `confidence: ${target.confidence || 0.5}\n`;
  content += `domain: ${target.domain || 'general'}\n`;
  content += `source: promoted\n`;
  content += `scope: global\n`;
  content += `promoted_from: ${project.id}\n`;
  content += `promoted_date: ${new Date().toISOString()}\n`;
  content += '---\n\n';
  content += (target.content || '') + '\n';

  ensureDir(GLOBAL_PERSONAL_DIR);
  fs.writeFileSync(outputFile, content);
  console.log(`\nPromoted '${instinctId}' to global scope.`);
  console.log(`  Saved to: ${outputFile}`);
  return 0;
}

function promoteAuto(project, options = {}) {
  const cross = findCrossProjectInstincts();

  const globalInstincts = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global');
  globalInstincts.push(...loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global'));
  const globalIds = new Set(globalInstincts.map(i => i.id));

  const candidates = [];
  for (const [iid, entries] of Object.entries(cross)) {
    if (globalIds.has(iid)) continue;
    const uniqueProjects = [...new Set(entries.map(e => e.pid))];
    if (uniqueProjects.length < PROMOTE_MIN_PROJECTS) continue;
    const avgConf = entries.reduce((s, e) => s + (e.inst.confidence || 0.5), 0) / entries.length;
    if (avgConf >= PROMOTE_CONFIDENCE_THRESHOLD) {
      candidates.push({ id: iid, entries, avg_confidence: avgConf });
    }
  }

  if (!candidates.length) {
    console.log('No instincts qualify for auto-promotion.');
    console.log(`  Criteria: appears in ${PROMOTE_MIN_PROJECTS}+ projects, avg confidence >= ${Math.round(PROMOTE_CONFIDENCE_THRESHOLD * 100)}%`);
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  AUTO-PROMOTION CANDIDATES - ${candidates.length} found`);
  console.log(`${'='.repeat(60)}\n`);

  for (const cand of candidates) {
    const projNames = cand.entries.map(e => e.pname).join(', ');
    console.log(`  ${cand.id} (avg: ${Math.round(cand.avg_confidence * 100)}%)`);
    console.log(`    Found in ${cand.entries.length} projects: ${projNames}`);
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return 0;
  }

  let promoted = 0;
  for (const cand of candidates) {
    if (!validateInstinctId(cand.id)) continue;

    // Use highest-confidence version
    const best = cand.entries.reduce((a, b) => (b.inst.confidence || 0) > (a.inst.confidence || 0) ? b : a);
    const inst = best.inst;

    const outputFile = path.join(GLOBAL_PERSONAL_DIR, `${cand.id}.yaml`);
    let content = '---\n';
    content += `id: ${inst.id}\n`;
    content += `trigger: "${inst.trigger || 'unknown'}"\n`;
    content += `confidence: ${cand.avg_confidence}\n`;
    content += `domain: ${inst.domain || 'general'}\n`;
    content += `source: auto-promoted\n`;
    content += `scope: global\n`;
    content += `promoted_date: ${new Date().toISOString()}\n`;
    content += `seen_in_projects: ${cand.entries.length}\n`;
    content += '---\n\n';
    content += (inst.content || '') + '\n';

    ensureDir(GLOBAL_PERSONAL_DIR);
    fs.writeFileSync(outputFile, content);
    promoted++;
  }

  console.log(`\nPromoted ${promoted} instincts to global scope.`);
  return 0;
}

// ─────────────────────────────────────────────
// Projects Command
// ─────────────────────────────────────────────

function cmdProjects() {
  const registry = loadRegistry();

  if (!Object.keys(registry).length) {
    console.log('No projects registered yet.');
    console.log('Projects are auto-detected when you use ForgeBee in a git repo.');
    return 0;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  KNOWN PROJECTS - ${Object.keys(registry).length} total`);
  console.log(`${'='.repeat(60)}\n`);

  const sorted = Object.entries(registry).sort((a, b) =>
    (b[1].last_seen || '').localeCompare(a[1].last_seen || '')
  );

  for (const [pid, pinfo] of sorted) {
    const projectDir = path.join(PROJECTS_DIR, pid);
    const personalDir = path.join(projectDir, 'instincts', 'personal');
    const inheritedDir = path.join(projectDir, 'instincts', 'inherited');

    const personalCount = loadInstinctsFromDir(personalDir, 'personal', 'project').length;
    const inheritedCount = loadInstinctsFromDir(inheritedDir, 'inherited', 'project').length;

    let obsCount = 0;
    const obsFile = path.join(projectDir, 'observations.jsonl');
    if (fs.existsSync(obsFile)) {
      try {
        obsCount = fs.readFileSync(obsFile, 'utf8').split('\n').filter(l => l.trim()).length;
      } catch (e) { /* ignore */ }
    }

    console.log(`  ${pinfo.name || pid} [${pid}]`);
    console.log(`    Root: ${pinfo.root || 'unknown'}`);
    if (pinfo.remote) console.log(`    Remote: ${pinfo.remote}`);
    console.log(`    Instincts: ${personalCount} personal, ${inheritedCount} inherited`);
    console.log(`    Observations: ${obsCount} events`);
    console.log(`    Last seen: ${pinfo.last_seen || 'unknown'}`);
    console.log();
  }

  // Global stats
  const globalPersonal = loadInstinctsFromDir(GLOBAL_PERSONAL_DIR, 'personal', 'global').length;
  const globalInherited = loadInstinctsFromDir(GLOBAL_INHERITED_DIR, 'inherited', 'global').length;
  console.log(`  GLOBAL`);
  console.log(`    Instincts: ${globalPersonal} personal, ${globalInherited} inherited`);

  console.log(`\n${'='.repeat(60)}\n`);
  return 0;
}

// ─────────────────────────────────────────────
// Generate Evolved Structures
// ─────────────────────────────────────────────

function generateEvolved(skillCandidates, workflowInstincts, agentCandidates, evolvedDir) {
  const generated = [];

  // Generate skills
  for (const cand of skillCandidates.slice(0, 5)) {
    const trigger = cand.trigger.trim();
    if (!trigger) continue;
    const name = trigger.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    if (!name) continue;

    const skillDir = path.join(evolvedDir, 'skills', name);
    ensureDir(skillDir);

    let content = `# ${name}\n\n`;
    content += `Evolved from ${cand.instincts.length} instincts (avg confidence: ${Math.round(cand.avg_confidence * 100)}%)\n\n`;
    content += `## When to Apply\n\nTrigger: ${trigger}\n\n`;
    content += `## Actions\n\n`;
    for (const inst of cand.instincts) {
      const ic = inst.content || '';
      const actionMatch = ic.match(/## Action\s*\n\s*(.+?)(?:\n\n|\n##|$)/s);
      const action = actionMatch ? actionMatch[1].trim().split('\n')[0] : inst.id;
      content += `- ${action}\n`;
    }

    const filePath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(filePath, content);
    generated.push(filePath);
  }

  // Generate commands
  for (const inst of workflowInstincts.slice(0, 5)) {
    let cmdName = (inst.trigger || 'unknown').toLowerCase().replace(/^when /i, '').replace(/implementing /i, '');
    cmdName = cmdName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
    if (!cmdName) continue;

    const filePath = path.join(evolvedDir, 'commands', `${cmdName}.md`);
    ensureDir(path.dirname(filePath));
    let content = `# ${cmdName}\n\n`;
    content += `Evolved from instinct: ${inst.id}\n`;
    content += `Confidence: ${Math.round((inst.confidence || 0.5) * 100)}%\n\n`;
    content += inst.content || '';

    fs.writeFileSync(filePath, content);
    generated.push(filePath);
  }

  // Generate agents
  for (const cand of agentCandidates.slice(0, 3)) {
    let agentName = cand.trigger.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
    if (!agentName) continue;

    const filePath = path.join(evolvedDir, 'agents', `${agentName}.md`);
    ensureDir(path.dirname(filePath));

    let content = `---\nmodel: sonnet\ntools: Read, Grep, Glob\n---\n`;
    content += `# ${agentName}\n\n`;
    content += `Evolved from ${cand.instincts.length} instincts (avg confidence: ${Math.round(cand.avg_confidence * 100)}%)\n`;
    content += `Domains: ${cand.domains.join(', ')}\n\n`;
    content += `## Source Instincts\n\n`;
    for (const inst of cand.instincts) {
      content += `- ${inst.id}\n`;
    }

    fs.writeFileSync(filePath, content);
    generated.push(filePath);
  }

  return generated;
}

// ─────────────────────────────────────────────
// CLI Argument Parsing
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--generate') {
      options.generate = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--scope' && args[i + 1]) {
      options.scope = args[++i];
    } else if (arg === '--domain' && args[i + 1]) {
      options.domain = args[++i];
    } else if (arg === '--min-confidence' && args[i + 1]) {
      options.minConfidence = parseFloat(args[++i]);
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--activate' && args[i + 1]) {
      options.activate = args[++i];
    } else if (arg === '--reject' && args[i + 1]) {
      options.reject = args[++i];
    } else if (arg === '--include-pending') {
      options.includePending = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

// ─────────────────────────────────────────────
// S-009: Promote Pending Candidates to Instincts
// ─────────────────────────────────────────────

function cmdPromotePending(options) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const pendingFile = path.join(projectDir, '.claude/learnings/pending-instincts.jsonl');

  if (!fs.existsSync(pendingFile)) {
    console.log('No pending candidates found.');
    return 0;
  }

  const lines = fs.readFileSync(pendingFile, 'utf8').split('\n').filter(l => l.trim());
  const candidates = [];
  for (const l of lines) {
    try { candidates.push(JSON.parse(l)); } catch { /* skip */ }
  }

  const THRESHOLD_CONFIDENCE = 0.6;
  const THRESHOLD_SESSIONS = 2;

  const ready = candidates.filter(c =>
    c.status === 'pending' &&
    c.confidence >= THRESHOLD_CONFIDENCE &&
    (c.sessions_seen || 1) >= THRESHOLD_SESSIONS
  );

  if (ready.length === 0) {
    console.log(`No candidates meet promotion threshold (confidence >= ${THRESHOLD_CONFIDENCE}, sessions >= ${THRESHOLD_SESSIONS}).`);
    return 0;
  }

  // Detect project for instinct storage
  const project = detectProject();
  const instinctDir = path.join(PROJECTS_DIR, project.id, 'instincts', 'personal');
  ensureDir(instinctDir);

  let promoted = 0;
  for (const candidate of ready) {
    const instinctId = candidate.id || `auto-${Date.now()}`;
    if (!validateInstinctId(instinctId)) continue;

    const instinctPath = path.join(instinctDir, `${instinctId}.yaml`);

    // Don't overwrite active instincts
    if (fs.existsSync(instinctPath)) {
      const existing = fs.readFileSync(instinctPath, 'utf8');
      if (existing.includes('status: active')) continue;
    }

    const content = `---
id: ${instinctId}
trigger: "${candidate.signal}"
confidence: ${candidate.confidence}
domain: workflow
source: auto-heuristic
scope: project
status: pending
created_at: ${candidate.created_at || new Date().toISOString()}
sessions_seen: ${candidate.sessions_seen || 1}
---

# ${instinctId}

## Signal
${candidate.signal}

## Type
${candidate.type}

## Evidence
- Auto-detected from ${candidate.sessions_seen || 1} session(s)
- Confidence: ${candidate.confidence}
`;

    fs.writeFileSync(instinctPath, content);
    promoted++;
    console.log(`  Promoted: ${instinctId} (confidence: ${candidate.confidence})`);
  }

  // Mark promoted candidates in pending-instincts.jsonl so they don't re-promote
  if (promoted > 0) {
    const promotedIds = new Set(ready.filter((_, i) => i < promoted).map(c => c.id));
    const updatedLines = candidates.map(c => {
      if (promotedIds.has(c.id)) c.status = 'promoted';
      return JSON.stringify(c);
    });
    fs.writeFileSync(pendingFile, updatedLines.join('\n') + '\n');
  }

  console.log(`\n${promoted} instinct(s) promoted to pending state.`);
  console.log('Run `/learn` to review and activate them.');
  return 0;
}

// ─────────────────────────────────────────────
// S-010: Review Pending Instincts
// ─────────────────────────────────────────────

function cmdReview(action, options) {
  const project = detectProject();
  const instinctDir = path.join(PROJECTS_DIR, project.id, 'instincts', 'personal');

  if (!fs.existsSync(instinctDir)) {
    console.log('No instincts directory found.');
    return 0;
  }

  const files = fs.readdirSync(instinctDir).filter(f => ALLOWED_EXTENSIONS.some(e => f.endsWith(e)));
  const pendingInstincts = [];

  for (const f of files) {
    const content = fs.readFileSync(path.join(instinctDir, f), 'utf8');
    if (content.includes('status: pending')) {
      const parsed = parseInstinctFile(content);
      pendingInstincts.push({ file: f, content, parsed });
    }
  }

  if (options.activate) {
    const id = options.activate;
    const match = pendingInstincts.find(p => p.file.replace(/\.(yaml|yml|md)$/, '') === id);
    if (!match) {
      console.error(`Pending instinct "${id}" not found.`);
      return 1;
    }
    // Scope replace to frontmatter only (between first pair of ---)
    const fmEnd = match.content.indexOf('---', match.content.indexOf('---') + 3);
    const frontmatter = match.content.substring(0, fmEnd).replace('status: pending', 'status: active');
    const updated = frontmatter + match.content.substring(fmEnd);
    fs.writeFileSync(path.join(instinctDir, match.file), updated);
    console.log(`Activated: ${id}`);
    return 0;
  }

  if (options.reject) {
    const id = options.reject;
    const match = pendingInstincts.find(p => p.file.replace(/\.(yaml|yml|md)$/, '') === id);
    if (!match) {
      console.error(`Pending instinct "${id}" not found.`);
      return 1;
    }
    fs.unlinkSync(path.join(instinctDir, match.file));
    console.log(`Rejected and removed: ${id}`);

    // Mark as rejected in pending-instincts.jsonl
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const pendingFile = path.join(projectDir, '.claude/learnings/pending-instincts.jsonl');
    if (fs.existsSync(pendingFile)) {
      const lines = fs.readFileSync(pendingFile, 'utf8').split('\n').filter(l => l.trim());
      const updated = lines.map(l => {
        try {
          const entry = JSON.parse(l);
          if (entry.id === id) entry.status = 'rejected';
          return JSON.stringify(entry);
        } catch { return l; }
      });
      fs.writeFileSync(pendingFile, updated.join('\n') + '\n');
    }
    return 0;
  }

  // Default: list pending instincts
  if (pendingInstincts.length === 0) {
    console.log('No pending instincts awaiting review.');
    return 0;
  }

  console.log(`\n  ${pendingInstincts.length} pending instinct(s) awaiting review:\n`);
  for (const p of pendingInstincts) {
    const id = p.file.replace(/\.(yaml|yml|md)$/, '');
    const triggerMatch = p.content.match(/trigger:\s*"?(.+?)"?\s*$/m);
    const confMatch = p.content.match(/confidence:\s*(\S+)/);
    const sessionsMatch = p.content.match(/sessions_seen:\s*(\d+)/);
    console.log(`  [PENDING] ${id}`);
    if (triggerMatch) console.log(`    Signal: ${triggerMatch[1]}`);
    if (confMatch) console.log(`    Confidence: ${confMatch[1]}`);
    if (sessionsMatch) console.log(`    Sessions: ${sessionsMatch[1]}`);
    console.log('');
  }
  console.log('  Use: instinct-cli.js review --activate <id>');
  console.log('  Use: instinct-cli.js review --reject <id>');
  return 0;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  ensureGlobalDirs();
  const { command, options, positional } = parseArgs();

  let exitCode = 0;

  switch (command) {
    case 'status':
      exitCode = cmdStatus();
      break;
    case 'import':
      if (!positional[0]) {
        console.error('Usage: instinct-cli.js import <file> [--scope project|global] [--dry-run]');
        exitCode = 1;
      } else {
        exitCode = cmdImport(positional[0], options);
      }
      break;
    case 'export':
      exitCode = cmdExport(options);
      break;
    case 'evolve':
      exitCode = cmdEvolve(options);
      break;
    case 'promote':
      exitCode = cmdPromote(positional[0], options);
      break;
    case 'projects':
      exitCode = cmdProjects();
      break;
    case 'promote-pending':
      exitCode = cmdPromotePending(options);
      break;
    case 'review':
      exitCode = cmdReview(positional[0], options);
      break;
    default:
      console.log('ForgeBee Instinct CLI');
      console.log('\nCommands:');
      console.log('  status            Show all instincts with confidence');
      console.log('  import <file>     Import instincts from file');
      console.log('  export            Export instincts to file');
      console.log('  evolve            Cluster instincts into skills/commands/agents');
      console.log('  promote [id]      Promote project instincts to global scope');
      console.log('  promote-pending   Promote high-confidence candidates to pending instincts');
      console.log('  review <action>   Review pending instincts (--activate <id> | --reject <id> | --list)');
      console.log('  projects          List known projects and instinct counts');
      exitCode = command === 'help' ? 0 : 1;
  }

  process.exit(exitCode);
}

main();
