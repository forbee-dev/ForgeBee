---
name: grill
description: Interview the user about a plan, spec, or design in rounds, one recommended answer per question, until every decision is settled or accepted as a risk
argument-hint: [topic or path to plan/spec]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Grill

## Objective

Settle every decision in a plan before work starts. Output: a resolved decision log that `/plan`, `/workflow`, or `/team` takes as input.

## Never

- Never ask the user for a fact the codebase or tools can answer
- Never ask a question without a recommended answer
- Never write code or plan artifacts — the grill only settles decisions

## Delegation

This command invokes the `grill` skill (`forgebee/skills/grill/SKILL.md`).

- `/grill <topic>` → grill that topic
- `/grill <path>` → read the plan or spec at that path, then grill it
- `/grill` (no args) → grill the most recent plan or request in the conversation; if there is none, ask for the topic

## Output

Decision log at `docs/planning/requirements/YYYY-MM-DD-<feature>.decision-log.md`, in the shape of `forgebee/templates/decision-log-template.md`. Confirmed = settled. Tentative = accepted open risk.

## Pairs with

- `/plan` and `/workflow` — the log is binding input to the Plan phase
- `/elicit` — run after the plan exists, to stress-test the output
