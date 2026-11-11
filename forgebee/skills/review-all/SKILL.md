---
name: review-all
description: Use when about to push, open a PR, or asking for a thorough pre-ship review — covers code quality, security, performance, accessibility, docs, and best practices in one pass.
version: 2.0.0
---

# Full Review — Pre-Push Quality Gate

## Objective

Find bugs, security holes, performance issues, and quality problems in the whole change. Every issue is verified, has a `file:line`, and has a fix. Runs inline, so use session context: what was edited, why, and which trade-offs were discussed.

Output: a READY / NEEDS FIXES / BLOCKED verdict, a confidence level, and actionable items.

> Read `${CLAUDE_PLUGIN_ROOT}/skills/_review-finding-contract.md` first. It holds the scope, connected-code, verify, and lane rules, and the finding format. As the aggregator, sum the per-skill footer counts into one combined footer so `/audit-self` can parse the whole pass.

## Inputs (all optional)

- **Range or base** — the diff to review. Default: the contract **Scope** section (merge-base with the base branch, plus the working tree).
- **Spec** — a spec or requirements path. When given, check each acceptance criterion.
- **Previous findings** — on a re-review, the findings of the last round.

## P2 — Senior Engineer Test

Before a `READY` verdict, ask: would a senior engineer call this overcomplicated? If yes, the verdict is `NEEDS FIXES`; list the simplification as `High`. "It works" does not pass overcomplicated code.

## Never

- Never review only the last commit when the branch has more. Use the contract **Scope**.
- Never report a defect the diff does not cause or expose.
- Never report a Critical or High finding you did not verify against the code.
- Never give READY with a Critical or High issue open, or with a failing check.
- Never report style preferences as High.
- Never fix code. Report; the caller owns the fix loop.

## Calibration

Severity words and meanings are in the contract. Only Critical and High block the push. With Critical/High clean and checks passing, say READY even with Medium/Low open. Give Medium/Low one line each.

Project preferences:
- Flag repetition as Medium (DRY matters here).
- "Engineered enough": not fragile, not over-abstracted.
- Explicit over clever.
- Do not suggest refactors unrelated to the change.

## Step 1 — Scope

1. Check session context: files discussed, goal.
2. Resolve the diff per the contract **Scope** section. Read untracked files too.
3. Run `git log --oneline <base>..HEAD`.

## Step 2 — Run the checks

A review that runs nothing is an opinion. Resolve the project's test, lint, type-check, and build commands (`.claude/session-cache/project-triage.json`, else `package.json` scripts, `composer.json`, `phpunit.xml`, `Makefile`) and run them.

- A failing check is a `High` finding, with the failing output.
- No command discoverable → say "no test/lint/build command found" in the report. Do not invent one. Confidence is then at most Medium.
- The caller passed fresh evidence for the same tree (a `verification-enforcer` report) → use it and do not run the checks again.

## Step 3 — Spec check (when a spec is given)

Walk the acceptance criteria one by one. Run or read the verify line of each. An unmet criterion is `High`. Work the spec did not ask for is `Medium` (P1 — Trace Test).

## Step 4 — Inline pass

Work through each section. The model knows the generic checks; these are the ones to not miss.

1. **Code quality** — structure, DRY, error handling at trust boundaries, missing edge cases, over/under-engineering, naming. WHAT-comments / padded docblocks (P7) → Low.
2. **Callers** — each changed signature, hook, return shape, option name, or schema: `rg` its users and confirm they still work.
3. **Performance** — N+1, missing cache, expensive loops, hot-path complexity.
4. **Security** — injection (SQL, XSS, command), unescaped output, missing sanitization, hardcoded secrets, broken auth, CSRF, access control, framework-specific escaping.
5. **Accessibility** (UI changes only) — alt text, ARIA, keyboard, focus, contrast, semantic HTML, WCAG 2.2 AA.
6. **Documentation** (brief) — missing/outdated docblocks on public APIs only where the project standard requires them; undocumented non-obvious logic.
7. **Best practices** — SOLID violations that hurt maintainability, project coding standard, separation of concerns.

## Step 5 — Deep passes (by risk, not by size)

Delegate to the `context: fork` review skills with the Skill tool. Send all of them in one message so they run in parallel. A fork sees no conversation: pass the range and the file list for its area as skill arguments.

**Always, at any diff size, when the diff touches the trigger:**

| Diff touches… | Delegate to |
|---|---|
| auth, sessions, capability checks, secrets, user data, untrusted input reaching output | `review-security` |
| SQL migrations, schema changes, RLS/policies, ORM access | `review-database` |
| new/changed route handlers, REST/GraphQL endpoints, API contracts | `review-api` |
| prompts, tool definitions, LLM calls, model output handling | `review-prompt` |
| WordPress PHP that handles input, output, REST, AJAX, or `$wpdb` | `review-wordpress` |

**Only when the diff is over 300 changed lines** (below that, the inline pass covers it):

| Diff touches… | Delegate to |
|---|---|
| DB-heavy code, hot loops, render paths | `review-performance` |
| new code paths or changed test files (or new code with no tests) | `review-tests` |
| UI components, markup, interaction | `review-accessibility` |
| other WordPress plugin/theme files | `review-wordpress` |

No trigger matches → no delegation. Do not delegate "to be safe": each fork is a fresh session.

## Step 6 — Verify and merge

1. Merge delegated findings with your own. Same `file:line` and same defect → keep one, at the higher severity.
2. Verify every Critical and High, own and delegated, per the contract **Verify before you report**. Open the file. A delegated finding that does not survive is dropped; say so in one line.
3. On a re-review: mark each previous finding `fixed` or `still open`, then check that no fix introduced a new defect.

## For Each Issue

Give `file:line`, severity, and the recommended fix. For Critical/High with a real trade-off, add 1-2 alternatives (including "do nothing" where reasonable) in one line.

## Example

```
[Critical] Auth check missing on a state-changing route
File: src/routes/admin.ts:14
Issue: `POST /admin/users/:id/role` updates roles with no session/permission check; any caller can grant admin.
Fix: Require an authenticated session and `requireRole('admin')` before the handler.

[High] Changed return shape breaks an unchanged caller
File: src/cart/summary.ts:41
Issue: `getTotals()` now returns `{ net, tax }` (`src/cart/totals.ts:12`); this caller still reads `.total` and renders `undefined`.
Fix: Read `net + tax` here, or keep `total` in the return shape.
```

## Confidence

State how sure the verdict is. It is not a second score.

- **High** — checks ran and pass; every acceptance criterion has evidence (when a spec was given); every Critical/High was verified; no `[unverified]` or `[needs tool]` finding is open.
- **Medium** — one of those is missing. Name it.
- **Low** — checks did not run or fail, or the diff has areas you could not read.

## Final Report

Findings tables and verdict only. No prose recap, no praise section.

```markdown
## Review: [Target]

**Range:** <base>..working tree (<N> files, <N> lines)
**Checks:** tests <pass|fail|none> · lint <pass|fail|none> · build <pass|fail|none>

### Verdict: READY | NEEDS FIXES | BLOCKED
**Confidence:** High | Medium | Low — <reason when not High>
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

## Fix loop (owned by the caller)

`review-all` is one pass. `/team` and `/workflow` run the loop: review → fix → review, at most 3 rounds, with the previous findings passed in. Run alone, report and stop.

## Communication

On a team, report: push-readiness verdict, confidence, Critical blockers, issue count by category and severity.
