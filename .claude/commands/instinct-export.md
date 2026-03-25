---
name: instinct-export
description: Export instincts to a shareable file
allowed-tools: Read, Bash
---

# /instinct-export — Export Instincts

Export instincts to a shareable YAML format. Perfect for sharing with teammates or transferring to a new machine.

## Implementation

```bash
# Export all
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" export

# Export with filters
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" export --scope project --domain testing --min-confidence 0.7 --output team-instincts.yaml
```

## Flags

- `--scope <project|global|all>`: Export scope (default: all)
- `--domain <name>`: Filter by domain
- `--min-confidence <n>`: Minimum confidence threshold
- `--output <file>`: Output file path (prints to stdout when omitted)
