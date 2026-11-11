# Skills Scorecard

For each skill in `forgebee/skills/`, score Y/N on these questions:

1. **Description format:** Starts with "Use when..." or equivalent triggering phrase?
2. **Description length:** ≤200 chars?
3. **Description quality:** Describes WHEN to use (triggers) not WHAT it does (workflow)?
4. **Has Objective section:** Clear single-sentence purpose statement?
5. **Has Never rules:** Explicit hard boundaries (not just guidelines)?
6. **Body matches description:** What the description promises is what the body delivers? (Karpathy P1 trace)
   - **Check:** Pull verbs from the description (e.g., "audits", "scans", "writes", "compresses"). Grep the body for evidence of each verb. Description over-promising is a routing-trust bug — orchestrators dispatch based on description.
7. **Skill length:** Body under ~300 lines? (Capture line count.)
8. **`context: fork` justified:** If declared, is fork isolation actually needed? A fork sees no conversation: does the body avoid "use session context" and name the arguments it needs?
9. **Duplication risk:** Overlaps significantly with another skill? (Name which.)

## Output per skill

```markdown
### <skill-name>
- Format: <items 1-3 Y/N>
- Structure: <items 4-6 Y/N>
- Length: <line count> (over/under budget)
- Fork: <Y/N + justified>
- Duplication: <none / overlaps with X>
- Issues: <concrete bullets, file:line where applicable>
- Recommendation: <specific fix | no changes>
```

## Quick scan signals (heuristics)

- Description includes "Use when..." or "Use after..." → likely OK on #1
- Description > 200 chars → fail #2
- Description has both "Use when..." AND a 3-sentence workflow recap → fail #3
- Missing `## Never` heading → fail #5
- Body > 300 lines → fail #7
- Multiple skills mention the same trigger phrase in their description → fail #9 (overlap)

## Description ↔ Body Alignment Check (item #6 detail)

For each skill, run a basic verb-coverage check. Example:

| Description claims | Required evidence in body |
|---|---|
| "audits" | `## Audit Protocol` or numbered audit steps |
| "scans" | mention of grep / regex / pattern matching |
| "writes" / "produces" | output-shape section with example artifact |
| "compresses" | reference to compression rules / preserve list |
| "applies methods" | method catalog or reference to methods.csv |

Flag any skill whose description names a behavior the body doesn't demonstrate. This is a routing-trust bug — orchestrators dispatch based on the description; if the body doesn't deliver, the orchestrator gets wrong results.
