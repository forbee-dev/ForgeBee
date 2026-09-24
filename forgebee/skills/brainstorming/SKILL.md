---
name: brainstorming
description: Use when invoking /workflow --strict or asking to "brainstorm/design before building" — turns an idea into a written, approved design spec before any implementation.
version: 1.0.0
---

# Brainstorming — Idea to Design Spec (Opt-In)

## Objective

Turn a feature idea into a written, approved design spec at `docs/planning/specs/YYYY-MM-DD-<topic>-design.md` before any implementation skill (`/workflow`, `/team`, code generation) proceeds.

## P3 — YAGNI Timing

The design solves today's problem simply. Reject options that add abstraction for hypothetical needs, configurability nobody asked for, or error handling for impossible cases. Default to the minimum spec that solves the request.

## When this fires

Opt-in only:
1. User runs `/workflow --strict`.
2. User asks to "brainstorm before building", "design first", or similar.

`/plan` does not invoke this skill. Brainstorming hands off to `/plan` after approval. Default `/workflow` and `/team` flows skip this gate. Strict mode is for multi-system integrations, new product surfaces, and architecture-touching features, where unexamined assumptions waste the most work.

## Hard Gate (when invoked)

<HARD-GATE>
Do not invoke an implementation skill, write code, scaffold a project, or take any implementation action until:
1. You presented a design.
2. The user approved it.
3. The design is written to `docs/planning/specs/YYYY-MM-DD-<topic>-design.md`.
4. The file is committed (or staged, if the user prefers one commit at the end).

This applies to every change, however simple. A simple project gets a short design, but the design exists on disk and is approved.
</HARD-GATE>

If you think the change is too simple for a spec, ask the user to confirm. Do not skip the gate silently.

## Checklist

Track as tasks, in order:

1. **Explore context** — relevant files, recent commits, existing patterns.
2. **Decompose** — if the request spans independent subsystems (chat + billing + analytics), say so first. Help the user pick one; each gets its own spec → plan → execute cycle.
3. **Ask clarifying questions, one at a time** — purpose, constraints, success criteria, edge cases, non-goals. Prefer multiple choice.
4. **Propose 2–3 approaches** with trade-offs and a recommendation.
5. **Present the design section by section** and get approval per section.
6. **Write the spec** to `docs/planning/specs/YYYY-MM-DD-<topic>-design.md`.
7. **Self-review** against the checklist below.
8. **Ask the user to read the written spec.**
9. **Hand off** to `/plan`, `/workflow`, or `/team`.

## Spec Template

```markdown
# <Topic> Design Spec

**Date:** YYYY-MM-DD
**Status:** Draft | Approved | Implemented
**Owner:** <name>

## Problem
<1-2 paragraphs: what is broken, missing, or wanted>

## Non-Goals
<what this does not do>

## Approach
<chosen approach and why it beat the alternatives>

## Architecture
<components, data flow, contracts>

## Open Questions
<to resolve before/during implementation>

## Out of Scope (deferred)
<adjacent future work>

## Acceptance
<concrete signals that "done" is reached>
```

## Self-Review Checklist

- [ ] No `TODO`, `TBD`, or `<placeholder>` left.
- [ ] No two sections contradict each other.
- [ ] Every "we will" has a concrete shape.
- [ ] The doc describes one thing, not three stapled together.
- [ ] Acceptance criteria are testable ("works well" is not).

## Handoff

After approval and commit:
1. Stop brainstorming. Do not re-open decisions.
2. Invoke `/plan` (or `/workflow` if the user asked for the full pipeline) with the spec path.
3. Downstream skills treat the spec as authoritative. Disagreements start a new conversation, not a silent scope change.

The gate is opt-in because most changes do not need a design phase and only the user knows which do. To propose making it default, raise a `/learn` candidate.

## Never

- Never start coding before the spec is on disk and approved.
- Never argue with strict mode. The user opted in for a reason.
- Never write the spec without the user-approval step.
- Never present a list of files to create as a "design".
