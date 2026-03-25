<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-7C3AED?style=for-the-badge&logoColor=white" alt="Claude Code" />
  <img src="https://img.shields.io/badge/OpenClaw-Compatible-FF6B35?style=for-the-badge&logoColor=white" alt="OpenClaw" />
  <img src="https://img.shields.io/badge/version-4.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/agents-69-orange?style=for-the-badge" alt="Agents" />
  <img src="https://img.shields.io/badge/commands-33-red?style=for-the-badge" alt="Commands" />
  <img src="https://img.shields.io/badge/hooks-26-blueviolet?style=for-the-badge" alt="Hooks" />
  <img src="https://img.shields.io/badge/skills-3-teal?style=for-the-badge" alt="Skills" />
</p>

<h1 align="center">ForgeBee</h1>

<p align="center">
  <strong>A colony of AI agents forging your product</strong><br/>
  69 specialist agents. 33 slash commands. 26 lifecycle hooks. 3 skills.<br/>
  Mode-aware permissions. Continuous learning. Adversarial debate. Growth OS.<br/>
  Command-to-agent delegation. Manifest-driven sync. Pure Node.js. Zero deps.<br/>
  <em>Works with Claude Code and OpenClaw.</em>
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
| Single-agent, single-pass | 69 specialists working in parallel with blind review |
| Manual project tracking | Automated state.yaml + markdown dashboards |
| No marketing workflow | Full 9-phase Growth OS with 13 marketing agents + 3 strategy debate agents |
| Every session starts from scratch | Continuous learning — heuristic pattern detection + pending instinct approval |
| Edits break silently | Auto-format, typecheck, and lint on every edit |
| Permission prompts everywhere | Mode-aware permissions — respects auto-mode and bypass with non-negotiable blocklist |
| Commands duplicate agent logic | Commands delegate to specialist agents with automatic fallback |

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
git clone git@github.com:forbee-dev/ForgeBee.git
claude --plugin-dir ./ForgeBee/forgebee
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

### Growth & Marketing

| Command | Description |
|:--------|:------------|
| `/growth` | **9-phase Growth OS** with adversarial debate (18 agents) |
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
| `/workflow` | **Full pipeline**: Plan &rarr; Batched Debate &rarr; Architect &rarr; Scrum &rarr; Execute (JSON contracts) &rarr; Debate &rarr; Deliver |
| `/team` | Multi-agent orchestration with dependency graphs + checkpoints at 3+ agents |
| `/idea` | Idea &rarr; validate &rarr; debate &rarr; MVP &rarr; roadmap |
| `/pm` | Project dashboard from `state.yaml` |
| `/audit` | Governance audit trail — permission decisions, debate rulings, verification results |

---

## Agents

69 specialist agents for Claude Code's Agent Teams. Use them directly or let `/team` and `/workflow` orchestrate automatically.

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
<summary><strong>Dev Debate</strong> (6 agents)</summary>

| Agent | Role |
|:------|:-----|
| `requirements-advocate` | Defends planning artifacts (blind) |
| `requirements-skeptic` | Challenges planning artifacts (blind) |
| `requirements-judge` | Rules: approve / block / flag |
| `code-advocate` | Defends implementation (blind) |
| `code-skeptic` | Challenges implementation (blind) |
| `code-judge` | Rules: approve / block / flag |

</details>

<details>
<summary><strong>Strategy Debate</strong> (3 agents)</summary>

| Agent | Role |
|:------|:-----|
| `strategy-advocate` | Defends marketing strategy (blind) |
| `strategy-skeptic` | Challenges marketing strategy (blind) |
| `strategy-judge` | Rules: approve / block / flag |

</details>

<details>
<summary><strong>Growth OS</strong> (13 agents)</summary>

| Agent | Use when... |
|:------|:------------|
| `brand-strategist` | Brand positioning, archetypes, voice |
| `market-intel` | Competitive research, battlecards |
| `audience-architect` | ICPs, personas, buyer journeys |
| `content-architect` | Pillars, topic clusters, hub-and-spoke |
| `hook-engineer` | Scroll-stopping hooks, pattern interrupts |
| `idea-machine` | Content ideas, angle mining, repurposing |
| `engagement-strategist` | Community, reciprocity loops, DM flows |
| `content-creator` | Platform-native posts, threads, scripts |
| `growth-hacker` | Growth loops, flywheels, funnels |
| `calendar-builder` | Content calendars, batching, distribution |
| `performance-analyst` | Marketing KPIs, attribution, A/B testing |
| `conversion-optimizer` | CRO audits, funnel optimization, pricing pages |
| `email-strategist` | Automation flows, segmentation, deliverability |

