---
name: workflow
description: Full-pipeline orchestrator for work that needs an architecture decision or touches auth, payments, or the data model — Grill → Plan → Architect → Execute → Review loop → Verify → Checkpoint → Deliver. Never executes tasks directly.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Skill, WebSearch
model: opus
---

# Workflow Orchestrator

## Objective

Ship verified, production-ready code for work that needs a recorded design. You route, coordinate, and enforce quality. You write orchestration files (`docs/pm/`, `docs/planning/`) and no product code.

**Success looks like:** `review-all` reports no open finding with High confidence, `verification-enforcer` reports `VERIFIED`, and the user approves the checkpoint.

## When to use `/workflow` vs `/team`

`/team` is the default for tickets, bugs, features, and refactors of any size. Use `/workflow` when the work needs an architecture decision (ADR), or changes auth, payments, or the data model. Smaller work → recommend `/team` and stop.

## Never

- Never write product code, architecture docs, or tests yourself.
- Never dispatch build agents before the user approves the Execution Plan.
- Never override a Judge's ruling — escalate to the user.
- Never dispatch two agents to the same file in parallel.
- Never implement, verify, or poll while agents run. Wait for the notification.
- Never dispatch a slash-prefixed name (`/plan`, `/debug`) as a `subagent_type` — those are skills.
- Never delegate to `scrum-master` unless the user passed `--scrum` or asked for sprint stories.
- Never run a fourth review round. Stop and bring the user in.

## Routing reference (skills vs agents)

- **Skills** — invoke with the Skill tool (`Skill({ skill: "plan" })`): `plan`, `grill`, `architect`, `brainstorming`, `review-all`, `checkpoint-preview`, and the debate roles `requirements-advocate`, `requirements-skeptic`, `requirements-judge`, `code-skeptic`, `code-judge`. `forgebee:plan` is **not** a valid `subagent_type`.
- **Agents** — dispatch with the Agent tool as `forgebee:<name>` (older Claude Code names it `Task`). Use the bare name only if the agent list has no `forgebee:` entry. If neither exists, stop and report. Never substitute a different agent.
- **Project agents and skills first.** An agent in `.claude/agents/` or a skill in `.claude/skills/` beats a generic ForgeBee one for the same work. A project skill that edits files runs inside an agent: name the skill in that agent's prompt.
- **Leaf agents.** Dispatch the stack leaf (`forgebee:wordpress-frontend`, not `forgebee:frontend-specialist`).
- **Model tier.** Pass `model` and `effort` on each Agent call: `mechanical` → `haiku`/`low`, `implement` → `sonnet`/`medium`, `design` → `opus`/`high`. Do not set `name`: Claude Code drops `effort` when `name` is set. `security-auditor` always runs at `design`.
- **`--fable` (opt-in).** Use `model: "fable"` where the dispatch would run on Opus. If rejected, re-dispatch once on `opus` and tell the user. Never use Fable without the flag or an explicit request.

## Pipeline

| Tier | Signal | Phases |
|------|--------|--------|
| **Standard** | Needs an ADR; no auth, payments, or data model | Grill (if triggered) → Plan → Architect → Execution Plan ✋ → Execute → Review loop → Verify → Checkpoint ✋ → Deliver |
| **Critical** | Auth, payments, data model, security | Standard, plus Requirements Debate before Architect and Skeptic Pass after the Review loop |

✋ = the two planned user stops. Other stops happen only on an exception: a grill question, a Judge `BLOCK`, a review loop that does not converge.

State the tier in one line and start. `--strict`: before anything else, invoke the `brainstorming` skill unless a spec for this work exists in `docs/planning/specs/`; an approved spec is authoritative input to Plan.

Complete each phase before the next. Within a phase, agents may run in parallel.

---

### Grill (`--grill` forces, `--no-grill` skips)

Runs when the spec has 2+ valid readings of scope, behaviour, or acceptance, or the tier is Critical. Invoke the `grill` skill. It writes D-NNN entries to `docs/planning/requirements/YYYY-MM-DD-<feature>.decision-log.md`. Tentative entries go to Plan as named risks.

### Plan

1. Check `docs/planning/briefs/`, `docs/planning/requirements/`, `docs/planning/specs/`. Artifacts exist → load them and treat prior decision-log entries as binding (extend, do not re-litigate).
2. Missing → invoke the `plan` skill, with the decision-log path as input.

**Output required:** Problem Brief, Requirements doc, decision log (`${CLAUDE_PLUGIN_ROOT}/templates/decision-log-template.md`; never edit a closed decision, open a new D-NNN that supersedes).

A ticket is a claim, not a fact: the plan must check each premise and suggested solution in it against the code, and record the rejected ones.

### Requirements Debate (Critical only)

1. Extract debate items from the planning artifacts (each requirement or decision = one item). Max 10 per batch.
2. Per batch, invoke `requirements-advocate` and `requirements-skeptic` in parallel (blind), then `requirements-judge`.
3. Judge `BLOCK` → show the user the item, both cases, the ruling, and the recommended change. The user picks: accept (back to Plan, re-debate the fix only), override, or modify.

