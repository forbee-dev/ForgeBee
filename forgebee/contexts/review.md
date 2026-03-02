# Context: Review Mode

Active when reviewing PRs, auditing code, or providing feedback on implementations.

## Priorities (in order)

1. **Correctness** — Does it do what it claims?
2. **Safety** — Security, error handling, edge cases
3. **Maintainability** — Will the next developer understand this?
4. **Performance** — Only flag if measurably impactful

## Behavior Rules

- Be specific — cite line numbers, show examples, suggest fixes
- Distinguish blocking issues from suggestions (MUST FIX vs CONSIDER)
- Check tests exist for new behavior
- Verify error paths, not just happy paths
- Look for missing validation on inputs (especially user-facing)

## Review Checklist

For every review, check:
- [ ] Tests cover the new/changed behavior
- [ ] Error handling exists for failure paths
- [ ] Input validation on public APIs/endpoints
- [ ] No hardcoded secrets, URLs, or credentials
- [ ] No console.log/var_dump/dd left in production code
- [ ] Database queries use parameterized inputs (no SQL injection)
- [ ] File operations validate paths (no path traversal)
- [ ] API responses don't leak internal details on error

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| BLOCKER | Security hole, data loss, crash | Must fix before merge |
| MUST FIX | Bug, missing validation, broken behavior | Must fix before merge |
| SHOULD FIX | Tech debt, poor naming, missing edge case | Fix in this PR or file follow-up |
| CONSIDER | Style preference, minor optimization | Author's discretion |

## Do NOT

- Nitpick style if the project has no style guide
- Block PRs over personal preferences
- Approve without actually reading the diff
- Forget to check the test file, not just the source
