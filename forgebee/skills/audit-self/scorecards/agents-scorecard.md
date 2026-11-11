# Agents Scorecard

For each agent in `forgebee/agents/`, score Y/N on these questions:

1. **Status protocol:** Has `## Status Reporting` block with the canonical four (`DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`)?
2. **Has Never rules:** Explicit hard boundaries?
3. **Expertise is specific:** Domain traps, exact commands, exact formats — not generic advice the model already knows? (A long generic Expertise list fails.)
4. **Has Methodology / Process section:** Defines how it operates?
5. **Evidence before DONE:** Must attach command output (test, lint, build, or a verify line per criterion) before reporting DONE? A self-review with no output fails.
6. **Escalation guidance:** Explicit "when to escalate to user" rules?
7. **Description focused:** Description tight, not overloaded with multiple roles?
8. **No redundancy:** Doesn't duplicate another agent's role significantly? (Name which.)
9. **Length:** Body under ~250 lines? (Capture line count.)
10. **Prompt defense baseline:** Has `## Adversarial Input Hardening` block?

Bonus (for code-producing agents only):
11. **Karpathy P1 + P4:** Has `<!-- karpathy-principles -->` marker block?

## Output per agent

```markdown
### <agent-name>
- Protocol: <items 1-3 Y/N>
- Structure: <items 4-6 Y/N>
- Quality: <items 7-9 Y/N>
- Hardening: <items 10-11 Y/N>
- Issues: <concrete bullets, file:line>
- Recommendation: <specific fix | no changes>
```

## Cross-cutting checks

- Count how many agents have canonical status protocol → target: 100%
- Count how many code-producing agents have Karpathy principles → target: 100% of the code-producing agents
- Count how many agents have prompt defense baseline → target: 100%
- Identify agents over 250 lines — these need bloat trimming (W16 territory)
- Identify agents with custom verdict tokens (e.g., VERIFIED, TDD COMPLIANT) — confirm they have a Verdict → Canonical mapping section
