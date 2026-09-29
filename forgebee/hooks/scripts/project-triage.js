#!/usr/bin/env node
/**
 * project-triage.js
 * Run project detection and cache the result
 * Called by session-load.js on SessionStart, or manually by the router skill
 * Caches the triage JSON so agents can consume it without re-scanning
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const {
  getProjectDir,
  findForgebeeRoot,
  readFile,
  writeFile,
  output,
  log,
} = require('./_common.js');

function main() {
  try {
    const projectDir = getProjectDir();
    const cacheFile = path.join(projectDir, '.claude', 'session-cache', 'project-triage.json');
    const cacheTTL = 600; // 10 minutes — project type doesn't change often

    // Check if cache is still fresh
    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        const cacheAge = Math.floor((Date.now() - stats.mtimeMs) / 1000);

        if (cacheAge < cacheTTL) {
          // Cache is fresh — output it and exit
          const cacheContent = readFile(cacheFile);
          if (cacheContent) {
            output(cacheContent);
            process.exit(0);
          }
        }
      } catch (e) {
        // Ignore stat errors, continue to re-detect
      }
    }

    // Locate the detection script
    const forgebeeRoot = findForgebeeRoot();
    const detectScript = path.join(forgebeeRoot, 'skills', 'project-router', 'scripts', 'detect_project.js');

    if (!fs.existsSync(detectScript)) {
      // No router skill installed — output minimal triage
      const fallbackTriage = JSON.stringify({
        project_type: 'unknown',
        error: 'project-router skill not found',
      }, null, 2);
      output(fallbackTriage);
      writeFile(cacheFile, fallbackTriage);
      process.exit(0);
    }

    // No shell: projectDir is a path, and a dir name like `x$(cmd)` would run.
    let detectionResult;
    try {
      const stdout = execFileSync(process.execPath, [detectScript, projectDir], {
        cwd: projectDir,
        encoding: 'utf8',
        timeout: 8000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      detectionResult = { success: true, output: stdout.trim() };
    } catch (e) {
      detectionResult = { success: false, output: e.stdout ? e.stdout.toString().trim() : '' };
    }

    let triageOutput;
    if (!detectionResult.success || !detectionResult.output.trim()) {
      triageOutput = JSON.stringify({
        project_type: 'unknown',
        error: 'detection script failed',
      }, null, 2);
      output(triageOutput);
      writeFile(cacheFile, triageOutput);
      process.exit(0);
    }

    // Validate JSON output
    try {
      const parsed = JSON.parse(detectionResult.output);
      // Surface user-configured quality thresholds so agents (tdd-enforcer,
      // test-engineer, performance-optimizer, session-librarian) can read them from
      // triage. Only emitted when the user has set `forgebee.thresholds` in
      // .claude/settings.json — when absent, the field is omitted and agents fall
      // through to CLAUDE.md / labeled defaults (preserves triage > CLAUDE.md > default).
      try {
        const settingsPath = path.join(projectDir, '.claude', 'settings.json');
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          const t = settings && settings.forgebee && settings.forgebee.thresholds;
          if (t && typeof t === 'object') parsed.thresholds = t;
        }
      } catch (e) {
        // settings.json unreadable/invalid — skip; agents use their labeled defaults
      }
      triageOutput = JSON.stringify(parsed, null, 2);
    } catch (e) {
      triageOutput = JSON.stringify({
        project_type: 'unknown',
        error: 'detection script output invalid JSON',
      }, null, 2);
      output(triageOutput);
      writeFile(cacheFile, triageOutput);
      process.exit(0);
    }

    // Cache and output
    writeFile(cacheFile, triageOutput);
    output(triageOutput);

    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(0); // best-effort context hook — never surface a hook error to the user
  }
}

main();
