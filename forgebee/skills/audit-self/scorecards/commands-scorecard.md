# Commands Scorecard

For each command in `forgebee/commands/`, score Y/N on these questions:

1. **Description format:** Triggering format (concise, action-oriented)?
2. **Has Objective:** Clear single-sentence purpose?
3. **Has Never rules:** Explicit hard boundaries?
4. **Delegates vs Executes:** Clear about whether it delegates to an agent or does work itself?
5. **Anti-rationalization gate:** If high-risk (security, migrate, deploy), has explicit gate?
6. **Status reporting at end:** Clear final output shape?
7. **Overlaps with another command:** Name which.
8. **Overlaps with a skill:** Name which (e.g., `/review` command vs `review-all` skill).
9. **Length:** Body under ~200 lines? (Capture line count.)

## Output per command

```markdown
### <command-name>
- Structure: <items 1-3 Y/N>
- Delegation: <items 4-5 Y/N>
- Quality: <item 6 Y/N>
- Overlaps: <items 7-8 mapping>
- Length: <line count>
- Issues: <concrete bullets>
- Recommendation: <specific fix | no changes>
```

## Cross-cutting matrix

For overlaps, build a Skill ↔ Command ↔ Agent table:

| Layer | Item | Counterpart in other layers |
|---|---|---|
| Skill | review-all | Command: /review-all (none) — Agent: (none, inline skill) |
| Command | /analytics | Skill: (none) — Agent: marketing-analyst — Status: delegates ✅ |
| Command | /pm | Skill: (none) — Agent: dashboard-generator — Status: executes (intentional) |

Decide for each: is the layering intentional (command delegates to agent uses skill) or duplication (two layers re-implement the same content)?

## Orphan check

- List agents that no command dispatches to and no orchestrator (/workflow, /team, /growth) calls
- These are candidates for removal or re-wiring

## Coverage gaps

- Domains agents cover but no command exposes (e.g., does every dev agent have a command to trigger it directly?)
