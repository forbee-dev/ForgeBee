---
name: audit-self
description: Use to re-run the ForgeBee self-audit on demand — scores every skill, agent, and command against the scorecard. Writes timestamped findings and surfaces regressions since the last run.
version: 1.1.0
---

# Audit Self

## Objective

Re-run the scorecard behind the manual audit files (`docs/planning/audit-*.md`) on demand. Catch regressions: agents missing the status protocol, skills with WHAT-first descriptions, bloat, severity-vocabulary drift.

Write findings to `docs/planning/audit-YYYY-MM-DD.md` (timestamped, never overwriting). Report only NEW issues since the last audit: regression detection, not a full-state report.

## When this fires

- User invokes `/audit-self`.
- Before a version bump (recommended manual step).
- `learn-nudge.js` may hint when the last audit is > 60 days old and the project changed a lot.

## Scorecards

Read these before auditing. They are the canonical rubric:
- `forgebee/skills/audit-self/scorecards/skills-scorecard.md` — 9 questions per skill
- `forgebee/skills/audit-self/scorecards/agents-scorecard.md` — 10 questions per agent
- `forgebee/skills/audit-self/scorecards/commands-scorecard.md` — 9 questions per command + cross-cutting

## Process

### Step 1: Inventory
- Count skills in `forgebee/skills/`, agents in `forgebee/agents/`, commands in `forgebee/commands/`.
- Treat `forgebee/INDEX.md` as the authoritative surface inventory.
- Compare with prior audit counts; flag added/removed.

### Step 2: Score against rubrics
Apply the matching scorecard to each item. Most items are FINE; put detail on problem items. Use the Y/N + concrete-finding format of the manual audits.

### Step 3: Cross-cutting checks
- Status protocol in all agents (Bucket X1)
- Karpathy principles in code-producing agents (W9)
- Severity vocabulary standardized in review skills (W9 P6)
- Prompt defense baseline in all agents (W13)
- "Use when..." descriptions across skills (5.0 audit)
- Persona ↔ references/ symmetry (`node scripts/check-references.js`)
- `--skip-checkpoint` rate from `.claude/audit/skip-checkpoint.jsonl`: flag if >50% across the last 10 `/workflow` runs (sticky-alias drift)

### Step 4: Regression detection
- Read the most recent `docs/planning/audit-*.md` (or audit-skills.md / audit-agents-*.md / audit-commands.md if no timestamped one exists).
- Classify each prior issue as fixed or still present.
- Flag each current issue absent from the prior audit as NEW.

### Step 5: Write findings
Output to `docs/planning/audit-YYYY-MM-DD.md`:

```markdown
# ForgeBee Self-Audit (YYYY-MM-DD)

## Inventory Delta vs Prior Audit
- Skills: 25 → N (Δ +M added, -K removed)
- Agents: 48 → N (Δ +M / -K)
- Commands: 33 → N (Δ +M / -K)

## Regressions (NEW issues since last audit)
- <prioritized list, with file:line>

## Fixed (issues from last audit, now resolved)
- <list>

## Persistent Issues (unfixed)
- <list>

## Cross-Cutting Health
- Status protocol coverage: N/M agents
- Karpathy P1+P4 coverage: N/M code-producing agents
- Severity vocabulary standardized: Y/N
- Prompt defense baseline: N/M agents
- "Use when..." descriptions: N/M skills

## Top 10 Concrete Fixes (prioritized)
1. <file:line — issue — fix>
2. ...

## Snapshot for next audit
- Total skills: N
- Total agents: N
- Total commands: N
- Audit timestamp: YYYY-MM-DD
```

## Completion Rule

Single pass, not a fix loop. Write the file and stop when all hold:

1. **Full coverage once:** every skill, agent, and command in `forgebee/INDEX.md` scored exactly once.
2. **Regression step run:** every prior issue classified Fixed / Persistent (Step 4). Skipping this invalidates the run.
3. **Findings written:** the timestamped file exists with Inventory Delta and Snapshot populated.

Do not re-score FINE items, fix what you find (recommend in the Top 10; fixing is a separate `/workflow` or `/review` run), or restart when new issues appear mid-audit (capture them; the next audit covers later changes). Cap detail at the top ~20 problem items.

If coverage cannot complete (stale INDEX.md, missing scorecard), stop and report the blocker. Do not present a partial audit as whole.

## Never

- Never overwrite a prior audit file. Always timestamp.
- Never report on every FINE item. Cap detail at top-20.
- Never implement fixes. Recommend only.
- Never skip the regression step. It is the main value.
- Never score the audit's own files (self-reference loop).
