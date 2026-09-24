---
name: grill
description: Use when a plan, spec, or design must be interviewed before work starts, or the user says "grill me". Walks the decision tree in rounds with a recommended answer per question.
version: 1.0.0
---

# Grill — Interview the Plan Before You Build

## Objective

Interview the user about a plan until every decision in it is settled or accepted as an open risk. Each question carries a recommended answer. The output is a resolved decision log that `/plan`, `/workflow`, or `/team` takes as input.

## How this differs

- `brainstorming` turns an idea into a written design spec. `grill` settles the decisions inside a plan or spec; it writes no spec.
- `surface-ambiguity` is one silent-pick check, made by the agent alone, mid-task. `grill` is a user interview, before work starts.
- `elicitation` stress-tests a finished artifact through a named method. `grill` runs earlier and asks the user; it does not critique.

## When this fires

- The user runs `/grill [topic]` or says "grill me", "interview me on this".
- `/workflow` Grill phase (on by default for an ambiguous spec or auth/payments/data).
- `/team` Step 2 (Medium/Large tier or ambiguous task, max 2 rounds).

## The decision tree

Map the plan as a tree. Each decision branches into the decisions that depend on it. Visit every branch. A flat checklist misses the branches that only appear after an answer.

## Rounds

The **frontier** is every open decision whose prerequisites are settled. You can ask it now without guessing.

1. Ask the whole frontier in one round. Number the questions.
2. Stop and wait for the answers.
3. Update the tree. Settled decisions unblock their children. Recompute the frontier.
4. If question B depends on open question A in the same round, move B to a later round.

Keep a round to 7 questions or fewer. If the frontier is larger, ask the highest-impact ones first: irreversible, security, data, then cost.

## Question format

When the harness has `AskUserQuestion`, use it: one question per decision, your recommendation as the first option with "(Recommended)" in its label.

Otherwise use this text format:

```
**Q1 — <short title>**
<the question; options if there are any>
Recommended: <answer> — <one-line reason>
```

The user can answer "Q1 yes, Q3 B" or "accept all recommendations".

## Facts are yours, decisions are theirs

- A question that the codebase, docs, or tools can answer is a fact. Look it up with read-only checks. Do not ask the user.
- For a slow lookup, dispatch `deep-researcher` or an Explore agent. Only the questions downstream of that lookup wait. Ask the rest of the frontier now.
- If the evidence contradicts what the user said, show both and ask which one is right.
- A choice between valid options is a decision. Put it to the user and wait. Do not pick for them.

## Decision log

Record each answer as a D-NNN entry in the shape of `forgebee/templates/decision-log-template.md`, phase `grill`:

- Settled → `Status: Confirmed`.
- Accepted open risk → `Status: Tentative`, and put the risk in `Why:`.

Location: `docs/planning/requirements/YYYY-MM-DD-<feature>.decision-log.md` (the file `/workflow` and `/plan` read). If it exists, append and treat its Confirmed entries as settled. Do not ask them again.

After each round, show one line per open decision and what blocks it.

## Stop condition

Stop only when the frontier is empty: each branch settled, or accepted by the user as an open risk. A round cap from the caller (for example `/team`) also stops the grill; list the unvisited branches as Tentative.

Then show the final log and ask the user to confirm shared understanding. Take no implementation action before that confirmation.

## Never

- Never ask the user for a fact you can look up.
- Never ask a question whose answer depends on another open question in the same round.
- Never ask a question without a recommended answer.
- Never re-ask a Confirmed decision from the log.
- Never start implementation while the frontier has open decisions that the user has not accepted as risks.
