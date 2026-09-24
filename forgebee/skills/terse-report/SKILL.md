---
name: terse-report
description: Use when reporting to an orchestrator (/workflow, /team), not the user — emit telegraphic format keeping code/citations exact, dropping prose filler. Cuts ~65% of report tokens.
version: 1.1.0
---

# Terse-Report Mode

## Objective

Compress reports that go to an orchestrator, not a human. Orchestrators read status, changes, verification, scope, and concerns. Prose between those wastes context. The same rules apply when `/learn` compresses memory files.

## When this fires

- Fires only when the handoff contract sets `responseStyle: "orchestrator"`. `/workflow` and `/team` set it on every dispatch.
- If `responseStyle` is absent or has another value, write normal human-readable output.

## Rules

Drop:
- Articles, filler (`just`, `really`, `basically`, `actually`, `simply`), hedging, pleasantries.
- Self-narration (`I noticed that`, `I went ahead and`) and tool-call narration (`Now I will read…`).
- Recap of the task, and any closing summary.

Keep exact:
- Code, file paths, line refs (`src/api.ts:42`), URLs, commit hashes, config keys, env vars.
- Error text and command output. Quote the shortest line that decides the issue, not the full log.
- Numbers and units.
- Negations: `not`, `never`, `no`, `only`, `except`. Dropping one flips the meaning.

Write:
- Bullets, one line per item. Fragments are OK.
- Full words. No invented abbreviations (`cfg`, `impl`, `fn`) and no arrows (`→`). They save no tokens and cost clarity. Standard acronyms (API, DB, HTTP) are OK.

Auto-clarity: write full sentences for security findings and irreversible actions (data loss, force push, migrations). Then go back to terse.

## Output Shape

```
Status: <DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT>

## Changes
- <file:line>: <one-line description>

## Verification
- <test/check>: <result>

## Scope-Delta
- none
  OR
- <out-of-scope item left alone: file:line and reason>
- <scope expansion beyond the ask: what and why>

## Concerns (only if DONE_WITH_CONCERNS)
- <concern>

## Self-Review
- <check>: <pass/finding>
```

Orchestrators reject a report without `Scope-Delta`. Write the literal `none` when nothing was out of scope. `Concerns` holds quality caveats, not scope.

## Example

Verbose: "I've completed the implementation of the user export endpoint as specified. I also added comprehensive error handling for edge cases such as empty result sets and database timeouts. All 14 tests pass, including 5 new ones…"

Terse:
```
Status: DONE
## Changes
- src/api/users/export.ts: new endpoint, date-range filter; empty result and DB timeout handled
## Verification
- npm test: 14/14 pass (5 new)
## Scope-Delta
- src/lib/pagination.ts: refactor candidate, left alone (out of scope)
## Self-Review
- no N+1, no secrets, input validated
```

## Never

- Compress when `responseStyle` is not `orchestrator`.
- Omit the `Status:` line. Orchestrators parse it.
- Omit `Scope-Delta`.
- Change code, citations, or error text.
