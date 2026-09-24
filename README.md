<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-7C3AED?style=for-the-badge&logoColor=white" alt="Claude Code" />
  <img src="https://img.shields.io/badge/Codex-Compatible-10B981?style=for-the-badge&logoColor=white" alt="Codex" />
  <img src="https://img.shields.io/badge/Cursor-Compatible-1F2937?style=for-the-badge&logoColor=white" alt="Cursor" />
  <img src="https://img.shields.io/badge/Gemini-Compatible-4285F4?style=for-the-badge&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/version-5.6.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/agents-45-orange?style=for-the-badge" alt="Agents" />
  <img src="https://img.shields.io/badge/commands-39-red?style=for-the-badge" alt="Commands" />
  <img src="https://img.shields.io/badge/hooks-25-blueviolet?style=for-the-badge" alt="Hooks" />
  <img src="https://img.shields.io/badge/skills-35-teal?style=for-the-badge" alt="Skills" />
</p>

<p align="center">
  <sub>45 agents = <strong>26 framework-agnostic</strong> (code, growth, debate, planning) + <strong>19 stack specialists</strong> (WordPress, Next.js, Supabase, mobile, n8n, WooCommerce)</sub>
</p>

<h1 align="center">ForgeBee</h1>

<p align="center">
  <strong>A colony of AI agents forging your product</strong><br/>
  45 specialist agents. 35 skills. 39 slash commands. 25 lifecycle hooks.<br/>
  Three execution modes: inline skills, context:fork, subagents.<br/>
  Adaptive pipeline. Karpathy principles. Adversarial debate. Continuous learning.<br/>
  <em>Works with Claude Code, Codex, Cursor, Gemini, and OpenClaw.</em>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &nbsp;&bull;&nbsp;
  <a href="#commands">Commands</a> &nbsp;&bull;&nbsp;
  <a href="#agents">Agents</a> &nbsp;&bull;&nbsp;
  <a href="#hooks">Hooks</a> &nbsp;&bull;&nbsp;
  <a href="#continuous-learning">Learning</a> &nbsp;&bull;&nbsp;
  <a href="#growth-os">Growth OS</a> &nbsp;&bull;&nbsp;
  <a href="#project-management">PM System</a> &nbsp;&bull;&nbsp;
  <a href="#openclaw">OpenClaw</a>
</p>

---

## Why ForgeBee?

Claude Code and OpenClaw are powerful out of the box. ForgeBee makes them **opinionated and structured** — so your agent plans before it codes, debates before it ships, and verifies before it marks anything "done."