</details>

<details>
<summary><strong>Design, Research & Platform</strong> (10 agents)</summary>

| Agent | Use when... |
|:------|:------------|
| `ux-designer` | User flows, wireframes, accessibility |
| `scrum-master` | Sprint planning, story decomposition |
| `deep-researcher` | Documentation, APIs, technical questions |
| `content-writer` | Landing copy, docs, blog posts |
| `seo-specialist` | Keyword strategy, pillar/cluster SEO |
| `session-librarian` | Session history, context management |
| `supabase-specialist` | Supabase auth, RLS, edge functions |
| `ios-expert` | Swift, SwiftUI, Xcode, App Store |
| `flutter-expert` | Dart, Flutter, cross-platform |
| `n8n-builder` | n8n workflows, API integrations |

</details>

<details>
<summary><strong>WordPress Specialists</strong> (7 agents) &mdash; NEW in v3.0</summary>

| Agent | Use when... |
|:------|:------------|
| `wordpress-backend` | WordPress PHP backend, REST endpoints, ACF, hooks |
| `wordpress-frontend` | WordPress theme dev, block themes, template hierarchy |
| `wordpress-content` | WordPress Gutenberg content, block patterns, ACF content |
| `wordpress-security` | WordPress security audit, sanitization, WPCS |
| `wordpress-seo` | WordPress SEO, Yoast/RankMath, XML sitemaps |
| `phpunit-engineer` | WordPress PHPUnit testing, WP_UnitTestCase |
| `woocommerce-cro` | WooCommerce checkout/product page CRO |

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
<summary><strong>Review Sub-Agents</strong> (12 agents) &mdash; NEW in v3.1</summary>

| Agent | Focus |
|:------|:------|
| `review-all` | Full pre-push quality gate (all checks) |
| `review-code` | Logic errors, DRY, error handling, dead code |
| `review-code-style` | Convention adherence, imports, naming, file org |
| `review-security` | OWASP Top 10, injection, auth, secrets |
| `review-performance` | N+1 queries, memory leaks, missing caching |
| `review-accessibility` | WCAG 2.1 AA compliance |
| `review-api` | API design, validation, rate limiting, REST consistency |
| `review-database` | Migrations, RLS, schema, query patterns |
| `review-tests` | Coverage, test quality, mocking, structure |
| `review-docs` | Docblocks, comments, parameter docs |
| `review-best-practices` | SOLID, design patterns, architecture health |
| `review-wordpress` | WP coding standards, security, plugin architecture |

</details>

---

## Hooks

26 hooks run automatically on Claude Code lifecycle events across 9 event types. No invocation needed.

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
| `permission-guard` | `PreToolUse` (Bash) | Mode-aware command safety: detects auto/bypass/default; Tier 0 blocklist always active |
| `dev-server-blocker` | `PreToolUse` (Bash) | Blocks `npm run dev` outside tmux |
| `git-push-reminder` | `PreToolUse` (Bash) | Warns before pushing to main/master |
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
| `checkpoint` | Phase transitions | Saves pipeline state for crash recovery |
| `audit-trail` | All governance events | Append-only JSONL log of permissions, debates, verifications |

**Quality gate hooks** (for Agent Teams):

| Hook | Event | What it does |
|:-----|:------|:------------|
| `TaskCompleted` | Task marked done | Demands evidence-based verification before accepting |
| `TeammateIdle` | Agent going idle | Checks for unclaimed tasks to pick up |

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

ForgeBee is fully compatible with [OpenClaw](https://github.com/openclaw/openclaw). All 69 agents and 33 commands convert to OpenClaw skills.

```bash
# Clone ForgeBee
git clone git@github.com:forbee-dev/ForgeBee.git

# Install for OpenClaw
node ForgeBee/openclaw/install-openclaw.js
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

Contributions welcome! ForgeBee is markdown files and Node.js scripts — easy to extend.

1. Fork the repo
2. Add your command (`commands/your-command.md`) or agent (`agents/your-agent.md`)
3. Update counts in `plugin.json`
4. Open a PR

---

## License

[MIT](LICENSE) &mdash; use it however you want.

<p align="center">
  <sub>Built with Claude Code by <a href="https://github.com/forbee-dev">Forbee Dev</a> at <a href="https://raketech.com">Raketech</a></sub>
</p>
