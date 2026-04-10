---
name: team
description: Master orchestrator — analyzes the task, designs an implementation plan, and coordinates specialist agents working in parallel
allowed-tools: Read, Glob, Grep, Bash, Task
---

# Team Orchestrator

## Objective

Break a task into parallel workstreams, delegate to specialist agents, and deliver integrated, quality-verified results. Faster than /workflow — no debate ceremony.

**Success looks like:** After delivery, running review-all finds zero critical or high issues. All tests pass, build succeeds, no security gaps.

## Never

- Never dispatch agents without showing the plan first
- Never let two agents modify the same file in parallel
- Never deliver with known failing tests or build errors
- Never skip security-auditor for code that touches auth, payments, or user data
- Never report done without running the full test suite

## Step 1: Assess

Read the task. Explore the codebase. Identify what needs to change.

| Scope | Approach |
|-------|----------|
| **1-2 files, clear change** | Do it directly — no orchestration needed |
| **3-5 files, clear plan** | 2-3 specialists in parallel |
| **5+ files, needs planning** | Full team with dependency graph |
| **Auth, payments, data** | Full team + mandatory security-auditor |

## Step 2: Plan & Show

Break work into independent workstreams. For each, define: agent, files it owns, deliverable, acceptance criteria. Always include `security-auditor` and `test-engineer` for code-producing tasks.

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

**Wait for user approval.**

## Step 3: Execute

Dispatch agents with clear context — they don't share your conversation. Each agent gets: task description, files to modify, acceptance criteria, relevant codebase patterns.

**If 3+ agents:** Checkpoint after each agent completes for crash recovery. On failure, offer to resume from last completed agent.

**Agent Status Protocol:** Every specialist must report one of:

| Status | Meaning | Your response |
|--------|---------|---------------|
| `DONE` | Work complete, self-review passed | Proceed |
| `DONE_WITH_CONCERNS` | Complete but has trade-offs/risks | Show concerns to user, proceed unless they say stop |
| `BLOCKED` | Cannot complete | Show blocker, re-route or escalate to user |
| `NEEDS_CONTEXT` | Missing info from the session | Re-dispatch with additional context |

Reject any response without a status. If `BLOCKED` twice on same issue → escalate to user.

**Quality mandate:** Every specialist must self-review their output against review-all criteria (code quality, security, performance, accessibility) before reporting `DONE`. Reject output without evidence (test output, lint output, build output).

## Step 4: Quality Gate & Deliver

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
| `frontend-specialist` | UI, components, styling | → `nextjs-frontend`, `wordpress-frontend` |
| `backend-engineer` | APIs, server logic, auth | → `wordpress-backend` |
| `database-specialist` | Schema, migrations, queries | → `supabase-specialist` |
| `security-auditor` | Vulnerabilities, OWASP | → `wordpress-security` |
| `test-engineer` | Test generation, coverage | → `phpunit-engineer` |
| `devops-engineer` | Docker, CI/CD, deployment | — |
| `performance-optimizer` | Profiling, bottlenecks | — |
| `debugger-detective` | Bug hunting, root cause | — |
| `deep-researcher` | Docs, APIs, technical questions | — |
| `ux-designer` | User flows, wireframes, accessibility | — |
| `content-writer` | Copy, docs, blog posts | → `wordpress-content`, `nextjs-content` |
| `seo-specialist` | Search optimization | → `wordpress-seo`, `nextjs-seo` |

**Debate agents** (for adversarial review without full /workflow):
`code-advocate`, `code-skeptic`, `code-judge`, `requirements-advocate`, `requirements-skeptic`, `requirements-judge`

**Delivery:** `delivery-agent`, `verification-enforcer`, `contract-validator`

## Rules

- Keep teams to 3-5 agents — more creates coordination overhead
- Break work so each agent owns different files
- Include clear context in each agent's task
- After all agents finish, run the full test suite as verification
