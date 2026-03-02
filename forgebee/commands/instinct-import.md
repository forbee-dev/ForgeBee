---
name: instinct-import
description: Import instincts from a file
---

# /instinct-import — Import Instincts

Import instincts from a YAML file into the current project or global scope.

## Implementation

```bash
# Import to current project
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" import <file>

# Import with options
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" import <file> --scope global --min-confidence 0.7 --dry-run
```

## Merge Behavior

- Higher-confidence import → update candidate
- Equal/lower-confidence import → skipped
- New instinct IDs → added

## Flags

- `--dry-run`: Preview without importing
- `--force`: Skip confirmation prompt
- `--min-confidence <n>`: Only import instincts above threshold
- `--scope <project|global>`: Select target scope (default: project)
