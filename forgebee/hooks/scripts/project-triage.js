#!/usr/bin/env node
/**
 * project-triage.js
 * Run project detection and cache the result
 * Called by session-load.js on SessionStart, or manually by the router skill
 * Caches the triage JSON so agents can consume it without re-scanning
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  findForgebeeRoot,
  readFile,
  writeFile,
  runCommand,
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

    // Run detection script
    const detectionResult = runCommand(`node "${detectScript}" "${projectDir}"`, {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

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
      JSON.parse(detectionResult.output);
      triageOutput = detectionResult.output;
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
    process.exit(1);
  }
}

main();
