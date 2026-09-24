---
name: investigate
description: Use when handed a crash log, stack trace, or "this used to work" report — produces a forensic case file with evidence grading before code changes. Complements debugger-detective.
version: 1.1.0
---

# Investigate

## Objective

Turn an unexplained symptom into a structured case file another engineer can pick up cold. **Diagnosis only, no fixes.** Hand the case file to `debugger-detective` for the fix.

Adapted from BMAD's bmad-investigate. It is separate from `/debug` because blending evidence, reasoning, and code changes causes two failures: **narrative lock-in** (the first plausible story bends every observation) and **evidence amnesia** (a ruled-out path is not written down and gets traced again). This skill completes the evidence step before any fix starts.

## Discipline

### 1. Stronghold First
Start from **one piece of confirmed evidence**, never from a theory: exact error text, a stack frame, or a timestamped log line. With no stronghold, stop and ask the user for one.

### 2. Evidence Grading
- **Confirmed** — directly observed in logs, code, or dumps. Cite `path:line`, log timestamp, or commit hash.
- **Deduced** — follows from confirmed evidence. Show the reasoning chain, so a wrong step is visible.
- **Hypothesized** — plausible, unconfirmed. State what would confirm and what would refute it.

### 3. Keep Refuted Hypotheses
Mark a wrong theory `Refuted by F-NNN` and keep it in the file. Future investigators then skip the dead end.

## Output: Case File

Write to `docs/planning/investigations/YYYY-MM-DD-<topic>.md` from the template `forgebee/templates/investigation-case-file.md`. IDs: `F-NNN` confirmed, `D-NNN` deduced, `H-NNN` hypothesized; a refuted entry reads `H-002 [REFUTED YYYY-MM-DD by F-003]`.

## Process

1. Quote the symptom back verbatim.
2. Establish the stronghold.
3. Open the case file from the template.
4. Gather confirmed findings from logs, code, and git history, each with a citation.
5. Build deductions; each names the findings it rests on.
6. List 2–5 hypotheses with confirm/refute conditions.
7. Pick the next observation that best confirms or refutes the strongest hypothesis. An observation, not a fix.
8. Update the file as results come back. Promote H-NNN to F-NNN when confirmed; mark refuted ones, never delete.
9. When a hypothesis is confirmed with a clear fix, hand the case file to `debugger-detective`.

## Stopping Rule

Stop as soon as one holds:

- **Converged:** a Confirmed finding fully explains the stronghold symptom and the fix is obvious → hand off to `debugger-detective`.
- **All refuted:** every H-NNN is REFUTED and nothing suggests a new one → report the dead ends and ask for a fresh stronghold. Do not invent a sixth hypothesis.
- **Diminishing returns:** the last 2 observations added no Confirmed/Deduced finding and moved no hypothesis → report current state and the single most useful observation left.
- **Out of scope:** the cause is confirmed in a system you cannot observe (third-party service, infra without access) → escalate with the case file; mark the boundary finding Confirmed.

Do not gather evidence past convergence "to be thorough" (a P3 violation). The case file is the deliverable. If no stopping condition is met after a reasonable pass, say so; do not loop.

## Never

- Never start from a theory. Start from one confirmed piece of evidence.
- Never delete a hypothesis. Mark it refuted.
- Never write a fix during investigation.
- Never grade a finding above its evidence: Confirmed needs a citation, Deduced needs a chain.
- Never skip the case file. Chat summaries are not authoritative.
- Never hand off to `debugger-detective` without a testable hypothesis.
