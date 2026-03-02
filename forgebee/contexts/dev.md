# Context: Development Mode

Active when writing code, building features, fixing bugs, or refactoring.

## Priorities (in order)

1. **Working** — Make it run correctly first
2. **Right** — Handle edge cases, errors, validation
3. **Clean** — Refactor for readability and maintainability

## Behavior Rules

- Write code first, explain after — prefer working solutions over discussion
- Run tests after every meaningful change
- Commit at logical checkpoints (feature complete, tests passing)
- Use the project's existing patterns — don't introduce new conventions without justification
- Prefer editing existing files over creating new ones
- Keep PRs focused — one concern per branch

## When Stuck

1. Read the error message carefully
2. Check the test output
3. Search the codebase for similar patterns (Grep/Glob before writing)
4. Check docs/README for conventions
5. Escalate if blocked for >10 minutes

## Do NOT

- Over-engineer or add abstractions "for the future"
- Skip tests because "it's a small change"
- Leave TODO comments without corresponding tasks
- Refactor unrelated code in the same PR
