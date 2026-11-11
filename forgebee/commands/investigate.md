---
name: investigate
description: Forensic investigation — produces a structured case file with evidence-graded findings (Confirmed / Deduced / Hypothesized) before any code changes. Hand off to debugger-detective for the fix.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Investigate

## Objective

Take an unexplained symptom (crash log, stack trace, "this used to work"), produce a structured case file another engineer can pick up cold. **Diagnosis only — no fixes.**

## Never

- Never start from a theory — always from one confirmed piece of evidence
- Never delete a hypothesis — mark it refuted and keep it
- Never write a fix during investigation — that's debugger-detective's job
- Never skip the case file — the artifact IS the deliverable

## Delegation

This command follows the `investigate` skill. Read `${CLAUDE_PLUGIN_ROOT}/skills/investigate/SKILL.md` and follow it. Do not call the Skill tool: the name `investigate` resolves to this command. The skill enforces the discipline (stronghold first, evidence grading, never-erase hypotheses) and produces a case file at `docs/planning/investigations/YYYY-MM-DD-<topic>.md`.

**Dispatch:**
1. Parse the user's symptom description and any provided artifacts (logs, stack frames, error text). The reporter's suspected cause is a hypothesis (H-NNN), not a confirmed fact
2. Confirm the stronghold evidence with the user before opening the case file
3. Run the skill process
4. When the skill produces a clear hypothesis ready to test: dispatch `forgebee:debugger-detective` with the case file path for the fix

**Output:** Path to the case file + a one-line summary of the leading hypothesis.

## Pairs with

- **`debugger-detective`** — consumes the case file, executes the fix (with Iron Law: 3 failed fixes → architecture question)
- **`/debug`** — for symptoms where the cause is obvious and you want to skip straight to fix. Use `/investigate` when the cause is unclear.
