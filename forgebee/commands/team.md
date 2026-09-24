---
name: team
description: Master orchestrator — analyzes the task, designs an implementation plan, and coordinates specialist agents working in parallel
allowed-tools: Read, Glob, Grep, Bash, Task
---

# Team Orchestrator

## Objective

Break a task into parallel workstreams, delegate to specialist agents, and deliver integrated, quality-verified results. Faster than /workflow — no debate ceremony.

**Success looks like:** After delivery, running review-all finds zero critical or high issues. All tests pass, build succeeds, no security gaps.

## When to use `/team` vs `/workflow`

| Situation | Use |
|---|---|
| **You know what you want, just need execution across 2-5 files** | `/team` |
| **Spec is ambiguous OR auth/payments/data are involved OR scope is large (>5 files)** | `/workflow` |
| **You want adversarial review (debate triads)** | `/workflow` |
| **Quick refactor, bugfix, or single-concern feature** | `/team` |
| **First time tackling a domain you're unsure about** | `/workflow --strict` (forces design spec first) |

In short: `/team` is "go fast"; `/workflow` is "go thorough." If unsure → `/workflow`.

## Anti-Stop Rule (P5)

**After dispatching a sub-agent, continue with your own next-step *orchestration* work.** The harness notifies you when work completes. Until then: plan the next dispatch, integrate partial results, or prepare the verification gate. Do not announce "waiting for X to return."

**"Continue" means orchestrate, never implement.** While agents run you must not `Edit`, run the app, hit its endpoints, exec into containers, or run its tests. Doing the agent's job in parallel pays for the same work twice and produces conflicting edits. If you find yourself working, you sized the task wrong — cancel and do it directly at Tier Direct.

**Do not poll.** Never call `ListAgents` in a loop to check on a dispatch. Each poll re-reads your full context. Wait for the notification.

## Never

- Never dispatch agents without showing the plan first
- Never let two agents modify the same file in parallel
- Never deliver with known failing tests or build errors
- Never skip security-auditor for code that touches auth, payments, or user data
- Never idle after dispatching — see Anti-Stop Rule
- Never implement, verify, or poll while agents run — see Anti-Stop Rule
- Never dispatch more agents than the tier allows
- Never report done without running the full test suite

## Step 1: Size the task (mandatory, before any other action)

Estimate the blast radius with one or two cheap commands (`git diff --stat`, `grep -l`, `find`). Then pick a tier and **state the tier and the agent count in one line** before you dispatch anything.

| Tier | Blast radius | Agents | Shape |
|---|---|---|---|
| **Direct** | 1–2 files, change already clear | **0** | Do it yourself. No plan table, no dispatch. |
| **Small** | 3–6 files, one concern | **1** | One implementer. You review the diff at the end. |
| **Medium** | 7–15 files, or 2 distinct concerns | **2–3** | Implementer(s) + one reviewer. |
| **Large** | 15+ files, or needs a plan first | **3–5** | Research → implement → review. |

Ambiguity resolves **downward**. A tier is a ceiling, not a target. Auth, payments, or user data adds `security-auditor` — it does not raise the tier.

### Cost rule

Every agent is a fresh session that re-reads the whole preamble on each of its tool calls. An agent that returns one paragraph still costs six figures in tokens. Dispatch one only when it does work you would otherwise do serially, or work you genuinely cannot do.

Never dispatch a research agent whose findings the implementer will re-derive. Either research yourself and hand the result to the implementer, or let the implementer research.

## Step 2: Grill (conditional)

Run a short `grill` (`forgebee/skills/grill/SKILL.md`) before planning when:

- the tier is Medium or Large, or
- the task is ambiguous: 2+ valid readings of scope or behaviour, or
- the user passed `--grill`.

Direct and Small tiers skip it unless `--grill` is set. Cap it at 2 rounds. Record the answers in the decision log the skill names; unvisited branches become Tentative risks in the plan. If the grill shows the task needs a full design, recommend `/workflow`.

## Step 3: Plan & Show

Break work into independent workstreams. For each, define: agent, files it owns, deliverable, acceptance criteria.

**Add `security-auditor` only when the change touches one of these:** authentication, authorization, sessions, or capability checks; payments, billing, or PII; untrusted input reaching output (escaping, `wp_kses`, SQL, shell); secrets, tokens, or credentials; file upload, deserialization, or a path built from user input.

**Add `test-engineer` only when:** the repo has a real suite the change can extend *and* the change adds a new code path; or the change fixes a bug (add the regression test); or the task asks for tests. Otherwise the implementer covers its own change.

Neither is automatic. On a Tier Small task both are usually wrong.

**If 3+ agents**, show a dependency graph before dispatch:

```
## Dependency Graph
backend-engineer ──→ database-specialist
      └──→ test-engineer
frontend-specialist ──→ test-engineer
security-auditor (parallel — reviews all changes after completion)
```

Present execution plan table:

```markdown
| Workstream | Agent | Files | Dependencies | Parallel Group |
|-----------|-------|-------|-------------|----------------|
| API endpoints | backend-engineer | src/api/ | None | A |
| UI components | frontend-specialist | src/components/ | None | A |
| Schema migration | database-specialist | migrations/ | backend-engineer | B |
| Tests | test-engineer | tests/ | A + B | C |
| Security review | security-auditor | all changed files | C | D |
```

