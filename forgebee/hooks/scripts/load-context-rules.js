#!/usr/bin/env node
/**
 * load-context-rules.js
 * Load contexts and language-specific rules on SessionStart
 * Reads the triage JSON to determine which language rules to load,
 * then outputs them to stderr so they appear in the session context
 */

const path = require('path');
const fs = require('fs');
const {
  getProjectDir,
  findForgebeeRoot,
  readFile,
  log,
} = require('./_common.js');

function main() {
  try {
    const projectDir = getProjectDir();
    const forgebeeRoot = findForgebeeRoot();

    // Always load common rules
    const commonRulesDir = path.join(forgebeeRoot, 'rules', 'common');
    if (fs.existsSync(commonRulesDir)) {
      try {
        const files = fs.readdirSync(commonRulesDir);
        files.forEach(file => {
          if (file.endsWith('.md')) {
            log(`[Rules] Loaded: common/${file}`);
          }
        });
      } catch (e) {
        // Ignore directory read errors
      }
    }

    // Detect default context (dev mode unless overridden)
    const contextFile = path.join(projectDir, '.claude', 'session-cache', 'active-context');
    let activeContext = 'dev'; // Default context

    if (fs.existsSync(contextFile)) {
      const storedContext = readFile(contextFile);
      if (storedContext) {
        const trimmedContext = storedContext.trim();
        if (trimmedContext === 'dev' || trimmedContext === 'research' || trimmedContext === 'review') {
          activeContext = trimmedContext;
        }
      }
    }

    // Load active context
    const contextPath = path.join(forgebeeRoot, 'contexts', `${activeContext}.md`);
    if (fs.existsSync(contextPath)) {
      log(`[Context] Active: ${activeContext}`);
    }

    // Load language-specific rules based on triage JSON
    const triageFile = path.join(projectDir, '.claude', 'session-cache', 'triage.json');

    if (fs.existsSync(triageFile)) {
      try {
        const triageContent = readFile(triageFile);
        if (!triageContent) {
          throw new Error('Failed to read triage file');
        }

        const triage = JSON.parse(triageContent);

        // Check for Node/TypeScript projects
        const nodeFramework = triage.node?.framework || 'none';
        if (nodeFramework !== 'none') {
          const tsRulesDir = path.join(forgebeeRoot, 'rules', 'typescript');
          if (fs.existsSync(tsRulesDir)) {
            log(`[Rules] Loaded: typescript/ (detected ${nodeFramework})`);
          }
        }

        // Check for WordPress/PHP projects
        const wpType = triage.wordpress?.type || 'none';
        const phpFramework = triage.php?.framework || 'none';
        if (wpType !== 'none' || phpFramework !== 'none') {
          const phpRulesDir = path.join(forgebeeRoot, 'rules', 'php');
          if (fs.existsSync(phpRulesDir)) {
            const detected = wpType !== 'none' ? wpType : phpFramework;
            log(`[Rules] Loaded: php/ (detected ${detected})`);
          }
        }

        // Check for Python projects
        const pythonFramework = triage.python?.framework || 'none';
        if (pythonFramework !== 'none') {
          const pythonRulesDir = path.join(forgebeeRoot, 'rules', 'python');
          if (fs.existsSync(pythonRulesDir)) {
            log(`[Rules] Loaded: python/ (detected ${pythonFramework})`);
          }
        }
      } catch (e) {
        // Ignore triage parse errors, fall back to file detection
        performFileDetection(projectDir, forgebeeRoot);
      }
    } else {
      // No triage JSON — detect from files in project directory
      performFileDetection(projectDir, forgebeeRoot);
    }

    process.exit(0);
  } catch (error) {
    log(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Fallback: detect language from config files
 */
function performFileDetection(projectDir, forgebeeRoot) {
  // Check for TypeScript/Node.js
  if (fs.existsSync(path.join(projectDir, 'tsconfig.json'))
      || fs.existsSync(path.join(projectDir, 'package.json'))) {
    log('[Rules] Loaded: typescript/ (detected from config files)');
  }

  // Check for PHP
  if (fs.existsSync(path.join(projectDir, 'composer.json'))
      || fs.existsSync(path.join(projectDir, 'wp-config.php'))) {
    log('[Rules] Loaded: php/ (detected from config files)');
  }

  // Check for Python
  if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))
      || fs.existsSync(path.join(projectDir, 'requirements.txt'))
      || fs.existsSync(path.join(projectDir, 'setup.py'))) {
    log('[Rules] Loaded: python/ (detected from config files)');
  }
}

main();
