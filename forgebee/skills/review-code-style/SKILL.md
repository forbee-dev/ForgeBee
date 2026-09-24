---
name: review-code-style
description: Use when checking adherence to project conventions — import order, naming, TypeScript patterns, React idioms, file organization, over-commenting. Not formatting (use a linter).
context: fork
version: 1.1.0
---

Review changed code for consistency with the project's own conventions. Focus on patterns that affect maintainability.

> Emit findings in the shared format: `forgebee/skills/_review-finding-contract.md` (severity block + score + footer line).

## Use When
- Changed code needs a convention check: import order, naming, type patterns, comments.
- Linting passes, but the team wants a consistency check that tools do not catch.

## Steps

1. Run the project linter and type checker on affected files (`npm run lint`, `composer lint`, `tsc --noEmit`). Report results.
2. Detect the stack: read `package.json`, `tsconfig.json`, `.eslintrc*`, `composer.json`, `pyproject.toml`, `go.mod`.
3. Read 2–3 existing files near the diff to learn the project's own conventions.
4. The checks below assume TypeScript/React. For another stack, apply the analogous rule and skip the rest. Do not flag a TS/React idiom in a non-TS/React project.

## Convention Checks

### Imports
- Cross-directory imports use the configured path alias, not deep relative paths.
- Order: framework, third-party, internal, types.
- Framework directives (`'use client'`) at the top of the file.

### Types
- No untyped `any`. Use a real type or `unknown` with a guard.
- `interface` for object shapes, `type` for unions.
- Database entities use generated or shared types, not hand-rolled interfaces.
- Exported functions declare return types.

### Naming
- Files, components, functions, constants, and DB columns follow the casing the project already uses.
- Booleans start with `is`, `has`, `should`, or `can`.

### Framework Patterns
- Server components by default where the framework supports them.
- React hook dependency arrays are complete.

### Organization
- Functions over ~50 lines or components over ~200 lines: suggest extraction.
- No commented-out code, unused imports, or unreachable branches.

### Comments (P7 — Lean Output)
- **WHAT-comment** that restates the next line (`// increment counter` above `count++`): Low.
- **Docblock that restates the name or types** (`@param {string} name - The name` on a typed param, "This function gets the user"): Low. Medium when repeated across the diff.
- **Changelog, ticket, author, or "added/updated by" notes in code**: Medium. Git keeps history.
- **Prose docblock paragraphs** where the standard asks only for a summary line and typed tags: Low.
- Do not flag docblocks that the project linter requires (WPCS file/class/function docblocks). Flag only the padding inside them.
- The fix is always deletion or a shorter line. Write the replacement.

## Output Format

Four contract lines plus `Convention:`:
```
[Critical|High|Medium|Low] <title>
File: <path>:<line>
Issue: <what is wrong, concretely>
Fix: <specific change>
Convention: <which project convention is violated>
```

Most style findings are Medium or Low. Use Critical or High only for real correctness or security risk, so a pure style pass rarely blocks.

## Example

```
[High] `any` masks an unchecked external response shape
File: src/api/client.ts:18
Issue: `const data: any = await res.json()` then reads `data.user.id`. A malformed response passes type checks and crashes at runtime.
Fix: Type the response and narrow with a guard, or parse with the project's schema validator.
Convention: no `any` on external boundaries.

[Low] Docblock restates typed params
File: src/lib/price.ts:3
Issue: `@param {number} amount - The amount` repeats the TypeScript signature.
Fix: Delete the docblock, or keep one line for the rounding rule.
Convention: P7 — JSDoc only for what types do not say.
```

End with a one-line consistency summary, then the score and footer line from the shared contract.

## Never
- Enforce a rule that contradicts the project's existing conventions.
- Flag style issues in unchanged code.
- Rank style above correctness.

## Communication
On a team, report: violations found, cross-file patterns, overall style health.
