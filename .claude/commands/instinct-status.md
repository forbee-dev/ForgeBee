---
name: instinct-status
description: Show learned instincts with confidence scores
allowed-tools: Read, Bash
---

# /instinct-status — Show Instinct Status

Display all learned instincts (project-scoped + global), grouped by domain with confidence bars and observation stats.

## Implementation

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" status
```

## Output

Shows project and global instincts grouped by domain with:
- Confidence bar (visual)
- Trigger condition
- Action summary
- Observation count
