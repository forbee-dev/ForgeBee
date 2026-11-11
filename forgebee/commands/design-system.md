---
name: design-system
description: Design system operations — audit a Figma component page against code, onboard a newly built component, or audit token drift
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Skill
---

# Design System Command

## Context

$ARGUMENTS

## Objective

Route a design-system request to the surface that owns it, then hold the result to the code-first law. This command decides *which* workflow applies and dispatches. It does not carry the method itself — `figma-code-sync` does.

## Never

- Never change production code to match a design. The design is derived from the code, not the reverse
- Never run an audit and an onboarding pass in the same batch — onboarding ends *with* an audit of its own page
- Never fan out concurrent writers onto one audit markdown file
- Never proceed past a missing project-level design-system skill without saying it is missing

## Modes

Parse the first argument. When it is absent, infer from the request and state the mode you chose.

| Invocation | Mode | Route |
|---|---|---|
| `/design-system audit <page or component>` | Reconcile one existing page against source | `figma-code-sync` skill, Part A |
| `/design-system onboard <block or component>` | Bring a newly built component into the system | `figma-code-sync` skill, Part B |
| `/design-system tokens` | Token drift and layer-ownership audit | `wp-design-system` agent |
| `/design-system` with no mode | Ask which of the three, or infer and say so | — |

## Process

**1. Load context in this order.** Stop and report if step 1a is missing rather than improvising a file key.

- **1a. The project's own design-system skill** — check `.claude/skills/` for a project skill naming the Figma file key, page inventory, and token spec paths. It outranks everything below.
- **1b. `figma-code-sync`** — the portable method. Always load for audit and onboard modes.
- **1c. `figma-use`** — mandatory prerequisite before any `use_figma` call.
- **1d. The token spec** (`tokens.json` / `tokens.md`) if the project has one. It outranks grep.

**2. Confirm the target and the direction.** Name the page or component, the production source you will read, and restate: code is authoritative, fixes land in Figma.

**3. Dispatch.**

- **Audit** — run Part A: production reference → source (plus neighbours) → programmatic node dump → value-by-value diff → fix deviations only → verify → record. Run the free checks first; they need no source access.
- **Onboard** — run Part B, then Part A against the new page. Transcription errors surface only in that second pass.
- **Tokens** — dispatch `forgebee:wp-design-system` for layer ownership, the `theme.json`-versus-SCSS collision check, unused-token census, and hardcoded values bypassing presets.

**4. On a WordPress project, resolve layer ownership before changing any type, colour, or spacing value.** Core blocks take `theme.json` presets; custom blocks take their own stylesheet. Dispatch `forgebee:wp-design-system` when this is in doubt — a value fixed in the wrong layer looks correct and is not.

**5. Record.** Repo audit file carries the full detail with `file:line` per claim. The Figma doc note gets a status line under ~400 characters pointing at that file. One writer per file.

## Parallelism

Audits parallelise across **pages**, never across writers of one file.

- One agent per page range, each with its own audit file named for its range
- Merge into a single file at the end, by a single writer, after all writes have stopped
- Escalate anything touching a shared master or a global token instead of fixing it inside a page pass — concurrent edits to a shared component are how one page's fix breaks another's

## Output Format

```
## Design System: <mode> — <target>

**Source of truth:** <file:line refs read>
**Direction:** code → Figma

### Fixed
- <property>: <old> → <new>  (<file:line>)

### Verified correct
- <what was checked and matched>

### Deliberate non-changes
- <what, and why it stays>

### Unverified
- <value>, searched: <spellings/paths tried>

### Escalations
- <globals, shared masters, source bugs>

**Record:** <path to repo audit file>
```

## Rules

- Every changed value cites a line of source. A value that cannot be traced is flagged unverified, never guessed
- Deviations only — leave correct values alone, and list them as verified so the reader knows they were checked
- Absence is a strong claim: at least three grep spellings, vendored trees excluded, before declaring a value missing
- Recording an unresolved conflict is a correct outcome; resolving it unilaterally is not
- Report `DONE_WITH_CONCERNS`, not `DONE`, when any value went unverified or any conflict stayed open
