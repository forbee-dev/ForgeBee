---
name: elicit
description: Stress-test the most recent plan, design, or architecture artifact using a named reasoning method (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, etc.)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Elicit

## Objective

Apply one of 18 named reasoning methods to challenge your own most recent output. Adapted from BMAD's advanced-elicitation pattern.

## Never

- Never apply to a non-existent artifact — there must be a concrete artifact in the conversation
- Never produce vibes findings — each finding maps to a specific element of the artifact
- Never use as a delay tactic — pick a method, run quickly, output concrete actions

## Delegation

This command invokes the `elicitation` skill (`${CLAUDE_PLUGIN_ROOT}/skills/elicitation/SKILL.md`) which catalogues 18 methods in `methods.csv`.

**Dispatch:**

- `/elicit` (no args) → list relevant methods, recommend 2-3 based on most recent artifact, let user pick
- `/elicit <method-name>` → apply that method directly. Examples:
  - `/elicit pre-mortem`
  - `/elicit red-team`
  - `/elicit stakeholder-round-table`
  - `/elicit inversion`
  - `/elicit five-whys`
  - `/elicit tree-of-thoughts`
  - `/elicit time-traveler-council`
  - `/elicit cost-of-delay`

## Output

```markdown
## Elicitation: <Method>
**Applied to:** <artifact + path>

### Findings
- <finding mapped to artifact element>

### Concrete Actions
- [ ] <specific change>

### Verdict
<artifact survives / needs revision / needs discussion>
```

## Pairs with

- `/plan` and `/workflow` Plan phase — auto-offers `pre-mortem` / `stakeholder-round-table` / `red-team` at phase boundary
- `/architect` — auto-offers `tree-of-thoughts` / `inversion` / `time-traveler-council` at decision boundary
- Debate triads — debates run on requirements; elicitation runs on artifacts. Complementary, not redundant.
