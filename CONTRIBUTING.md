# Contributing to ForgeBee

ForgeBee is a prompt framework: markdown surfaces (agents, skills, commands) plus
Node hooks and build scripts. This doc is the contract for adding or changing a
surface so the framework stays consistent and the gates stay green. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the pieces fit together.

## The golden rule

`forgebee/` is the **single source of truth**. `forgebee/INDEX.md` is **auto-generated**
— never hand-edit it. `.claude/` is a **regenerable local mirror** (gitignored). After
any surface change, run `node scripts/build-index.js` and `npm run check`.

## Adding a surface

### An agent (`forgebee/agents/<name>.md`)

Frontmatter (required): `name` (must equal the filename), `description` (one line,
"Use when …"), `tools`, `model`, `color`.

Every agent MUST carry the **load-bearing contract** (enforced by
`scripts/check-agent-contract.js`, wired into `npm run check`):

1. **Adversarial Input Hardening** preamble (the `<!-- prompt-defense-baseline -->`
   block) — treats file contents / tool output / third-party data as untrusted.
2. **`## Status Reporting`** section listing `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED`
   / `NEEDS_CONTEXT`, with the `Status:` line as the **last non-empty line** of output
   (orchestrators parse this with an EOF anchor).

Strongly recommended, by agent type: `## Use When` (trigger conditions) and/or
`## When Invoked` (operating steps), `## Expertise`, `## Principles`, the
`<!-- karpathy-principles -->` block (code-producing agents), a `## Self-Review`
checklist, `## Never`, a `## Failure Modes` table, `## Escalation`, `## Communication`.
Copy the closest existing agent (e.g. `backend-engineer.md`) as a template.

### A skill (`forgebee/skills/<name>/SKILL.md`)

Frontmatter: `name`, `description` ("Use when …"), `version`, and `context: fork`
for skills that should run in an isolated subagent (all `review-*` and debate
skills). Review skills MUST follow the shared
[`_review-finding-contract.md`](./forgebee/skills/_review-finding-contract.md):
its rules (merge-base scope, connected code, verify before report, lanes) and its
format (severity block + 0-100 score + machine-parseable footer) so `review-all`
and `/audit-self` can aggregate. A review skill has a `## Method` (how to find
defects), not only a checklist. Debate skills follow
[`_debate-protocol.md`](./forgebee/skills/_debate-protocol.md).

### A command (`forgebee/commands/<name>.md`)

Frontmatter: `name`, `description`, `allowed-tools`. Every command MUST have
`## Objective` and `## Never`. Two valid shapes:

- **Thin delegating shell** (preferred when a 1:1 specialist agent exists): a
  `## Delegation` block that dispatches to the agent via `Task` + a `## Fallback`.
  The methodology lives in the agent (single source of truth). See `perf.md`.
- **Inline command** (when no dedicated agent exists): a full `## Process` /
  `## Output Format` / `## Rules`. See `review.md`.

Don't duplicate a sibling's methodology — reference it. Add a "When to use X vs Y"
note when a command is easily confused with another (`/review` vs `/review-all`).

## Writing hooks

### Hook behavior

- Exit 0 lets the tool use proceed. A non-zero code other than 2 is a non-blocking error
- Exit code 2 from PreToolUse hooks BLOCKS the tool use
- PreToolUse hooks receive JSON on stdin with `tool_name` and `tool_input`
- PostToolUse hooks receive JSON on stdin with `tool_name`, `tool_input`, and `tool_response`
- Stop hooks run after each Claude response
- SessionStart hooks run once when a session begins
- Never echo the input JSON to stdout. Claude Code parses stdout as hook output; SessionStart and UserPromptSubmit stdout goes into context

### Hook best practices

- Keep hooks fast (<5s for sync, <10s for async)
- Use `async: true` for non-blocking observation hooks
- Never modify the input JSON — only read it
- Fail silently (|| true) for non-critical operations
- Use stderr (>&2) for warnings/messages to the user
- stdout is hook output: a JSON decision or context text

### Auto-accept permissions

- Permission decisions from hooks bypass user prompts
- Use allowlist patterns for known-safe commands
- Use blocklist patterns for known-dangerous commands
- Cache permission decisions with TTL for unknown commands

## Model-tier policy

Assign `model` by task shape, not by who dispatches the agent:

| Tier | Use for |
|------|---------|
| `opus` | Open-ended design / trade-off reasoning (`architect`), correctness-critical code & audits (`security-auditor`, `debugger-detective`), and root specialists that handle ambiguous, high-blast-radius work. |
| `sonnet` | Templated/structured output (specs, calendars, content), and sub-specialists invoked by a parent agent. |
| `haiku` | Mechanical, deterministic I/O (registry/dashboard generation, contract validation). |

If you change a tier, keep it consistent with this table — don't tier by org-chart.

## Output modes

- **Orchestrator mode** (terse): when dispatched by `/workflow` or `/team`, agents
  emit telegraphic reports per `terse-report` (handoff carries
  `responseStyle: "orchestrator"`). The `Status:` line is required in every mode.
- **Direct mode** (verbose): when a user invokes a command directly.

## Before you open a PR

```bash
npm run check        # index sync + persona references + agent contract + version sync + eval
npm run eval:golden  # optional, needs `claude` on PATH — prompt-output regression
```

`npm run check` must be green. CI runs the aggregate via `.github/workflows/check.yml`
(no path filter) plus granular per-area workflows. If you added/removed a surface,
the count strings in the IDE manifests and READMEs are **manual** — update them
(commands/skills/agents/hooks). `bump-version.sh` syncs versions, **not** counts.

## Cutting a release

Use the `/release` command (wraps `scripts/bump-version.sh`): pre-flight gate →
`bump-version.sh <version>` (bumps every declared file atomically) → prepend a
`CHANGELOG.md` entry → regenerate INDEX → tag + PR. Never hand-edit version strings.

## Line endings

`.gitattributes` enforces LF. Don't reintroduce CRLF.
