---
title: "Audit of /workflow, /team and review-all gates"
author: Tiago Santos
date: 2026-11-10
touches:
  - forgebee/commands/workflow.md
  - forgebee/commands/team.md
  - forgebee/skills/review-all/SKILL.md
---

## Decided
- Nothing applied. Audit only; the user decides the changes.
- Proposed order: fix review-all diff range; one review path in /workflow; checkpoint after the gates; /team Step 5 calls review-all; delete duplicated dispatch rules.

## Tried and ruled out
- `.claude/audit/*.jsonl` as proof of dispatch counts: the October file holds only session_end events.

## Watch out
- review-all and 8 other review-* skills use `git diff HEAD`, then `HEAD~1`. On a clean multi-commit branch they review only the last commit. /workflow asks for `git diff <merge-base>` but the skill takes no range.
- /workflow Medium: no phase owns the test run. verification-enforcer is framed spec-only (workflow.md:297), review-all runs no commands, delivery-agent must not run tests.
- delivery-agent needs a Verification Report; /workflow Small skips verification-enforcer, so delivery returns NEEDS_CONTEXT.
- workflow.md tier table (Medium row) omits Spec Compliance, Checkpoint and Final Gate that the phase sections require.
- Checkpoint Preview runs before Code Debate, but its step 4 expects debate results.
- workflow.md:275-276 still says "always include" test-engineer and security-auditor; team.md made both conditional.
- code-skeptic applies all review-all criteria, then the Final Gate runs review-all again on the same diff.
- team.md:21 sends >5 files to /workflow, but its own tier table goes to 15+ files. No /team step runs review-all.
- Model tier table, status protocol and --fable text exist in four places: both commands, hook RULES, digest.
