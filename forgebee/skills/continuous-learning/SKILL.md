---
name: continuous-learning
description: Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents. Project-scoped instincts prevent cross-project contamination.
version: 1.0.0
---

# Continuous Learning — Instinct-Based Architecture

## Objective

Turn session observations into reusable knowledge through atomic instincts — small learned behaviors with confidence scoring that persist across sessions.

## Never

- Never activate instincts without explicit user approval
- Never mix project-scoped instincts across projects
- Never create instincts from one-time events (API outages, typos)

An advanced learning system that turns your ForgeBee sessions into reusable knowledge through atomic "instincts" — small learned behaviors with confidence scoring.

Project-scoped instincts keep React patterns in your React project, Python conventions in your Python project, and universal patterns (like "always validate input") shared globally.

## When to Activate

- Setting up automatic learning from Claude Code sessions
- Configuring instinct-based behavior extraction via hooks
- Tuning confidence thresholds for learned behaviors
- Reviewing, exporting, or importing instinct libraries
- Evolving instincts into full skills, commands, or agents
- Managing project-scoped vs global instincts

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional
```

**Properties:**
- **Atomic** — one trigger, one action
- **Confidence-weighted** — 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** — code-style, testing, git, debugging, workflow, etc.
- **Evidence-backed** — tracks what observations created it
- **Scope-aware** — `project` (default) or `global`

## How It Works

```
Session Activity (in a git repo)
      |
      | Hooks capture tool use (PreToolUse + PostToolUse)
      | + detect project context (git remote / repo path)
      v
+-----------------------------------------+
|  projects/<hash>/observations.jsonl      |
|   (tools, inputs, outputs, timestamps)   |
+-----------------------------------------+
      |
      | /learn analyzes patterns
      v
+-----------------------------------------+
|  projects/<hash>/instincts/personal/     |
|   * prefer-functional.yaml (0.7)         |
|   * use-react-hooks.yaml (0.9)           |
+-----------------------------------------+
|  instincts/personal/  (GLOBAL)           |
|   * always-validate-input.yaml (0.85)    |
|   * grep-before-edit.yaml (0.6)          |
+-----------------------------------------+
      |
      | /evolve clusters + /promote
      v
+-----------------------------------------+
|  evolved/                                |
|   * commands/new-feature.md              |
|   * skills/testing-workflow.md           |
|   * agents/refactor-specialist.md        |
+-----------------------------------------+
```

## Project Detection

The system automatically detects your current project:

1. **`CLAUDE_PROJECT_DIR` env var** (highest priority)
2. **`git remote get-url origin`** — hashed to create a portable project ID
3. **`git rev-parse --show-toplevel`** — fallback using repo path
4. **Global fallback** — if no project detected, instincts go to global scope

Each project gets a 12-character hash ID. A registry at `~/.claude/forgebee-learning/projects.json` maps IDs to human-readable names.

## Commands

| Command | Description |
|---------|-------------|
| `/learn` | Analyze current session and extract patterns as instincts |
| `/evolve` | Cluster related instincts into skills/commands/agents |
| `/instinct-status` | Show all instincts (project + global) with confidence |
| `/instinct-export` | Export instincts (filterable by scope/domain) |
| `/instinct-import` | Import instincts with scope control |

## Hooks

The observation hooks fire on every tool call (100% reliable — unlike skills which are probabilistic):

```json
{
  "PreToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/observe.js\"" }] }],
  "PostToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/observe.js\"" }] }]
}
```

## Confidence Scoring

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

## Scope Decision Guide

| Pattern Type | Scope | Examples |
|-------------|-------|---------|
| Language/framework conventions | **project** | "Use React hooks", "Follow Django REST patterns" |
| File structure preferences | **project** | "Tests in __tests__/", "Components in src/components/" |
| Code style | **project** | "Use functional style", "Prefer dataclasses" |
| Security practices | **global** | "Validate user input", "Sanitize SQL" |
| General best practices | **global** | "Write tests first", "Always handle errors" |
| Tool workflow preferences | **global** | "Grep before Edit", "Read before Write" |
| Git practices | **global** | "Conventional commits", "Small focused commits" |

## Instinct Promotion (Project → Global)

When the same instinct appears in 2+ projects with average confidence ≥ 0.8, it's a candidate for global promotion. Run `/evolve` to see promotion candidates.

## File Structure

```
~/.claude/forgebee-learning/
├── projects.json           # Registry: project hash → name/path/remote
├── observations.jsonl      # Global observations (fallback)
├── instincts/
│   ├── personal/           # Global auto-learned instincts
│   └── inherited/          # Global imported instincts
├── evolved/
│   ├── agents/             # Global generated agents
│   ├── skills/             # Global generated skills
│   └── commands/           # Global generated commands
└── projects/
    └── <project-hash>/
        ├── observations.jsonl
        ├── observations.archive/
        ├── instincts/
        │   ├── personal/
        │   └── inherited/
        └── evolved/
```

## Privacy

- Observations stay **local** on your machine
- Project-scoped instincts are isolated per project
- Only instincts (patterns) can be exported — not raw observations
- No actual code or conversation content is shared
