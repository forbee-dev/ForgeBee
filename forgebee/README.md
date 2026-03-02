# ForgeBee — Plugin Package

This is the plugin directory that Claude Code loads. It contains:

```
forgebee/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata (name, version, hooks)
├── hooks/
│   ├── hooks.json           # Hook event wiring (24 hooks across 9 events)
│   └── scripts/             # 18 lifecycle hook scripts (Node.js)
├── agents/                  # 53 specialist agents
├── commands/                # 32 slash commands
├── contexts/                # 3 session modes (dev, research, review)
├── rules/                   # Language-specific conventions (common, TS, PHP, Python)
├── skills/
│   ├── continuous-learning/ # Instinct-based learning system
│   ├── forgebee-setup/      # Project initialization
│   └── project-router/      # Auto-detect project type and conventions
├── templates/               # CLAUDE.md, PM system templates
└── eval/                    # 5 evaluation scenarios
```

## Key Features

- **32 slash commands** — planning, development, growth, marketing, meta, learning
- **53 specialist agents** — dev, debate, strategy, growth OS
- **24 lifecycle hooks** across 9 events — session management, quality gates, observation
- **Continuous learning** — automatic observation of every tool call, instinct-based pattern extraction with confidence scoring (0.3–0.9), project-scoped isolation, and evolution into skills/commands/agents
- **Adversarial debate** — advocate/skeptic/judge for requirements, code, and strategy
- **Growth OS** — 9-phase marketing pipeline with CRO and email automation
- **Project management** — state.yaml, TASKS.md, dashboard generation
- **Quality automation** — auto-format, typecheck, console-warn on every edit

## Install

```bash
/plugin marketplace add forbee-dev/ForgeBee
/plugin install forgebee@forbee-dev
```

For full documentation, see the [main README](../README.md).