| Without ForgeBee | With ForgeBee |
|:--|:--|
| Agent jumps straight into coding | Agent plans, debates requirements, then codes |
| "It should work" | Evidence-based verification with actual test output |
| Single-agent, single-pass | 45 agents + 35 skills working in parallel with blind review |
| Manual project tracking | Automated state.yaml + markdown dashboards |
| No marketing workflow | Full 9-phase Growth OS with 11 marketing agents + 3 strategy debate agents |
| Every session starts from scratch | Continuous learning — heuristic pattern detection + pending instinct approval |
| Edits break silently | Auto-format, typecheck, and lint on every edit |
| Permission prompts everywhere | Mode-aware permissions — fully yields to auto-mode's classifier; enforces blocklist in default and bypass |
| Commands duplicate agent logic | Commands delegate to specialist agents with automatic fallback |
| Review finds issues that should have been caught | Quality pipeline — specialists self-review, code-skeptic validates, review-all just confirms |
| Agents take shortcuts under pressure | Every agent has explicit "Never" rules — hard boundaries that can't be rationalized away |
| Skill descriptions drift silently | All skill descriptions follow "Use when..." triggering format — Claude reads triggers, not workflow summaries |
| Version numbers drift across manifests | `.version-bump.json` + `scripts/bump-version.sh` — single source of truth, drift detection, full-repo audit |
| Debug loops forever on the same bug | 3-failed-fix Iron Law — debugger-detective escalates to architecture question after 3 failed attempts |
| User forgets to run `/learn` | Auto-nudge on SessionStart when ≥5 pending instincts and no `/learn` in 24h |
| One implementation = one harness | Single source ships to Claude Code, Codex, Cursor, Gemini via dedicated manifests |
| Agents make silent assumptions | Karpathy P1–P4 baked into every code-producing agent: trace test, senior-engineer check, YAGNI timing, orphan rule |
| Orchestrators idle after dispatch | P5 Anti-Stop Rule in `/workflow` + `/team`: continue with next-step work immediately, the harness wakes you when sub-agents return |
| Review reviewer drift | P6 Severity Standard (`Critical/High/Medium/Low`) across all review skills — enables cross-skill aggregation |
| Discovery searches hang on vendored subtrees | T1–T5 Tool Discipline in `CLAUDE.md`: prefer `rg` over `grep -r`, bound every search (scope/type/timeout), `Glob` before `grep`, exclude `vendor`/`node_modules` — kills 10-minute stalls on `wp-content/` and monorepo roots |
| Untrusted code can hijack agents | 6-line Adversarial Input Hardening preamble in all 45 agents — homoglyphs, urgency, role-play overrides flagged not executed |
| Sub-agent reports waste orchestrator context | `terse-report` skill cuts ~65% of report tokens while preserving code/citations exact |
| Decisions get lost between sessions | `/workflow` and `/plan` emit `.decision-log.md` + `addendum.md` — re-read on next run |
| Recursive debate fan-out runs away | Budget circuit breaker (`maxHops`, `maxTokens`, `maxUsd`) on every dispatch with constant-string errors |
| Plans start with unasked questions | `grill` skill interviews you on the decision tree in rounds, looks up facts itself, and hands a resolved decision log to Plan |
| Silent picks mid-task | `surface-ambiguity` micro-skill forces listing of interpretations + rationale before non-trivial choices |
| Debugging without evidence | Failure-Capture template (7 fields) required before any recovery action in `debugger-detective` |
| Diagnosis vs fix blur together | `/investigate` produces a forensic case file (Confirmed / Deduced / Hypothesized) — `debugger-detective` then fixes |
| Reviews skim or lose-the-forest | Checkpoint Preview phase: diff-by-concern with `[auth]` / `[schema]` / `[billing]` risk tags before debate |
| Plans drift without stress-test | `/elicit` applies 18 named methods (Pre-mortem, Red Team, Inversion, Stakeholder Round Table…) to your own output |
| Quality decays as the kit grows | `/audit-self` re-runs the full scorecard on demand and surfaces regressions since last audit |
| Claude scans every agent/skill/command frontmatter block per routing decision | Auto-generated `forgebee/INDEX.md` loaded once on SessionStart — replaces speculative scanning with one indexed read |

---

## Quick Start

**Two commands. That's it.**

```bash
# Inside Claude Code:
/plugin marketplace add forbee-dev/ForgeBee
/plugin install forgebee@forbee-dev
```

Then edit `CLAUDE.md` with your project details and start working. Hooks activate automatically, commands are available immediately.

<details>
<summary><strong>Install from local directory</strong></summary>

```bash
git clone git@github.com:forbee-dev/ClaudeDevKit.git
claude --plugin-dir ./ClaudeDevKit/forgebee
```

</details>

<details>
<summary><strong>Requirements</strong></summary>

- Claude Code 1.0.33+
- Node.js 18+ (all hooks are pure Node.js — no bash, no python, no jq)
- Agent Teams: set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

</details>

---

## Commands

Invoke with a slash: `/review`, `/debug`, `/workflow`, etc.

### Planning

| Command | Description |
|:--------|:------------|
| `/plan` | Phased planning: Brief &rarr; Requirements &rarr; Architecture &rarr; Sprint Stories |

### Development

| Command | Description |
|:--------|:------------|
| `/review` | Multi-dimensional code review (structure, security, perf, correctness) |
| `/debug` | Delegates to `debugger-detective` agent; systematic reproduce &rarr; isolate &rarr; fix |
| `/architect` | Architecture decisions with trade-off matrices and ADR generation |
| `/refactor` | Safe refactoring with test verification at each step |
| `/test` | Delegates to `test-engineer` agent; unit &rarr; integration &rarr; e2e |
| `/docs` | API docs, READMEs, ADRs, guides |
| `/security` | Delegates to `security-auditor` agent; OWASP Top 10 + anti-rationalization gate |
| `/perf` | Profile &rarr; optimize &rarr; measure |
| `/migrate` | Version/framework migration with rollback plans + anti-rationalization gate |
| `/deploy` | Pre-flight checks, rollout, post-deploy verification + anti-rationalization gate |
| `/browser-debug` | Console, network, rendering, Core Web Vitals |
| `/codemaps` | Token-lean architecture docs for AI context consumption |
| `/design-system` | `audit` a Figma page against code, `onboard` a new component, or audit `tokens` — code-first, Figma is derived |

