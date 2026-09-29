#!/usr/bin/env node
/**
 * Scenario: Python FastAPI service managed by uv, with a tooling-only package.json
 * Expected: project_type python, framework fastapi, package manager uv, pytest/ruff/mypy;
 * plugin packages (pytest-cov) alone do not count as the base tool.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FORGEBEE_ROOT = process.env.FORGEBEE_ROOT || path.resolve(__dirname, '../..');
const TMPDIR = process.env.TMPDIR || os.tmpdir();
const SCENARIO_DIR = path.join(TMPDIR, 'python-fastapi');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  console.error(`Full output: ${JSON.stringify(output, null, 2)}`);
  process.exit(1);
}

fs.mkdirSync(SCENARIO_DIR, { recursive: true });

fs.writeFileSync(
  path.join(SCENARIO_DIR, 'pyproject.toml'),
  `[project]
name = "orders-api"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]",
]

[dependency-groups]
dev = ["pytest-cov", "mypy"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
`
);
fs.writeFileSync(path.join(SCENARIO_DIR, 'uv.lock'), '');
fs.writeFileSync(
  path.join(SCENARIO_DIR, 'package.json'),
  '{ "name": "orders-api-tooling", "devDependencies": { "prettier": "^3.0.0" } }'
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

const py = output.python || {};
if (output.project_type !== 'python') fail(`project_type expected 'python', got '${output.project_type}'`);
if (py.detected !== true) fail('python.detected expected true');
if (py.framework !== 'fastapi') fail(`python.framework expected 'fastapi', got '${py.framework}'`);
if (py.package_manager !== 'uv') fail(`python.package_manager expected 'uv', got '${py.package_manager}'`);
if (py.version_constraint !== '>=3.12') fail(`python.version_constraint expected '>=3.12', got '${py.version_constraint}'`);
for (const tool of ['pytest', 'ruff', 'mypy']) {
  if (!(py.tools || []).includes(tool)) fail(`${tool} not in python.tools`);
}
if (output.llm?.detected !== false) fail('llm.detected expected false');

console.log('All assertions passed');
