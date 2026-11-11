# Continuous Learning — Architecture Reference

How observation, instinct extraction, and evolution actually work under the hood. Implementation detail — `SKILL.md` is the thin user-facing surface.

## Flow

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
      | /evolve clusters + `instinct-cli.js promote`
      v
+-----------------------------------------+
|  evolved/                                |
|   * commands/new-feature.md              |
|   * skills/testing-workflow.md           |
|   * agents/refactor-specialist.md        |
+-----------------------------------------+
```

## Project Detection

The system automatically detects your current project, in priority order:

1. **`CLAUDE_PROJECT_DIR` env var** (highest priority)
2. **`git remote get-url origin`** — hashed to create a portable project ID
3. **`git rev-parse --show-toplevel`** — fallback using repo path
4. **Global fallback** — if no project detected, instincts go to global scope

Each project gets a 12-character hash ID. A registry at `~/.claude/forgebee-learning/projects.json` maps IDs to human-readable names.

## Hooks

Observation hooks fire on every matched tool call. `forgebee/hooks/hooks.json` registers them:

```json
{
  "PreToolUse": [{ "matcher": "Edit|Write|Bash|Task|Agent", "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/observe.js" }] }],
  "PostToolUse": [{ "matcher": "Edit|Write|Bash|Task|Agent", "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/observe.js" }] }]
}
```

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