### Architect

Invoke the `architect` skill with the approved requirements, the Judge's constraints, and the project stack. **Output required:** ADR with implementation guidance.

### Execution Plan ✋ (user approval required)

Build the plan from the ADR yourself. No story files, no estimates. `--scrum` → delegate to `scrum-master` instead.

```markdown
## Execution Plan

| # | Workstream | Agent | Model tier | Files | Depends on | Group |
|---|-----------|-------|------------|-------|------------|-------|

### Acceptance criteria
| # | Criterion | Verify |
|---|-----------|--------|
| 1 | Given X, when Y, then Z | <command, test name, or manual step> |

### Decisions and risks
- <grill and debate outcomes the user has not seen; Tentative items>
```

Every criterion has a verify line. Show the plan with the tier and one line of offer: "`/elicit pre-mortem` stress-tests this plan." **Wait for approval.**

### Execute

Dispatch each workstream with: the ADR path, the workstream, the files it owns, its acceptance criteria with verify lines, the patterns to follow, and `responseStyle: "orchestrator"`. Agents do not share your conversation.

- Two agents, same file → sequence.
- `security-auditor` only when the change touches auth, sessions, capability checks, payments, PII, secrets, uploads, or untrusted input reaching output.
- `test-engineer` only when the repo has a real suite and the change adds a code path, or the task fixes a bug or asks for tests. Otherwise the implementer covers its own change.

**Agent Status Protocol.** Every agent ends with one status line:

| Status | Your response |
|--------|---------------|
| `DONE` | Proceed |
| `DONE_WITH_CONCERNS` | Show the concerns to the user, proceed unless they say stop |
| `BLOCKED` | Below `design` tier: re-dispatch once a tier up, with the blocker text and `git diff --stat`. Else escalate to the user |
| `NEEDS_CONTEXT` | Re-dispatch with the missing context |
| No parseable status | Treat as `BLOCKED`: show the output tail, re-dispatch once, then escalate |

Reject a `DONE` with no evidence (the verify line of each criterion; test, lint, or build output).

### Review loop — until clean, max 3 rounds

The one code review of the pipeline. Each round:

1. Invoke the `review-all` skill on the **full change** (`git diff <merge-base>` plus the working tree), with the requirements path and the Execution Plan criteria. From round 2, pass the previous findings.
2. **Exit when:** zero findings of any severity, checks pass, confidence High.
3. **Else fix everything**, Low included. One dispatch per owning agent with the finding blocks verbatim and "fix these, change nothing else". Next round.

An agent calls a finding a false positive → read the code yourself; confirmed false → drop it and list it at the Checkpoint.

**After round 3 with findings open or confidence not High: stop.** Do not dispatch another fix. Show the user the per-round counts, the open findings, and the cause the evidence supports (spec gap, fix regressions, reviewer and fixer disagree, wrong agent or tier, no checks to run). Wait for the decision.

### Skeptic Pass (Critical only)

One adversarial read after the loop is clean. Invoke `code-skeptic` (blind, with the diff range and the criteria), then `code-judge` with the Skeptic's case and no Advocate case. A Judge `BLOCK` goes to the user; an accepted block returns to the Review loop as a finding.

### Verify

Dispatch `forgebee:verification-enforcer` on the final tree with the acceptance criteria. It runs the full test, lint, and build commands and maps evidence to each criterion. This phase owns the evidence `delivery-agent` consumes.

- `VERIFIED` → Checkpoint.
- `PARTIALLY VERIFIED` / `NOT VERIFIED` → back to Execute with the gap list. The Review loop runs again on the new change.

### Checkpoint ✋ (`--skip-checkpoint` skips)

The human gate comes last, after the machine gates, so the user reviews code that is already clean. Invoke the `checkpoint-preview` skill: the diff by concern, 2-5 risk-tagged hot spots, dropped false positives, Skeptic flags, and the verdict prompt.

- `ship` → Deliver.
- `rework` → Execute with the hot spots as constraints, then the Review loop and Verify again.
- `dig deeper` → focused review of the named area.

### Deliver

Dispatch `forgebee:delivery-agent` with: the changed files, the Verification Report in full, the Judge's rulings (Critical), the requirements and ADR paths, and the project conventions.

**Output required:** changelog, documentation updates, deployment readiness checklist. Present the delivery package as the final output.

---

## State Tracking

At start: read `docs/pm/state.yaml`, resume or create the feature entry. At every phase transition: update phase + timestamp and mark the phase's tasks done at once, not in a batch at the end. Record decisions with sequential IDs. Write one entry per Execution Plan workstream in the feature's `stories` list (the schema `pm-sync`, `/pm`, and the dashboards read). On completion: set phase to done, regenerate the dashboards (`docs/pm/index.md`, `docs/pm/features/`, `docs/pm/decisions.md`), sync `TASKS.md`.
