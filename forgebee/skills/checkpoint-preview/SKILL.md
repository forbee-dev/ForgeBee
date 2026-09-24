---
name: checkpoint-preview
description: Use after autonomous /workflow execution to walk the diff by concern (not by file) with risk-tagged hot spots — bridges agent autonomy to human judgment before debate or delivery.
version: 1.0.0
---

# Checkpoint Preview

## Objective

Hand autonomous work back to human judgment. Walk the diff **by concern** (cohesive design intent), not by file. Surface 2-5 high-blast-radius spots with risk tags so the reviewer can choose: ship, rework, or dig deeper.

Adapted from BMAD's bmad-checkpoint-preview. A raw `git diff` is in file order, which rarely builds understanding; reviewers then skim and miss, or read every file and lose the thread. You read the diff, spec, and codebase, and present the change in comprehension order.

## When this fires

- After `/workflow` Execute + Spec Compliance, before Code Debate (Large/Critical).
- After `/team` dispatch, before the final review-all.
- When a user asks to "walk me through this diff" or "review this branch".

Skip when the user passes `--skip-checkpoint` to `/workflow`, or the change is trivial (1-2 files, one concern).

## The 5 Steps

### 1. Orientation
One-line intent plus surface-area stats. The reviewer confirms intent before reading code.
```
Intent: Add user CSV export endpoint with date-range filter.
Stats: 8 files changed, 3 modules touched, 247 lines of logic added, 1 schema migration, 2 new public interfaces.
```

### 2. Walkthrough by Concern
Group by design intent ("API contract", "input validation", "auth integration"). Go top-down: highest-level intent first. The reviewer never meets a reference to something not yet shown.

```markdown
### Concern 1: API contract
Endpoint chosen for X; trade-off Y.
- `src/api/users/export.ts:14-32` — route definition
- `src/api/users/export.types.ts:1-22` — request/response shapes

### Concern 2: Input validation
Runs before DB access; dates are RFC3339.
- `src/api/users/export.ts:34-58` — validators
```

### 3. Detail Pass (hot spots)
2-5 spots where a mistake does the most damage, ordered by worst-case impact, not file position. Tags:

- `[auth]` — middleware, sessions, login, JWTs, passwords
- `[schema]` — migrations, model defs, RLS policies
- `[billing]` — Stripe/Paddle hooks, subscription state, invoices
- `[public API]` — REST routes, GraphQL schema, OpenAPI
- `[security]` — validation, sanitization, uploads, eval/exec
- `[data-loss]` — deletes, irreversible writes, hard-delete migrations
- `[perf]` — query loops, N+1, large allocations

```markdown
### Hot Spots
1. `[public API]` `src/api/users/export.ts:42` — expired token returns 200 with empty CSV, not 401. Worst case: silent data exposure.
2. `[data-loss]` `migrations/2026_05_19_export_log.sql:8` — DROP TABLE in down-migration loses the audit log on rollback. Keep down-migration empty or rename.
```

### 4. Adversarial Findings (if Code Debate ran)
Surface unresolved Skeptic concerns: flagged decisions the reviewer should know, not bugs already fixed.

### 5. Verdict Prompt

```markdown
### Verdict
- [ ] Ship — design is sound, hot spots understood, accept the trade-offs
- [ ] Rework — one or more hot spots need to be addressed before ship
- [ ] Dig deeper — request a focused review on a specific area
```

## Output Shape

One message with the 5 sections in order. No file dumps; concerns and hot spots only.

## Never

- Never present changes in file order.
- Never list more than 5 hot spots. The cap forces real prioritization.
- Never report bugs already fixed in the diff.
- Never substitute for review-all or Code Debate. This is a human-handoff layer, not a quality gate.
- Never pick the verdict yourself. The human chooses ship / rework / dig deeper.
