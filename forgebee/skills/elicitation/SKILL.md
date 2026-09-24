---
name: elicitation
description: Use after producing a plan or design to stress-test it via a named method (Pre-mortem, Red Team, Inversion, Stakeholder Round Table, etc.) — applies to OUTPUT, not requirements.
version: 1.0.0
---

# Elicitation — Stress-Test Your Own Output

## Objective

After you produce a plan, design, or architecture decision, apply one of 18 named reasoning methods to challenge it. `brainstorming` runs upfront on the idea; debate triads run on agreed requirements; **elicitation runs on your own artifact** mid-flow, for example after an ADR and before it ships. It targets CLAUDE.md P2: agents that do not surface trade-offs or push back.

Adapted from BMAD's bmad-advanced-elicitation skill + methods catalog.

## When this fires

- User invokes `/elicit`, optionally with a method (`/elicit pre-mortem`).
- `/workflow` offers 2-3 methods at the end of Plan and Architect phases.
- You are about to commit to a heavy decision and offer the method library.

## Method Catalog

`methods.csv` holds all 18 methods with descriptions, output patterns, and when-to-use guidance. Read it when you run a method.

| Category | Methods | Best for |
|---|---|---|
| **Inversion** | Pre-mortem, Inversion, Five Whys | Risk surfacing, debugging |
| **Collaboration** | Stakeholder Round Table, Cross-Functional War Room, Mentor and Apprentice, Good Cop Bad Cop | Multi-stakeholder concerns |
| **Competitive** | Red Team vs Blue Team, Shark Tank Pitch, Code Review Gauntlet | Adversarial hardening |
| **Advanced** | Tree of Thoughts, Self-Consistency Validation, Meta-Prompting Analysis | Multi-path reasoning |
| **Temporal** | Time Traveler Council | Long vs short-term trade-offs |
| **Narrative** | Customer Support Theater | UX pain surfacing |
| **Analytical** | Stakeholder Pain Map, Constraint Relaxation, Cost of Delay | Structured analysis |

## Process

### `/elicit` with no args
1. List the 18 methods by category.
2. Recommend 2-3 for the most recent artifact.
3. Let the user pick.

### `/elicit <method-name>`
1. Resolve the method: lowercase + hyphenate the slug and fuzzy-match against the `method_name` column in `methods.csv` (`red-team` → "Red Team vs Blue Team", `shark-tank` → "Shark Tank Pitch", `five-whys` → "Five Whys"). On no match or an ambiguous match, list candidates and ask. Never pick silently.
2. Identify the target: the most recent plan / spec / decision in the conversation.
3. Apply the method per its output pattern.
4. Output findings and concrete actions.

### Auto-offer at workflow phase boundaries
After `/workflow` Plan or Architect:
```
Want to stress-test this before moving on? Try:
- `/elicit pre-mortem` — assume the project failed; what went wrong?
- `/elicit stakeholder-round-table` — gather PM/engineer/security perspectives
- `/elicit red-team` — find the attack surface

Or skip and continue.
```
Skip is the default. Elicitation is a tool, not a gate.

## Output Shape

```markdown
## Elicitation: <Method Name>

**Applied to:** <artifact name + path>

### Findings
- <finding, per the method's output pattern>

### Concrete Actions
- [ ] <change to the artifact / risk to mitigate / question to resolve>

### Verdict
<one line: survives / needs revision / needs discussion>
```

## Method Pairing

**Good pairs:** `pre-mortem` + `red-team` (forward risk + adversarial probe); `stakeholder-round-table` + `inversion`; `five-whys` + `meta-prompting`; `tree-of-thoughts` + `self-consistency-validation`.

**Redundant (pick one):** `pre-mortem` / `inversion`; `red-team` (technical) / `shark-tank` (business); `stakeholder-round-table` / `cross-functional-war-room`.

**Hard limit: 2 methods per artifact.** After 2, the artifact is either ready or needs a rewrite, not more elicitation. Refuse a third: "Two methods applied — third returns diminishing signal. Ship, rework, or re-plan."

## Never

- Never run elicitation without a concrete artifact.
- Never give a finding that does not map to a specific element of the artifact.
- Never use elicitation as a delay. Pick a method, run it fast (~5-10 min), output actions.
- Never exceed 2 methods per artifact.
- Never apply elicitation to requirements. The debate triads handle those.
