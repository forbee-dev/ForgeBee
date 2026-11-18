# Common Rules — Always Apply

## Code Quality

- Every function that can fail handles the error path
- Never swallow errors silently — at minimum, log them
- Use early returns to reduce nesting
- Keep functions under 50 lines; extract when longer
- Name variables for what they represent, not how they're computed

## Git Hygiene

- Commit messages: imperative mood, explain WHY not WHAT
- Never commit secrets, credentials, or API keys
- Never force-push to shared branches (main, develop, staging)
- One concern per commit — don't mix refactoring with features

## Security Baseline

- Validate all user input at the boundary (API handlers, form processors)
- Use parameterized queries — never concatenate SQL
- Sanitize output to prevent XSS
- Never log sensitive data (passwords, tokens, PII)
- Check file paths for traversal before operations

## Testing

- A failing test is evidence of a bug. Find the cause in the product code first.
- Edit a test only with stated proof (file:line): the task changes that behavior, or the test is wrong. Never weaken, skip, or delete a test to get a pass.
- Write tests by risk: non-trivial logic, money/auth/data paths, a bug-fix regression test, an explicit request. Else report `Tests: none — <reason>`.
- No coverage target unless the project sets one. E2E only for critical journeys.
- Run the related tests during work. The full suite runs one time, at the final gate.
- Full policy: `rules/common/testing.md`

## Documentation

- Update README when adding new commands, endpoints, or config options
- Keep API docs in sync with implementation
- Docs: no preamble, no recap, no restating the heading

## Comments and Docblocks

- Comment only WHY: a constraint, a workaround, a non-obvious decision. Skip the comment when the name says it.
- No changelog, ticket, author, or "added by" notes in code. Git keeps history.
- Docblocks only where the language standard requires them. Write the minimum the linter accepts.
- Never restate the function or parameter name in prose.
- Language-specific forms: see "Comments and Docblocks" in `rules/php`, `rules/typescript`, and `rules/python`.
