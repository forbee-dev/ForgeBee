---
name: surface-ambiguity
description: Use when about to make a non-trivial choice with multiple valid interpretations — forces listing of options and the chosen one with rationale. Catches silent picks.
version: 1.0.0
---

# Surface Ambiguity

## Objective

Prevent silent picks. Before a non-trivial choice with 2+ valid interpretations, list the options and pick one with a one-line reason.

This targets a Karpathy-diagnosed LLM failure: making assumptions on the user's behalf and running with them. It sits between `brainstorming` (upfront, formal) and the debate triads (post-plan, formal), and catches mid-stream picks, for example reading "export users" and silently choosing JSON, all users, file on disk.

## When this fires

- A request has more than one reasonable read (format, scope, fallback, library, location).
- A sub-task leads to implementation details not in the original ask.
- Naming, defaults, error semantics, or boundary conditions are about to be picked silently.

## Output shape (mandatory)

```markdown
**Interpretations considered:**
1. Option A — [one-line description]
2. Option B — [one-line description]
3. (optional) Option C — [one-line description]

**Chosen:** Option B
**Why:** [one-line rationale tying choice to the user's request]
**Reversible?** Yes / No

If No: surface to user and get approval BEFORE proceeding.
```

## Examples

| Situation | Silent pick (bad) | Surface (good) |
|---|---|---|
| "Add user export" | JSON | JSON / CSV / both, pick one |
| "Handle the error" | Swallow | swallow / log / throw / retry, pick one |
| "Use a queue" | Redis | Redis / Postgres / SQS, pick one |
| "Make it configurable" | 5 knobs | Which configs and why each is needed |
| "Match the existing pattern" | Any one pattern | 2-3 observed patterns, pick the closest |

## Never

- Never pick silently when 2+ valid reads exist.
- Never list interpretations after picking.
- Never list 4+ options. Split the question instead.
- Never use this for trivial choices (variable names, brace style).
- Never use the output shape as a delay. Pick fast and continue.
