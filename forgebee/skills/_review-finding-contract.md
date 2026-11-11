# Review Finding Contract (shared)

> Canonical rules and output format for every `review-*` skill. `review-all` and `/audit-self` read it to aggregate findings across domains. Findings are concrete, verified, severity-tagged, and machine-parseable.

## Scope (which diff)

Review the whole change, not the last commit.

1. The caller gave a range, a base, or a file list → use it. A forked skill sees no conversation; the skill arguments carry it.
2. Else resolve the base branch and diff the working tree against it:
   ```bash
   BASE=$(git merge-base HEAD "$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo main)")
   git diff "$BASE"          # commits on the branch + staged + unstaged
   git status --porcelain    # untracked files are part of the change: read them
   ```
3. Empty (work is on the base branch, tree clean) → `git diff HEAD~1`.

State the range you reviewed in the first line of the report.

## Connected code

A diff shows what changed, not what it breaks. For each changed function, hook, route, schema, or exported name, read its callers and the code it calls (`rg` the name, scoped). Report an issue when the diff **causes or exposes** it, also when the broken line is in an unchanged file: cite that line and name the changed line that breaks it. Do not report old defects the diff does not touch.

## Verify before you report

A finding is a claim. Before you report a Critical or High finding, try to disprove it: read the full code path, look for a guard upstream, a framework default, a test that covers it. Report it only when it survives. A finding you could not confirm from the code gets `[unverified]` at the start of its title, is at most Medium, and names the check that would confirm it. Never invent a finding to seem rigorous; a clean result is a valid result.

## What counts as a finding

A finding names a concrete failure or cost: an input that breaks it, a caller that fails, a user who is blocked, a query that repeats. "Could be cleaner" with no cost is not a finding. A preference the project's own code does not follow is not a finding. `/team` and `/workflow` fix every finding at every severity, so each weak one costs a fix round.

## Lanes (no double report)

Each defect has one owner. Outside your lane, report only Critical or High.

| Lane | Owner |
|------|-------|
| Logic, error handling, dead code, single-function over-engineering | `review-code` |
| Cross-file architecture, module boundaries, coupling | `review-best-practices` |
| Naming, imports, type and framework conventions | `review-code-style` |
| Comments, docblocks, README, doc padding (P7) | `review-docs` |
| Injection, auth, secrets, access control | `review-security` (`review-wordpress` on WP code, `review-prompt` on LLM code) |
| N+1, caching, hot paths | `review-performance` (`review-database` for schema and migrations) |

## Severity (CLAUDE.md P6 — the only allowed vocabulary)

| Severity | Blocks merge? | Meaning |
|----------|--------------|---------|
| **Critical** | YES | Ship-stopper: data loss, secret exposure, auth bypass, injection, corruption. |
| **High** | YES | Fix before next sprint: missing error handling at a trust boundary, N+1 on a hot path, XSS, broken access control. |
| **Medium** | No | Fix when convenient: DRY violations, missing edge cases, unclear naming. |
| **Low** | No | Nice-to-have: WHAT-comments, padded or missing required docblocks, minor style, optional optimizations. |

Use only these four words. Alternates (Warning, Suggestion, Info, Nit) break cross-skill aggregation.

## Finding block

```
[Critical|High|Medium|Low] <one-line title>
File: <path>:<line>
Issue: <what is wrong, concretely>
Fix: <specific remediation>
```

A domain skill may add one extra labeled line (for example `WCAG:`, `CWE:`, `Route:`, `Data risk:`) but keeps the four lines above.

## Quality score (0-100)

Score the reviewed diff, not the whole codebase. Start at 100 and deduct:

- Each **Critical**: −25
- Each **High**: −10
- Each **Medium**: −3
- Each **Low**: −1

Floor at 0. A diff with any open Critical or High scores at most 74 and gets `verdict: block`. Clean of Critical/High → `verdict: pass` (Medium/Low are recommendations, not blockers).

## Machine-parseable footer (required, last line of every review)

Emit this exact line so `review-all` and `/audit-self` can aggregate:

```
SCORE: <0-100> | {critical:N, high:N, medium:N, low:N} | verdict: <pass|block>
```

Example: `SCORE: 62 | {critical:0, high:3, medium:2, low:4} | verdict: block`
