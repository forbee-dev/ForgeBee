---
name: review-docs
description: Use when reviewing changed code or docs for missing or stale docblocks, unexplained complex logic, stale README sections, or padding (over-commenting, preamble, recap).
context: fork
version: 1.1.0
---

Review the changed code and docs for documentation that is missing, wrong, or padded.

> Read `${CLAUDE_PLUGIN_ROOT}/skills/_review-finding-contract.md` first. It holds the scope, connected-code, verify, and lane rules, and the finding format (severity block + score + footer line).

## Scope

Own documentation at and above the API surface: public docblocks, module and README accuracy, unexplained complex logic, stale comments, and doc padding. Naming and logic clarity inside one private function belong to review-code. Do not double-report.

## Use When
- The diff adds public functions, classes, or endpoints.
- A feature change or refactor may leave docs out of date.
- The diff adds business rules or workarounds that need a WHY.
- The diff adds comments or docs that may be padded.

## Steps

1. Resolve the diff per the contract **Scope** section.
2. Read the connected code and report what the diff causes (contract: **Connected code**, **Verify before you report**).
3. Detect the docblock standard: WPCS (`phpcs.xml*` with `WordPress`), ESLint JSDoc rules, Python docstring linters. It decides what is required.

## Method

For each changed public name, option, endpoint, or behavior: `rg` it in the README, `docs/`, and docblocks. A doc that still describes the old behavior is the finding, at the doc's line. This is the check a diff-only read misses.

## Checklist

Missing or wrong:
- Public API without the docblock its project standard requires.
- Comment or doc that no longer matches the code.
- Missing `@param` / `@return` / `@throws` only where the standard requires them or types do not express the contract (units, ranges, side effects).
- Business rule, workaround, magic number, or regex without a one-line WHY.
- Endpoint docs without request/response shape.
- New feature or config option not in the README.

Padded (P7 — Lean Output):
- WHAT-comment that restates the code: Low.
- Docblock that restates the name or the typed signature: Low.
- Prose paragraph where a summary line is enough: Low.
- Changelog, ticket, author, or "added/updated by" note in code: Medium.
- Docs with preamble, recap, "this section describes…", or restated headings: Low. Medium when it hides the one fact the reader needs.

## For Each Issue

1. State the gap with `File:Line`.
2. Severity: Critical / High / Medium / Low (CLAUDE.md P6).
3. Write the fix in the project's doc style: the docblock to add, the shorter line, or "delete". Give one fix, not options.

## Example

```
[High] Public function has no docblock and a hidden unit contract
File: src/billing/proration.ts:8
Issue: `calcProration(amount, daysLeft)`: callers cannot tell if `amount` is cents or dollars.
Fix — add:
  /** Prorated charge in cents, rounded down. `daysLeft`: whole days remaining (0–31). */

[Low] Docblock restates the function name
File: inc/scores.php:12
Issue: "Get User Score. This function gets the score for a user." adds nothing to `get_user_score()`.
Fix: Replace the summary with the rule: "Sum of approved review ratings; pending excluded."
```

End with a one-line coverage summary, then the score and footer line from the shared contract.

## Never
- Flag missing docs on private or internal functions.
- Approve docs that describe behavior the code does not have.
- Ask for a docblock the project standard does not require and the types already cover.

## Communication
On a team, report: gaps found, docs likely to confuse, overall documentation health.