### Growth & Marketing

| Command | Description |
|:--------|:------------|
| `/growth` | **9-phase Growth OS** with adversarial debate (16 agents) |
| `/content` | Quick content production without full pipeline |
| `/gtm` | Go-to-market planning with launch checklists |
| `/seo` | Technical SEO audit + keyword research |
| `/social` | Platform playbooks, hook formulas, content calendars |
| `/launch` | Product Hunt / HN / press launch execution |
| `/competitive` | FIA battlecards + niche intelligence |
| `/landing` | Conversion-optimized landing page (HTML + Tailwind) |
| `/payments` | Stripe / LemonSqueezy / Paddle integration |
| `/analytics` | Event tracking, dashboards, metrics framework |

### Learning

| Command | Description |
|:--------|:------------|
| `/learn` | Review pending instincts (auto-detected) + analyze observations for new patterns |
| `/evolve` | Cluster related instincts into skills, commands, or agents |
| `/instinct-status` | Show all learned instincts (project + global) with confidence scores |
| `/instinct-export` | Export instincts to a shareable file |
| `/instinct-import` | Import instincts from a file |

### Meta

| Command | Description |
|:--------|:------------|
| `/workflow` | **Full pipeline**: Grill (when the spec is ambiguous or touches auth/payments/data; `--grill` / `--no-grill`) &rarr; Plan &rarr; Debate &rarr; Architect &rarr; **Implementation Plan** (lightweight default, `--scrum` for full sprint stories) &rarr; Execute &rarr; **Spec Compliance** &rarr; **Checkpoint Preview** (default, `--skip-checkpoint` to opt out) &rarr; Code Debate &rarr; Deliver. Pass `--strict` to require a design spec via `brainstorming` before any code. Auto-offers `/elicit` methods at phase boundaries |
| `/investigate` | Forensic diagnosis — produces a case file with Confirmed / Deduced / Hypothesized grading. Hand off to `debugger-detective` for the fix. Different from `/debug` (which fixes directly) |
| `/grill` | Interview the user on a plan in rounds, one recommended answer per question, until every decision is settled or accepted as a risk. Output feeds `/plan`. Before the plan, not after |
| `/elicit` | Stress-test the most recent plan or design with one of 18 named reasoning methods (`pre-mortem`, `red-team`, `inversion`, `stakeholder-round-table`, `tree-of-thoughts`, …). Applied to OUTPUT, not requirements |
| `/audit-self` | Re-run the ForgeBee quality scorecard across all skills, agents, and commands. Detects regressions since last audit. Timestamped findings |
| `/team` | Multi-agent orchestration with dependency graphs + checkpoints at 3+ agents |
| `/idea` | Idea &rarr; validate &rarr; debate &rarr; MVP &rarr; roadmap |
| `/pm` | Project dashboard from `state.yaml` |
| `/audit` | Governance audit trail — permission decisions, debate rulings, verification results |

---

## Agents

45 specialist agents + 35 skills for Claude Code's Agent Teams. Use them directly or let `/team` and `/workflow` orchestrate automatically.

