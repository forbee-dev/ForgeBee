---
name: evolve
description: Analyze instincts and cluster them into skills, commands, or agents
---

# /evolve — Evolve Instincts into Higher-Level Structures

Analyze all instincts (project + global) and identify clusters that can be evolved into skills, commands, or agents.

## Implementation

```bash
# Analysis only (show candidates)
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" evolve

# Analysis + generate files
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" evolve --generate
```

## Evolution Rules

### → Command (User-Invoked)
When instincts describe actions a user would explicitly request:
- Multiple instincts about "when user asks to..."
- Instincts with triggers like "when creating a new X"
- Instincts that follow a repeatable sequence

### → Skill (Auto-Triggered)
When instincts describe behaviors that should happen automatically:
- Pattern-matching triggers
- Error handling responses
- Code style enforcement

### → Agent (Needs Depth/Isolation)
When instincts describe complex, multi-step processes:
- Debugging workflows
- Refactoring sequences
- Research tasks

## Output

Shows:
- Skill candidates (trigger clusters with 2+ instincts)
- Command candidates (high-confidence workflow instincts)
- Agent candidates (clusters of 3+ with avg confidence ≥ 75%)
- Promotion candidates (project → global)

## Flags

- `--generate`: Generate evolved files under `evolved/{skills,commands,agents}`
