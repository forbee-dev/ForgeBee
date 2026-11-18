---
title: "Test policy grill: failing tests, when to test, test runs"
author: Tiago Santos
date: 2026-11-18
touches:
  - forgebee/rules/common/general.md
  - forgebee/contexts/dev.md
  - forgebee/agents/test-engineer.md
  - forgebee/agents/tdd-enforcer.md
  - forgebee/skills/review-tests/SKILL.md
  - forgebee/skills/review-all/SKILL.md
  - forgebee/commands/test.md
---

## Decided
Grill settled 8 decisions on 2026-11-18. Nothing applied yet; the plan waits for user approval.
- Failing test: root cause in product code first. A test edit needs stated evidence. No weaker assertion, skip, or delete.
- New tests are risk-based: non-trivial logic, money/auth/data, bug-fix regression, or explicit request. Else report `Tests: none - <reason>`.
- No default coverage threshold. Coverage applies only when the project sets one.
- E2E only for critical journeys. Extend an existing spec before a new file.
- Affected tests in the review loop. Full suite one time at the final gate.
- Enforcement: rules + review gate (weakened/skipped/deleted test = High, needless test = Medium). No new hook.
- `/test prune` mode: keep/delete/merge report for old suites, no change without approval.

## Tried and ruled out
- "Never edit a test, always ask": stops the flow on each legitimate behavior change.
- PostToolUse hook on test-file edits: more code, false-positive risk.

## Watch out
- No file had a rule to check product code before a test edit.
- Conflicting lines: `contexts/dev.md:28`, `rules/common/general.md:28`, `agents/test-engineer.md:55,69,146`, `agents/tdd-enforcer.md:68-71`, `references/tdd-enforcer.md:76`, `agents/phpunit-engineer.md:111`, `agents/backend-engineer.md:56`, `agents/frontend-specialist.md:56`.
- Stack agents (wordpress-backend, nextjs-frontend, ...) have no test text; they get the policy only through the handoff and the session rules.
- `forgebee/skills/review-all/SKILL.md` has an uncommitted user edit in Step 2. Keep it.