> **v5.4 highlights — routing actually fires.** Five defects were keeping the 117 surfaces unreachable: the SessionStart index was dropped for exceeding the `additionalContext` size limit (everything past ~2KB, including the whole WordPress roster, never arrived), `skill-activator.js` emitted a top-level `additionalContext` that the harness discards, and it scanned neither agents nor commands — so no agent or slash command could ever be recommended. Now all three surface types are scored together, stack-boosted from `project-triage.json`, capped at 5 candidates, and acronym-aware (ACF, SCF, SEO, API, RLS were silently below the word-length floor). New **Routing Discipline R1–R4** in `CLAUDE.md`: name the route before the first edit, prefer the stack-specific agent. New design-system trio: **`figma-code-sync`** skill (code-first Figma reconciliation, 12 defect priors, ~18 Plugin API traps), **`wp-design-system`** agent (`theme.json`-versus-SCSS layer ownership, token pipeline, patterns/variations), **`/design-system`** command. `wordpress-backend` gains full ACF/SCF field architecture — field-group registration, JSON sync, immutable field keys, repeater meta storage and why it cannot be `meta_query`'d, and ACF-PRO-to-SCF migration risk.
>
> **v5.1 highlights:** Karpathy P1–P6 principles baked into every code-producing agent (trace test, senior-engineer check, YAGNI timing, orphan rule, anti-stop rule, severity standard). Seven new skills: `brainstorming` (opt-in via `--strict`), `surface-ambiguity`, `terse-report`, `checkpoint-preview`, `investigate`, `elicitation` (18 methods), `audit-self`. Three new commands: `/investigate`, `/elicit`, `/audit-self`. Adversarial Input Hardening preamble on all 44 agents. Budget circuit breaker on dispatch (maxHops/maxTokens/maxUsd). Decision logs, failure-capture templates, learnings compression. Bloat trim: 6 over-budget agents trimmed to ≤200 lines via references/. **Auto-generated `forgebee/INDEX.md`** — Claude reads one indexed routing map on SessionStart instead of scanning every skill description. See [`CHANGELOG.md`](./CHANGELOG.md) for full release notes.
>
> **v5.0 highlights:** Multi-platform manifests (Codex/Cursor/Gemini), brainstorming hard-gate skill (opt-in via `/workflow --strict`), two-stage review (spec compliance before code debate), `debugger-detective` Iron Law (3 failed fixes → escalate), auto-learn SessionStart nudge, "Use when..." skill descriptions, and `.version-bump.json` drift detection.
>
> **v4.1 migration:** 21 agents moved to skills — 9 debate agents and 12 review agents now use `context:fork` for efficient isolated execution. `review-all` is an inline skill that runs in session context.

<details>
<summary><strong>Development</strong> (8 agents)</summary>

| Agent | Use when... |
|:------|:------------|
| `frontend-specialist` | React, Vue, Svelte, Angular, CSS, UI work |
| `backend-engineer` | APIs, Express, FastAPI, Django, Go, Rust |
| `database-specialist` | Schema, migrations, queries, ORMs |
| `security-auditor` | Auth changes, data handling, OWASP reviews |
| `test-engineer` | Test generation, coverage improvement |
| `devops-engineer` | Docker, CI/CD, deployment, infrastructure |
| `performance-optimizer` | Profiling, bottlenecks, bundle analysis |
| `debugger-detective` | Errors, test failures, root cause analysis |

</details>

<details>
<summary><strong>Quality Gates</strong> (5 agents) &mdash; NEW in v2.3</summary>

| Agent | Use when... |
|:------|:------------|
| `verification-enforcer` | Task completion &mdash; demands test output, build results, evidence |
| `tdd-enforcer` | TDD discipline &mdash; blocks code written before tests |
| `delivery-agent` | Final packaging after code debate + verification |
| `dashboard-generator` | Regenerating PM dashboards from state.yaml |
| `contract-validator` | Agent handoffs — validates output contracts between pipeline phases |

</details>

<details>
<summary><strong>Dev Debate</strong> (6 context:fork skills)</summary>

| Skill | Role |
|:------|:-----|
| `requirements-advocate` | Defends planning artifacts (blind, isolated) |
| `requirements-skeptic` | Challenges planning artifacts (blind, isolated) |
| `requirements-judge` | Rules: approve / block / flag |
| `code-advocate` | Defends implementation (blind, isolated) |
| `code-skeptic` | Challenges implementation (blind, isolated) |
| `code-judge` | Rules: approve / block / flag |

</details>

<details>
<summary><strong>Strategy Debate</strong> (3 context:fork skills)</summary>

| Skill | Role |
|:------|:-----|
| `strategy-advocate` | Defends marketing strategy (blind, isolated) |
| `strategy-skeptic` | Challenges marketing strategy (blind, isolated) |
| `strategy-judge` | Rules: approve / block / flag |

</details>

<details>
<summary><strong>Growth OS</strong> (11 agents)</summary>

