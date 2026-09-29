#!/usr/bin/env node
/**
 * Scenario: LLM app — Node LangGraph + Anthropic SDK, Python LangChain integrations
 * Expected: llm.detected with langgraph/langchain/anthropic-sdk, language mixed;
 * integration packages (langchain-openai) must not count as the openai SDK.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const SCENARIO_DIR = path.join(TMPDIR, 'llm-app');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  console.error(`Full output: ${JSON.stringify(output, null, 2)}`);
  process.exit(1);
}

fs.mkdirSync(SCENARIO_DIR, { recursive: true });

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'package.json'),
  `{
  "name": "support-agent",
  "dependencies": {
    "@langchain/langgraph": "^1.0.0",
    "@anthropic-ai/sdk": "^1.0.0"
  }
}
`
);

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'pyproject.toml'),
  `[project]
name = "ingest"
dependencies = [
  "langchain-core>=1.0",
  "langchain-openai>=1.0",
]
`
);

const detectScript = path.join(FORGEBEE_ROOT, 'skills/project-router/scripts/detect_project.js');
let output;
try {
  output = JSON.parse(execSync(`node "${detectScript}" "${SCENARIO_DIR}"`, { encoding: 'utf8' }));
} catch (e) {
  console.error('Failed to run detect_project.js');
  console.error(e.message);
  process.exit(1);
}

const llm = output.llm || {};
if (llm.detected !== true) fail('llm.detected expected true');
for (const fw of ['langgraph', 'langchain', 'anthropic-sdk']) {
  if (!(llm.frameworks || []).includes(fw)) fail(`${fw} not in llm.frameworks`);
}
if ((llm.frameworks || []).includes('openai-sdk')) fail('langchain-openai counted as openai-sdk');
if (llm.language !== 'mixed') fail(`llm.language expected 'mixed', got '${llm.language}'`);

console.log('All assertions passed');
