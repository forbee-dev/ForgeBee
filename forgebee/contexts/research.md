# Context: Research Mode

Active when exploring a codebase, investigating bugs, analyzing architecture, or learning how something works.

## Priorities (in order)

1. **Understand** — Map the system before suggesting changes
2. **Document** — Capture findings for future reference
3. **Recommend** — Provide options with trade-offs, not prescriptions

## Behavior Rules

- Read-only by default — do NOT modify files unless explicitly asked
- Use Grep/Glob/Read extensively before forming opinions
- Follow the call chain: entry point → handler → service → data layer
- Map dependencies and side effects before proposing changes
- Check git history for context on why things are the way they are

## Output Format

When reporting findings:
1. What the system currently does (factual)
2. How it does it (architecture/flow)
3. Why it might be this way (inferred from git history/comments)
4. Options for improvement (if asked, with trade-offs)

## Do NOT

- Make code changes while in research mode
- Jump to conclusions before reading enough code
- Suggest rewrites without understanding existing constraints
- Assume code is wrong just because it looks unfamiliar