| Agent | Use when... |
|:------|:------------|
| `brand-strategist` | Brand positioning, archetypes, voice |
| `market-intel` | Competitive research, battlecards |
| `audience-architect` | ICPs, personas, buyer journeys |
| `content-strategist` | Pillars, topic clusters, hub-and-spoke, content ideas, angle mining, editorial calendar |
| `hook-engineer` | Scroll-stopping hooks, pattern interrupts |
| `engagement-strategist` | Community, reciprocity loops, DM flows |
| `content-creator` | Platform-native posts, threads, scripts, long-form blogs, landing copy |
| `growth-engineer` | Growth loops, flywheels, funnels, CRO audits, conversion optimization |
| `marketing-analyst` | Marketing KPIs, attribution, A/B testing |
| `seo-specialist` | Keyword strategy, pillar/cluster SEO |
| `email-strategist` | Automation flows, segmentation, deliverability |

</details>

<details>
<summary><strong>Design, Research & Platform</strong> (8 agents)</summary>

| Agent | Use when... |
|:------|:------------|
| `ux-designer` | User flows, wireframes, accessibility |
| `scrum-master` | Sprint planning, story decomposition |
| `deep-researcher` | Documentation, APIs, technical questions |
| `session-librarian` | Session history, context management |
| `supabase-specialist` | Supabase auth, RLS, edge functions |
| `ios-expert` | Swift, SwiftUI, Xcode, App Store |
| `flutter-expert` | Dart, Flutter, cross-platform |
| `n8n-builder` | n8n workflows, API integrations |

</details>

<details>
<summary><strong>WordPress Specialists</strong> (8 agents) &mdash; NEW in v3.0</summary>

| Agent | Use when... |
|:------|:------------|
| `wordpress-backend` | WordPress PHP backend, REST endpoints, ACF/SCF field architecture, hooks |
| `wordpress-frontend` | WordPress theme dev, block themes, template hierarchy |
| `wordpress-content` | WordPress Gutenberg content, block patterns, ACF content |
| `wordpress-security` | WordPress security audit, sanitization, WPCS |
| `wordpress-seo` | WordPress SEO, Yoast/RankMath, XML sitemaps |
| `phpunit-engineer` | WordPress PHPUnit testing, WP_UnitTestCase |
| `woocommerce-cro` | WooCommerce checkout/product page CRO |
| `wp-design-system` | `theme.json` token architecture, Figma-to-presets pipeline, patterns/variations as design-system components |

</details>

<details>
<summary><strong>Next.js Specialists</strong> (3 agents) &mdash; NEW in v3.0</summary>

| Agent | Use when... |
|:------|:------------|
| `nextjs-frontend` | Next.js App Router, Server/Client Components, Supabase SSR |
| `nextjs-content` | Next.js MDX content, Contentlayer, static generation |
| `nextjs-seo` | Next.js Metadata API, sitemap.ts, OG image generation |

</details>

<details>
<summary><strong>CRO Specialists</strong> (1 agent) &mdash; NEW in v3.0</summary>

| Agent | Use when... |
|:------|:------------|
| `saas-cro` | SaaS landing page/pricing/signup CRO |

</details>

<details>
<summary><strong>Review Skills</strong> (12 skills) &mdash; migrated to skills in v4.1</summary>

| Skill | Type | Focus |
|:------|:-----|:------|
| `review-all` | **Inline** (session context) | Full pre-push quality gate with severity calibration |
| `review-code` | context:fork | Logic errors, DRY, error handling, dead code |
| `review-code-style` | context:fork | Convention adherence, imports, naming, file org |
| `review-security` | context:fork | OWASP Top 10, injection, auth, secrets |
| `review-performance` | context:fork | N+1 queries, memory leaks, missing caching |
| `review-accessibility` | context:fork | WCAG 2.1 AA compliance |
| `review-api` | context:fork | API design, validation, rate limiting, REST consistency |
| `review-database` | context:fork | Migrations, RLS, schema, query patterns |
| `review-tests` | context:fork | Coverage, test quality, mocking, structure |
| `review-docs` | context:fork | Docblocks, comments, parameter docs |
| `review-best-practices` | context:fork | SOLID, design patterns, architecture health |
| `review-wordpress` | context:fork | WP coding standards, security, plugin architecture |

