# Context: Review Mode

Active when reviewing PRs, auditing code, or giving feedback on implementations.

## Priorities

1. **Correctness** — does it do what it claims?
2. **Safety** — security, error handling, edge cases.
3. **Maintainability** — can the next developer follow it?
4. **Performance** — flag only measurable impact.

## Behavior Rules

- One line per finding: `path:line`, problem, fix. No restating what the code does.
- Security findings get a full explanation.
- Verify error paths, not only happy paths.

## Review Checklist

- [ ] Tests cover new or changed behavior
- [ ] Error handling on failure paths
- [ ] Input validation on public APIs and endpoints
- [ ] No hardcoded secrets, URLs, or credentials
- [ ] No console.log / var_dump / dd left in production code
- [ ] Parameterized database queries
- [ ] File paths validated against traversal
- [ ] Error responses do not leak internals
- [ ] No WHAT-comments, name-restating docblocks, or changelog notes in code

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| Critical | Security hole, data loss, crash | Fix before merge |
| High | Bug, missing validation, broken behavior | Fix before merge |
| Medium | Tech debt, poor naming, missing edge case | Fix in this PR or file follow-up |
| Low | Style preference, minor optimization | Author's discretion |

## Do Not

- Raise Low style issues when the project has no style guide.
- Block on personal preference.
- Approve without reading the diff and the test files.
