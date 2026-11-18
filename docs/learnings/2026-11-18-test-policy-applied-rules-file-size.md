---
title: "Test policy applied: rules file size trap in load-context-rules"
author: Tiago Santos
date: 2026-11-18
touches:
  - forgebee/rules/common/general.md
  - forgebee/rules/common/testing.md
  - forgebee/contexts/dev.md
  - forgebee/hooks/scripts/load-context-rules.js
  - forgebee/commands/team.md
---

## Decided
- Test policy D1-D8 is applied in 15 files, uncommitted on main (2026-11-18).
- `rules/common/general.md` holds a 6-line Testing summary. The full policy is in the new `rules/common/testing.md`.
- `contexts/dev.md` carries the two core rules, because it is always injected first.
- `/team` Step 6: the full suite runs one time at loop exit, or in round 3 through "final gate".
- `tdd-enforcer`: the 60% test-ratio default is removed too, same reason as the coverage defaults.

## Tried and ruled out
- Full policy inside `general.md`: the stripped file was over the 3200-byte budget, so the hook deferred the whole file and no common rule reached the session.

## Watch out
- `load-context-rules.js` MAX_BYTES = 3200 for all files together. Order: context, language rules, common rules. A file that does not fit becomes a path only.
- TypeScript projects: `dev.md` + `typescript/conventions.md` leave no room for `general.md`. It was deferred there before this change too.
- Measure after each edit to `rules/` or `contexts/`: run the hook with CLAUDE_PLUGIN_ROOT and CLAUDE_PROJECT_DIR set and check the last line.