`review-all` runs inline for maximum efficiency. For large diffs (>500 lines), it delegates to specialized review skills via `context:fork`.

</details>

---

## Hooks

25 hooks run automatically on Claude Code lifecycle events across 10 event types. No invocation needed.

**Session & state management:**

| Hook | Event | What it does |
|:-----|:------|:------------|
| `session-load` | `SessionStart` | Restores previous session context |
| `session-save` | `Stop` | Persists session state to JSON snapshot |
| `project-triage` | `SessionStart` | Auto-detects project type, stack, and conventions |
| `load-context-rules` | `SessionStart` | Loads contexts and language-specific rules |
| `task-sync` | `SessionStart` + `Stop` | Bidirectional sync with TASKS.md |
| `pm-sync` | `SessionStart` + `Stop` | Loads PM state, reports blockers |
| `context-guard` | `PreCompact` | Backs up critical context before compaction |

**Quality automation:**

| Hook | Event | What it does |
|:-----|:------|:------------|
| `post-edit-format` | `PostToolUse` (Edit) | Auto-formats JS/TS after every edit (Biome or Prettier) |
| `post-edit-typecheck` | `PostToolUse` (Edit) | Runs `tsc --noEmit` after editing .ts/.tsx files |
| `post-edit-console-warn` | `PostToolUse` (Edit) | Warns about `console.log` in edited files |
| `console-log-audit` | `Stop` | Audits all modified files for console.log at session end |
| `permission-guard` | `PreToolUse` (Bash) | Mode-aware command safety: yields to classifier in auto-mode; blocklist + ask-cascade in default; blocklist-only in bypass |
| `dev-server-blocker` | `PreToolUse` (Bash) | Blocks `npm run dev` outside tmux |
| `git-push-reminder` | `PreToolUse` (Bash) | Warns before pushing to main/master |
| `secret-scan` | `PreToolUse` (Bash) | Blocks commits/pushes that introduce hardcoded secrets (override: `FORGEBEE_ALLOW_SECRET=1`) |
| `suggest-compact` | `PreToolUse` (Edit\|Write) | Suggests `/compact` at logical breakpoints |

**Continuous learning:**

| Hook | Event | What it does |
|:-----|:------|:------------|
| `observe` | `PreToolUse` + `PostToolUse` (*) | Captures every tool call lifecycle for pattern extraction |

**Intelligence & governance:**

| Hook | Event | What it does |
|:-----|:------|:------------|
| `skill-activator` | `UserPromptSubmit` | Intent detection + skill recommendations |
| `self-improve` | `Stop` | Captures patterns + runs heuristic engine to flag pending instincts |
| `checkpoint` | `PreCompact` | Saves the active pipeline phase (derived from `state.yaml`) before context compaction, for crash recovery |
| `audit-trail` | All governance events | Append-only JSONL log of permissions, debates, verifications |
| `permission-denied-logger` | `PermissionDenied` | Logs auto-mode classifier denials to audit trail |

**Quality gate hooks** (for Agent Teams):

| Hook | Event | What it does |
|:-----|:------|:------------|
| `TaskCompleted` | Task marked done | Verifies completion — accepts config/markdown tasks, demands evidence for code tasks |
| `TeammateIdle` | Agent going idle | Checks for unclaimed tasks to pick up |

### Platform parity

The **skills, agents, and commands** are portable — they ship to Claude Code, Codex, Cursor, and Gemini via the per-IDE manifests. The **hooks above are Claude Code-only**: they key on Claude Code's lifecycle events, so the automatic enforcement they provide does not run on the other harnesses.

| Capability | Claude Code | Codex / Cursor / Gemini |
|:-----------|:-----------:|:-----------------------:|
| Skills, agents, commands | ✅ | ✅ (via manifest) |
| 25 lifecycle hooks (permission-guard, secret-scan, audit-trail, …) | ✅ | ❌ |
| Governance / audit trail | ✅ | ❌ |
| Continuous learning (observe → instincts) | ✅ | ❌ |
| Auto project-triage routing | ✅ | ❌ |

On non-Claude harnesses you get the full prompt library; the guardrails, governance, and learning loop are Claude Code-only today.

---

## Quality Pipeline

ForgeBee embeds quality checks throughout the development flow so that `/review-all` is a **validation gate**, not a discovery phase.

