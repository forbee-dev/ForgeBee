---
name: review-all
description: Use when about to push, open a PR, or asking for a thorough pre-ship review — covers code quality, security, performance, accessibility, docs, and best practices in one pass.
version: 1.0.0
---

# Full Review — Pre-Push Quality Gate

## Objective

Find bugs, security holes, performance issues, and quality problems in changed code. Every issue has a `file:line` and a fix. Runs inline, so use session context: what was edited, why, and which trade-offs were discussed.

Output: a READY / NEEDS FIXES / BLOCKED verdict with actionable items.

> Findings (own and delegated) use `forgebee/skills/_review-finding-contract.md`. As the aggregator, sum the per-skill footer counts into one combined footer so `/audit-self` can parse the whole pass.

## P2 — Senior Engineer Test

Before a `READY` verdict, ask: would a senior engineer call this overcomplicated? If yes, the verdict is `NEEDS FIXES`; list the simplification as `High`. "It works" does not pass overcomplicated code.

## Never

- Never flag issues in unchanged code. Review the diff only.
- Never skip a review section because the change looks small.
- Never give READY with a Critical issue open.
- Never report style preferences as High.
- Never run more than 3 review iterations on the same diff.

## Calibration

Severity words and meanings are in the contract. Only Critical and High block the push. With Critical/High clean, say READY even with Medium/Low open. Mention Medium/Low in one line each.

Project preferences:
- Flag repetition as Medium (DRY matters here).
- "Engineered enough": not fragile, not over-abstracted.
- Explicit over clever.
- Do not suggest refactors unrelated to the change.

## Before Starting

1. Check session context: files discussed, goal.
2. Run `git diff HEAD`. If empty, run `git diff HEAD~1`.
3. Run `git log --oneline -5`.

## Review Sections

Work through each section. The model knows the generic checks; these are the ones to not miss.

1. **Code quality** — structure, DRY, error handling at trust boundaries, missing edge cases, over/under-engineering, naming. WHAT-comments / padded docblocks (P7) → Low.
2. **Performance** — N+1, missing cache, expensive loops, hot-path complexity.
3. **Security** — injection (SQL, XSS, command), unescaped output, missing sanitization, hardcoded secrets, broken auth, CSRF, access control, framework-specific escaping.
4. **Accessibility** (UI changes only) — alt text, ARIA, keyboard, focus, contrast, semantic HTML, WCAG 2.1 AA.
5. **Documentation** (brief) — missing/outdated docblocks on public APIs only where the project standard requires them; undocumented non-obvious logic.
6. **Best practices** — SOLID violations that hurt maintainability, project coding standard, separation of concerns.

## For Large Diffs (>500 lines changed)

Delegate to review skills with `context:fork` for parallel deep review. Map change type to skill so high-blast-radius areas (schema, public API, untested code) always get a deep pass. This mirrors checkpoint-preview's `[schema]` / `[public API]` hot-spot tags.

| Change includes… | Delegate to |
|---|---|
| auth, sessions, secrets, user-data handling | `review-security` |
| DB-heavy code, hot loops, render paths | `review-performance` |
| SQL migrations, schema changes, RLS/policies, ORM access | `review-database` |
| new/changed route handlers, REST/GraphQL endpoints, API contracts | `review-api` |
| new code paths or changed test files (or new code with no tests) | `review-tests` |
| UI components, markup, interaction | `review-accessibility` |
| WordPress plugin/theme files | `review-wordpress` |
| prompts, tool definitions, LLM calls, model output handling | `review-prompt` |

Merge their findings into your final report.

## For Each Issue

Give `file:line`, severity, and the recommended fix. For Critical/High with a real trade-off, add 1-2 alternatives (including "do nothing" where reasonable) in one line.

## Example

```
[Critical] Auth check missing on a state-changing route
File: src/routes/admin.ts:14
Issue: `POST /admin/users/:id/role` updates roles with no session/permission check; any caller can grant admin.
Fix: Require an authenticated session and `requireRole('admin')` before the handler.

[Low] Console.log left in shipped code path
File: src/lib/cart.ts:27
Issue: `console.log(cart)` leaks state to the browser console.
Fix: Remove it or route through the project logger gated to dev.
```

## Final Report

Findings tables and verdict only. No prose recap, no praise section.

```markdown
## Review: [Target]

### Verdict: READY | NEEDS FIXES | BLOCKED
**Quality score:** <0-100>

### Blocking Issues (Critical + High)
| # | Issue | File:Line | Severity | Fix |
|---|-------|-----------|----------|-----|

### Recommendations (Medium + Low)
| # | Issue | File:Line | Severity | Suggestion |
|---|-------|-----------|----------|------------|
```

Omit an empty table. End with the combined footer from the contract (counts summed across sections and delegated skills):

```
SCORE: <0-100> | {critical:N, high:N, medium:N, low:N} | verdict: <pass|block>
```

`READY` maps to `verdict: pass`. `NEEDS FIXES` and `BLOCKED` map to `verdict: block`.

## Communication

On a team, report: push-readiness verdict, Critical blockers, issue count by category and severity.
