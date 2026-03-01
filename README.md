<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-7C3AED?style=for-the-badge&logoColor=white" alt="Claude Code" />
  <img src="https://img.shields.io/badge/OpenClaw-Compatible-FF6B35?style=for-the-badge&logoColor=white" alt="OpenClaw" />
  <img src="https://img.shields.io/badge/version-2.4.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/agents-45-orange?style=for-the-badge" alt="Agents" />
  <img src="https://img.shields.io/badge/commands-27-red?style=for-the-badge" alt="Commands" />
  <img src="https://img.shields.io/badge/hooks-11-blueviolet?style=for-the-badge" alt="Hooks" />
</p>

<h1 align="center">ForgeBee</h1>

<p align="center">
  <strong>A colony of AI agents forging your product</strong><br/>
  45 specialist agents. 27 slash commands. 11 lifecycle hooks.<br/>
  Adversarial debate. Growth OS. Project management. Zero dependencies.<br/>
  <em>Works with Claude Code and OpenClaw.</em>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &nbsp;&bull;&nbsp;
  <a href="#commands">Commands</a> &nbsp;&bull;&nbsp;
  <a href="#agents">Agents</a> &nbsp;&bull;&nbsp;
  <a href="#hooks">Hooks</a> &nbsp;&bull;&nbsp;
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
| Single-agent, single-pass | 44 specialists working in parallel with blind review |
| Manual project tracking | Automated state.yaml + markdown dashboards |
| No marketing workflow | Full 9-phase Growth OS with 18 marketing agents |

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
<summary><strong>Other installation methods</strong></summary>

### Plugin from local directory

```bash
git clone git@github.com:forbee-dev/ForgeBee.git
claude --plugin-dir ./ForgeBee/forgebee
```

### Manual install (legacy)

```bash
git clone git@github.com:forbee-dev/ForgeBee.git
bash ForgeBee/install.sh /path/to/your/project
```

</details>

<details>
<summary><strong>Requirements</strong></summary>

- Claude Code 1.0.33+
- Bash 4+
- `jq` optional (settings validation)
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
| `/debug` | Systematic: reproduce &rarr; isolate &rarr; diagnose &rarr; fix &rarr; prevent |
| `/architect` | Architecture decisions with trade-off matrices and ADR generation |
| `/refactor` | Safe refactoring with test verification at each step |
| `/test` | Test generation: unit &rarr; integration &rarr; e2e |
| `/docs` | API docs, READMEs, ADRs, guides |
| `/security` | OWASP Top 10 audit with threat modeling |
| `/perf` | Profile &rarr; optimize &rarr; measure |
| `/migrate` | Version/framework migration with rollback plans |
| `/deploy` | Pre-flight checks, rollout, post-deploy verification |
| `/browser-debug` | Console, network, rendering, Core Web Vitals |

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

### Meta

| Command | Description |
|:--------|:------------|
| `/workflow` | **Full pipeline**: Plan &rarr; Debate &rarr; Architect &rarr; Scrum &rarr; Execute &rarr; Debate &rarr; Verify &rarr; Deliver |
| `/team` | Lightweight multi-agent orchestration (no debate ceremony) |
| `/idea` | Idea &rarr; validate &rarr; debate &rarr; MVP &rarr; roadmap |
| `/pm` | Project dashboard from `state.yaml` |
| `/audit` | Governance audit trail — permission decisions, debate rulings, verification results |

---

## Agents

44 specialist agents for Claude Code's Agent Teams. Use them directly or let `/team` and `/workflow` orchestrate automatically.

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

---

## Hooks

Hooks run automatically on Claude Code lifecycle events. No invocation needed.

| Hook | Event | What it does |
|:-----|:------|:------------|
| `permission-guard` | `PreToolUse` | 3-tier command safety: allowlist &rarr; blocklist &rarr; ask user |
| `skill-activator` | `UserPromptSubmit` | Intent detection + skill recommendations |
| `session-load` | `SessionStart` | Restores previous session context |
| `session-save` | `Stop` | Persists session state to JSON snapshot |
| `checkpoint` | Phase transitions | Saves pipeline state for crash recovery — resume from last phase |
| `audit-trail` | All governance events | Append-only log of permissions, debates, verifications, escalations |
| `self-improve` | `Stop` | Captures patterns into learnings |
| `task-sync` | `SessionStart` + `Stop` | Bidirectional sync with TASKS.md |
| `pm-sync` | `SessionStart` + `Stop` | Loads PM state, reports blockers |
| `context-guard` | `PreCompact` | Backs up critical context before compaction |

**Quality gate hooks** (for Agent Teams):

| Hook | Event | What it does |
|:-----|:------|:------------|
| `TaskCompleted` | Task marked done | Demands evidence-based verification before accepting |
| `TeammateIdle` | Agent going idle | Checks for unclaimed tasks to pick up |

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

ForgeBee is **just markdown and shell scripts**. No runtime, no dependencies, no build step.

- **Commands** are `.md` files in `.claude/commands/` — structured prompts that activate workflows
- **Agents** are `.md` files in `.claude/agents/` — specialist definitions with trigger conditions
- **Hooks** are `.sh` scripts wired to Claude Code lifecycle events via `hooks.json`
- **Audit trail** is an append-only JSONL log in `.claude/audit/` — every permission, debate, and verification is recorded

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
│   │   ├── brand/
│   │   ├── intel/
│   │   ├── audience/
│   │   ├── content-architecture/
│   │   ├── hooks/
│   │   ├── ideas/
│   │   ├── engagement/
│   │   ├── growth/
│   │   ├── analytics/
│   │   ├── calendar/
│   │   ├── cro/
│   │   ├── email/
│   │   └── debate/
│   └── planning/                      # Planning artifacts
│       ├── briefs/
│       ├── requirements/
│       └── stories/
└── .claude/
    ├── settings.json
    ├── hooks/
    │   └── *.sh                       # 8 lifecycle hook scripts
    ├── commands/
    │   └── *.md                       # 26 slash commands
    ├── agents/
    │   └── *.md                       # 44 specialist agents
    ├── sessions/                      # Session snapshots
    ├── session-cache/                 # Permissions + skill manifest
    └── learnings/
        └── learnings.md              # Auto-captured patterns
```

</details>

---

## CLAUDE.md &mdash; Project Memory

The installed `CLAUDE.md` is a structured template Claude reads at the start of every session. Fill in your stack, conventions, key components, and team contacts.

The `self-improve` hook appends patterns to the **Learned Patterns** section automatically over time — your agent gets smarter the more you use it.

---

## OpenClaw

ForgeBee is fully compatible with [OpenClaw](https://github.com/openclaw/openclaw). All 44 agents and 26 commands convert to OpenClaw skills.

```bash
# Clone ForgeBee
git clone git@github.com:forbee-dev/ForgeBee.git

# Install for OpenClaw
bash ForgeBee/openclaw/install-openclaw.sh
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

Contributions welcome! ForgeBee is markdown and shell scripts — easy to extend.

1. Fork the repo
2. Add your command (`.claude/commands/your-command.md`) or agent (`.claude/agents/your-agent.md`)
3. Update counts in `install.sh` and `plugin.json`
4. Open a PR

---

## License

[MIT](LICENSE) &mdash; use it however you want.

<p align="center">
  <sub>Built with Claude Code by <a href="https://github.com/forbee-dev">Forbee Dev</a> at <a href="https://raketech.com">Raketech</a></sub>
</p>