```
Specialist agents implement + self-review → report DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT
      │
      ▼
Code debate (context:fork skills — blind advocate/skeptic/judge)
      │
      ▼
Workflow/Team quality gate (tests + lint + build must pass)
      │
      ▼
review-all (inline skill — runs in session context, only Critical/High block push)
```

**How it works:**

- **Every command** has an Objective (what success looks like) and Never rules (hard boundaries)
- **Every code-producing agent** has a Self-Review section matching review-all's criteria
- **Agent status protocol** — agents report `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`; orchestrators handle each appropriately
- **Review calibration** — only Critical/High issues block the push; Medium/Low are informational
- **`/workflow` Work Breakdown** defaults to a lightweight Implementation Plan (ordered workstreams + file scope + agent + acceptance criteria) — `scrum-master` full sprint stories are opt-in via `/workflow --scrum`
- **`/workflow` code debate** uses `context:fork` skills for blind isolation with less token overhead
- **`/team` quality gate** invokes review-all as an inline skill (session context, ~93% fewer tokens)
- **Instruction priority** — CLAUDE.md > Inline skills > Forked skills > Subagents > Defaults

If the pipeline works correctly, `review-all` finds nothing. Issues caught in review-all mean the pipeline leaked.

---

## Continuous Learning

ForgeBee learns from your sessions automatically. Every tool call is observed (PreToolUse + PostToolUse), patterns are detected by a heuristic engine, and candidates are surfaced for your approval.

```
Session Activity (every tool call)
      │
      ▼
  observations.jsonl (automatic — Pre + Post)
      │
      ▼  Stop hook heuristics (no API calls)
  pending-instincts.jsonl (auto-detected candidates)
      │
      ▼  /learn (review + approve/reject)
  instincts/personal/ (project-scoped, active)
      │
      ▼  /evolve
  evolved/ → skills, commands, agents
```

**Key concepts:**

- **Two-stage pipeline** — heuristics flag candidates automatically; `/learn` lets you review and approve
- **Pending instincts** — auto-detected patterns start in `pending` state, never activate without your approval
- **Instincts** are atomic patterns: one trigger, one action, confidence-scored (0.3–0.9)
- **Project-scoped** by default — React patterns stay in your React project, Python conventions in your Python project
- **Global promotion** — when the same instinct appears in 2+ projects with ≥0.8 confidence, it's promoted to global
- **Zero-config observation** — the `observe.js` hook captures every tool call silently (3s timeout, never blocks)
- **Portable** — export/import instincts across machines and teammates

Storage lives at `~/.claude/forgebee-learning/` with per-project isolation via git remote URL hashing.

---

## Growth OS

A 9-phase marketing pipeline with 18 specialist agents, invoked with `/growth`:

```
Brand Foundation ──► Market Intelligence ──► Content Architecture
        │                    │                       │
        ▼                    ▼                       ▼
   Hook & Idea Engine ──► Strategy Debate ──► Execution Plan
        │                    │                       │
        ▼                    ▼                       ▼
  Content Production ──► Distribution & CRO ──► Measure & Optimize
```

The strategy debate phase uses blind Advocate/Skeptic/Judge review — the same pattern as `/workflow`'s code debate, applied to marketing strategy. Catches weak positioning before you invest in execution.

Includes dedicated agents for CRO (conversion rate optimization), email marketing automation, and competitive intelligence.

---

## Project Management

ForgeBee tracks features across sessions with a hybrid YAML + Markdown system:

```
docs/pm/
├── state.yaml        ← Machine-readable project state
├── index.md          ← Auto-generated dashboard
├── decisions.md      ← Decision log from all debates
└── features/         ← Per-feature detail pages
```

Every `/workflow`, `/growth`, `/idea`, and `/plan` run reads and writes `state.yaml` at each phase transition. The `pm-sync` hook loads state on session start. Run `/pm` anytime for a full status report.

---

## How It Works

ForgeBee is **markdown files and Node.js scripts**. No runtime dependencies, no build step, no bash, no python.

- **Commands** are `.md` files — structured prompts that activate workflows
- **Agents** are `.md` files — specialist definitions with trigger conditions
- **Skills** are directories with `SKILL.md` + scripts — auto-triggered capabilities
- **Hooks** are `.js` scripts wired to Claude Code lifecycle events via `hooks.json`
- **Audit trail** is an append-only JSONL log — every permission, debate, and verification is recorded