### Step→Verify format (required for every dispatched plan)

Each workstream above must be expanded by its agent into a numbered Step→Verify plan before code is written. Karpathy's Goal-Driven Execution discipline — no "vibes correctness." Verify lines name concrete checks.

```markdown
## <Workstream> — Step→Verify Plan

1. <Action 1>
   - verify: <concrete check — test name, command, manual UI step>
2. <Action 2>
   - verify: <concrete check>
3. <Action 3>
   - verify: <concrete check>
```

A plan without per-step verify lines is rejected at dispatch — return it to the agent.

**Wait for user approval.**

## Step 4: Execute

Dispatch agents with clear context — they don't share your conversation. Each agent gets: task description, files to modify, acceptance criteria, relevant codebase patterns, and `responseStyle: "orchestrator"` (triggers the specialist's `terse-report` skill — ~65% report-token reduction without losing actionable signal). See `forgebee/skills/terse-report/SKILL.md`.

### Budget envelope

Every dispatch carries a budget that sub-dispatches must propagate:

```json
{
  "budget": { "hopCount": 1, "maxHops": 8, "maxTokens": null, "maxUsd": null }
}
```

Default `maxHops: 8`, ceiling 64. Reject `hopCount > maxHops` with `HOP_LIMIT_EXCEEDED`; surface trips to the user with the dispatch chain. Prevents runaway specialist fan-out. Full rules + the oracle-leakage hardening (constant-string peer errors, `maxTokens`/`maxUsd`) — only needed for untrusted multi-tenant fan-out — are in `forgebee/skills/_budget-breaker.md`.

**If 3+ agents:** after each agent completes, record its workstream id + status + changed files to `docs/pm/state.yaml` (or a lightweight `.claude/team-progress.json` if no PM state exists) so progress survives a crash. On failure or a fresh session, read it and skip already-completed workstreams.

**Agent Status Protocol:** Every specialist must report one of:

| Status | Meaning | Your response |
|--------|---------|---------------|
| `DONE` | Work complete, self-review passed | Proceed |
| `DONE_WITH_CONCERNS` | Complete but has trade-offs/risks | Show concerns to user, proceed unless they say stop |
| `BLOCKED` | Cannot complete | Show blocker, re-route or escalate to user |
| `NEEDS_CONTEXT` | Missing info from the session | Re-dispatch with additional context |

Reject any response without a status. If `BLOCKED` twice on same issue → escalate to user.

**No parseable Status line** (agent died, timed out, or returned off-format output) → treat as `BLOCKED`: surface the raw output tail to the user, re-dispatch **once** with a reminder of the required EOF-anchored `Status:` format, then escalate. Never silently stall on an unparseable return (Anti-Stop Rule).

**Quality mandate:** Every specialist must self-review their output against review-all criteria (code quality, security, performance, accessibility) before reporting `DONE`. Reject output without evidence (test output, lint output, build output).

## Step 5: Quality Gate & Deliver

1. Collect results from all agents
2. Verify integration — do the workstreams fit together?
3. Run concrete checks:
   - Full test suite — show actual output
   - Linter/type-check — show actual output
   - Build — show actual output
   - Review `git diff HEAD` for DRY violations, missing error handling, security gaps
4. **If issues found:** Route back to the responsible specialist with file:line references. Do NOT deliver with known issues.
5. Report final status with summary of all changes

**Quality contract:** After /team completes, review-all should find zero critical or high issues.

## Available Agents

**Tier 1 — auto-route to tech-specific subagents:**

| Agent | Best For | Routes To |
|-------|----------|-----------|
| `frontend-specialist` | UI, components, styling, mobile | → `nextjs-frontend`, `wordpress-frontend`, `flutter-expert`, `ios-expert` |
| `backend-engineer` | APIs, server logic, auth, automation | → `wordpress-backend`, `n8n-builder` |
| `database-specialist` | Schema, migrations, queries | → `supabase-specialist` |
| `security-auditor` | Vulnerabilities, OWASP | → `wordpress-security` |
| `test-engineer` | Test generation, coverage | → `phpunit-engineer` |
| `devops-engineer` | Docker, CI/CD, deployment | — |
| `performance-optimizer` | Profiling, bottlenecks | — |
| `debugger-detective` | Bug hunting, root cause | — |
| `deep-researcher` | Docs, APIs, technical questions | — |
| `ux-designer` | User flows, wireframes, accessibility | — |
| `content-creator` | Copy, docs, blog posts | → `wordpress-content`, `nextjs-content` |
| `seo-specialist` | Search optimization | → `wordpress-seo`, `nextjs-seo` |

**Debate agents** (for adversarial review without full /workflow):
`code-advocate`, `code-skeptic`, `code-judge`, `requirements-advocate`, `requirements-skeptic`, `requirements-judge`

**Delivery:** `delivery-agent`, `verification-enforcer`, `contract-validator`

## Rules

- The tier from Step 1 caps the agent count. 3–5 is the Large ceiling, not a default
- The lead orchestrates only — it does not edit, verify, or poll while agents run
- Break work so each agent owns different files
- Include full context in each agent's first message; a follow-up round trip costs as much as the first
- Sequence reviewers after implementers — reviewing a diff still being written wastes the review
- After all agents finish, run the full test suite as verification
