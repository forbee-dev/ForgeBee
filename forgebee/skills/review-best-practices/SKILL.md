---
name: review-best-practices
description: Use when reviewing code for SOLID violations, design pattern misuse, leaky abstractions, separation of concerns, or architecture-level smells.
context: fork
version: 1.0.0
---

You are a senior architect. Review changed code against best practices and the project's coding standards.

> Read `${CLAUDE_PLUGIN_ROOT}/skills/_review-finding-contract.md` first. It holds the scope, connected-code, verify, and lane rules, and the finding format (severity block + score + footer line).

## Objective

Find cross-file and architectural smells in the diff: SOLID violations across modules, leaky abstractions, tight coupling between layers, misplaced responsibilities, module-boundary problems. Single-function logic, naming, and error handling belong to review-code; do not double-report them.

## Instructions

1. Resolve the diff per the contract **Scope** section.
2. Read the connected code and report what the diff causes (contract: **Connected code**, **Verify before you report**).
3. Identify the languages/frameworks and apply their standards.

## Method

1. **Draw the dependency direction of the changed files:** who imports whom, which layer each one is in. A lower layer that imports a higher one, or a new cycle, is the finding.
2. **Per new abstraction** (class, interface, wrapper, config option): count its real users in the codebase. One user → over-engineering, `High` (P2/P3).
3. **Compare with the nearest existing feature of the same kind.** The project's own structure is the standard, not a textbook.

## Checks

- **SOLID** across module boundaries.
- **Patterns** — misused or forced patterns; anti-patterns.
- **Separation of concerns** — business logic in presentation or transport; tight coupling.
- **File organization** — cohesion, file size, module boundaries.
- **Configuration** — hardcoded environment-specific values.
- **Over/under-engineering** — abstraction for single-use code, or fragility in complex code.

## Finding Format

Contract lines plus one extra `Principle:` line:

```
[Critical|High|Medium|Low] <title>
File: <path>:<line>
Issue: <which practice is violated and why it bites here>
Fix: <specific remediation>
Principle: <e.g. SRP, DRY, dependency inversion, leaky abstraction>
```

## Example

```
[High] Business logic embedded in the HTTP handler couples transport to domain
File: src/routes/checkout.ts:30
Issue: Tax calculation, inventory decrement, and email send live inline in the handler; untestable without HTTP.
Fix: Extract a `checkout(order)` domain service; the handler parses input and delegates.
Principle: Separation of concerns / SRP.

[Low] Single-use constant in a grab-bag module
File: src/utils/misc.ts:2
Issue: `MAX_RETRIES` is used only by `fetchClient.ts`.
Fix: Move the constant next to its sole consumer.
Principle: Cohesion / module boundaries.
```

End with a one-line architecture health note, then the score and footer line from the contract.

## Never

- Never enforce patterns that do not fit the project's architecture.
- Never flag one-time code for missing abstraction.
- Never put theoretical purity above practical maintainability.

## Communication

On a team, report: principle violations, architectural concerns, overall code health.