Claude Code reads them natively. The plugin system handles distribution.

<details>
<summary><strong>Full installed structure</strong></summary>

```
your-project/
├── CLAUDE.md                          # Project memory
├── TASKS.md                           # Auto-managed task tracking
├── docs/
│   ├── pm/                            # Project management
│   │   ├── state.yaml
│   │   ├── index.md
│   │   ├── decisions.md
│   │   └── features/
│   ├── marketing/                     # Growth OS outputs
│   └── planning/                      # Planning artifacts
│       ├── briefs/
│       ├── requirements/
│       └── stories/
└── .claude/
    ├── settings.json
    ├── sessions/                      # Session snapshots
    ├── session-cache/                 # Permissions + skill manifest
    ├── audit/                         # Governance audit trail (JSONL)
    └── learnings/
        ├── learnings.md              # Auto-captured patterns
        └── pending-instincts.jsonl   # Heuristic-detected candidates

~/.claude/forgebee-learning/           # Continuous learning (persists globally)
├── projects.json                      # Project registry
├── instincts/personal/                # Global learned instincts
└── projects/<hash>/                   # Per-project isolation
    ├── observations.jsonl             # Tool call observations
    └── instincts/personal/            # Project-scoped instincts
```

</details>

---

## CLAUDE.md &mdash; Project Memory

The installed `CLAUDE.md` is a structured template Claude reads at the start of every session. Fill in your stack, conventions, key components, and team contacts.

The `self-improve` hook appends patterns to the **Learned Patterns** section automatically. The continuous learning system goes further — observing every tool call and building project-scoped instincts with confidence scoring that persist across sessions.

---

## OpenClaw

ForgeBee is fully compatible with [OpenClaw](https://github.com/openclaw/openclaw). All 45 agents and 39 commands convert to OpenClaw skills.

```bash
# Clone ForgeBee
git clone git@github.com:forbee-dev/ClaudeDevKit.git

# Install for OpenClaw
node ClaudeDevKit/openclaw/install-openclaw.js
```

This converts every agent and command into `SKILL.md` files in `~/.openclaw/workspace/skills/forgebee-*`. Skills auto-trigger based on their descriptions — the same ones optimized from the [Superpowers trigger pattern](#why-forgebee).

<details>
<summary><strong>How the conversion works</strong></summary>

- Each agent becomes `forgebee-<agent-name>/SKILL.md`
- Each command becomes `forgebee-cmd-<command-name>/SKILL.md` (user-invocable)
- YAML frontmatter maps: `name` + `description` + `metadata.openclaw`
- Agent body instructions transfer directly (markdown is markdown)
- Model preferences are noted but OpenClaw handles model selection through its own config

</details>

---

## Contributing

Contributions welcome! ForgeBee is markdown surfaces and Node.js scripts. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the surface contracts (agent/skill/command structure, the load-bearing Status + adversarial-hardening contract, the model-tier policy, output modes) and **[ARCHITECTURE.md](./ARCHITECTURE.md)** for how the pieces fit together.

1. Fork the repo
2. Add your command (`forgebee/commands/your-command.md`), agent (`forgebee/agents/your-agent.md`), or skill (`forgebee/skills/your-skill/SKILL.md`) — follow the contract in CONTRIBUTING.md
3. Run `node scripts/build-index.js` to regenerate the routing index
4. Run `npm run check` — index sync + persona references + agent contract + version sync + eval must all pass (CI gates the PR on this)
5. If you added/removed a surface, update the count strings in the manifests + READMEs (versions sync via `bump-version.sh`; counts are manual). Cut releases with `/release`.
6. Open a PR

**Release notes:** see [`CHANGELOG.md`](./CHANGELOG.md). The `v5.1.0` entry is the canonical reference for all the discipline patterns (Karpathy P1-P6, prompt defense, budget circuit breaker, terse-report, etc.).

---

## License

[MIT](LICENSE) &mdash; use it however you want.

<p align="center">
  <sub>Built with Claude Code by <a href="https://github.com/forbee-dev">Forbee Dev</a> at <a href="https://raketech.com">Raketech</a></sub>
</p>
