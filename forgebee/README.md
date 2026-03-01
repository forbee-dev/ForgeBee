# ForgeBee — Plugin Package

This is the plugin directory that Claude Code loads. It contains:

```
forgebee/
├── .claude-plugin/
│   └── plugin.json       # Plugin metadata (name, version, hooks)
├── hooks/
│   ├── hooks.json        # Hook event wiring
│   └── scripts/          # 8 lifecycle hook scripts
├── agents/               # Symlinked from ../.claude/agents/
├── commands/             # Symlinked from ../.claude/commands/
├── skills/               # Skill definitions
└── templates/            # CLAUDE.md and other templates
```

For full documentation, see the [main README](../README.md).

## Install

```bash
/plugin marketplace add forbee-dev/ForgeBee
/plugin install forgebee@ForgeBee
```
