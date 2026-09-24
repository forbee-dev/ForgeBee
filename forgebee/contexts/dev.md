# Context: Development Mode

Active when writing code, building features, fixing bugs, or refactoring.

## Priorities

1. **Working** — runs correctly.
2. **Right** — edge cases, errors, validation.
3. **Clean** — readable and maintainable.

## Behavior Rules

- Write the code first. Explain after, in a few lines.
- Run tests after every meaningful change.
- Follow the project's existing patterns. Edit existing files before you create new ones.
- One concern per branch.
- Comments say WHY, not WHAT. Docblocks only where the project standard requires them (P7).

## When Stuck

1. Read the error and the test output.
2. Search the codebase for a similar pattern.
3. Escalate after 10 minutes blocked.

## Do Not

- Add abstractions "for the future".
- Skip tests because the change is small.
- Leave a TODO without a matching task.
- Refactor unrelated code in the same PR.
