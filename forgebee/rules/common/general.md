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

- New features require tests before merge
- Bug fixes require a regression test
- Tests should be independent — no shared mutable state
- Name tests for the behavior they verify, not the function they call

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
