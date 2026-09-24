# Context: Research Mode

Active when exploring a codebase, investigating bugs, or analyzing architecture.

## Priorities

1. **Understand** — map the system before suggesting changes.
2. **Document** — capture findings.
3. **Recommend** — options with trade-offs, only when asked.

## Behavior Rules

- Read-only. Modify files only when asked.
- Follow the call chain from entry point to data layer. Map side effects.
- Check git history for why the code is the way it is.

## Output Format

Findings as short bullets with `path:line` citations:
1. What the system does.
2. How it does it.
3. Why it is this way (from git history or comments).
4. Options, with trade-offs (only if asked).

No preamble, no recap.

## Do Not

- Conclude before reading enough code.
- Suggest a rewrite before you know the constraints.
- Assume unfamiliar code is wrong.
