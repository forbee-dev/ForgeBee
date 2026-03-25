# ForgeBee — Plugin Package

This is the plugin directory that Claude Code loads. It contains:

```
forgebee/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata (name, version, hooks)
├── hooks/
│   ├── hooks.json           # Hook event wiring (26 hooks across 9 events)
│   └── scripts/             # 20 lifecycle hook scripts (Node.js)
├── agents/                  # 69 specialist agents (including 12 review sub-agents)
├── commands/                # 33 slash commands
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

- **33 slash commands** — planning, development, growth, marketing, meta, learning
- **69 specialist agents** — dev, debate, strategy, growth OS, review sub-agents (all with "Use When" triggers)
- **26 lifecycle hooks** across 9 events — session management, quality gates, observation
- **Mode-aware permissions** — detects auto/bypass/default from Claude Code settings; Tier 0 blocklist active in ALL modes; configurable glob allowlist; command substitution blocking
- **Command-to-agent delegation** — `/debug`, `/security`, `/test` delegate to specialist agents with automatic fallback
- **Anti-rationalization gates** — `/deploy`, `/security`, `/migrate` include hard gates against common rationalizations
- **Continuous learning** — two-stage pipeline: heuristic pattern detection (Stop hook, no API calls) + pending instinct approval via `/learn`
- **Adversarial debate** — advocate/skeptic/judge for requirements, code, and strategy — batched (max 10 items) for cost efficiency
- **JSON handoff contracts** — structured context packages for workflow-to-agent dispatch
- **Growth OS** — 9-phase marketing pipeline with CRO and email automation
- **Project management** — state.yaml, TASKS.md, dashboard generation
- **Quality automation** — auto-format, typecheck, console-warn on every edit
- **Quality pipeline** — specialists self-review against review-all criteria, code-skeptic validates, orchestrators enforce quality contracts. review-all is validation, not discovery.
- **Objective + Never on everything** — all 33 commands, 69 agents, and 3 skills have clear objectives and hard "Never" boundaries
- **Plugin-only distribution** — `forgebee/` is the single source of truth, loaded directly by Claude Code's plugin system

## Install

```bash
/plugin marketplace add forbee-dev/ForgeBee
/plugin install forgebee@forbee-dev
```

For full documentation, see the [main README](../README.md).
