---
name: review-all
description: Full Review — Pre-Push Quality Gate. Interactive, opinionated review covering code quality, performance, security, accessibility, documentation, and best practices. Runs inline with session context for maximum efficiency.
version: 1.0.0
---

# Full Review — Pre-Push Quality Gate

## Objective

Find bugs, security holes, performance issues, and quality problems in changed code. Every issue has a file:line reference and a recommended fix. Runs inline — leverages session context (what you've been editing, why, what trade-offs were discussed).

**Success looks like:** A clear READY/NEEDS FIXES/BLOCKED verdict with actionable items.

## Never

- Never flag issues in unchanged code — only review the diff
- Never skip a review section because the change "looks small"
- Never give READY verdict if any Critical issue is open
- Never nitpick stylistic preferences — focus on substance

## Calibration

Only flag issues that actually matter. Use this severity guide:

| Severity | Blocks push? | Examples |
|----------|-------------|----------|
| **Critical** | YES — must fix | SQL injection, secret exposure, data loss, broken auth |
| **High** | YES — must fix | Missing error handling on external calls, N+1 queries, XSS |
| **Medium** | No — recommend fix | DRY violations, missing edge cases, unclear naming |
| **Low** | No — informational | Missing docblocks, minor style issues, optional optimizations |

Only Critical and High block the push. Medium and Low are recommendations — mention them briefly, don't belabor them. If the diff is clean on Critical/High, say READY even if there are Medium/Low items.

**Anti-patterns to avoid:**
- Flagging pre-existing issues in unchanged code
- Suggesting refactors unrelated to the change
- Reporting style issues as High severity
- Reviewing more than 3 iterations on the same diff

## Engineering Preferences

- DRY is important — flag repetition aggressively (but as Medium, not Critical)
- Code should be "engineered enough" — not fragile, not over-abstracted
- Handle edge cases — err on the side of more, not fewer
- Explicit over clever — readability wins

## Before Starting

1. Check session context — what files have been discussed? What was the goal?
2. Run `git diff HEAD` to see all uncommitted changes. If none, run `git diff HEAD~1` for the last commit.
3. Run `git log --oneline -5` for context.
4. Only report issues on **changed code**.

## Review Sections

Work through each section systematically.

### 1. CODE QUALITY
- Code organization and module structure
- DRY violations
- Error handling patterns and missing edge cases
- Areas that are over-engineered or under-engineered
- Naming and readability

### 2. PERFORMANCE
- N+1 queries and database access patterns
- Missing caching opportunities
- Memory concerns and expensive loops
- Slow or high-complexity code paths

### 3. SECURITY
- Injection vulnerabilities (SQL, XSS, command)
- Unescaped output, missing sanitization
- Hardcoded secrets, broken auth
- CSRF, access control issues
- Framework-specific sanitization and escaping

### 4. ACCESSIBILITY (if UI changes)
- Missing alt text, ARIA labels
- Keyboard navigation, focus management
- Color contrast, semantic HTML
- WCAG 2.1 AA compliance

### 5. DOCUMENTATION (brief — don't over-flag)
- Missing/outdated docblocks on public APIs
- Undocumented complex logic

### 6. BEST PRACTICES
- SOLID principles violations that affect maintainability
- Coding standards for the project's language/framework
- File organization, separation of concerns

## For Large Diffs (>500 lines changed)

Delegate to specialized review skills with `context:fork` for parallel deep review:
- `review-security` for auth/data changes
- `review-performance` for database/query changes
- `review-accessibility` for UI changes

Synthesize their findings into your final report.

## For Each Issue Found

1. Describe the problem concretely, with **file and line references**
2. Present **2-3 options**, including "do nothing" where reasonable
3. Give your **recommended option and why**
4. Assign severity (Critical/High/Medium/Low)

## Final Summary

```markdown
## Review: [Target]

### Verdict: READY | NEEDS FIXES | BLOCKED
**Quality score:** N/10

### Blocking Issues (Critical + High)
| # | Issue | File:Line | Severity | Fix |
|---|-------|-----------|----------|-----|

### Recommendations (Medium + Low)
| # | Issue | File:Line | Severity | Suggestion |
|---|-------|-----------|----------|------------|

### Positive Notes
[What's done well — always include at least 2]
```

## Communication

When working on a team, report:
- Push readiness verdict
- Critical blockers (if any)
- Issue count by category and severity
