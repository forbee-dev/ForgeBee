# ClaudeDevKit — Batteries included for Claude Code

A drop-in framework that extends Claude Code with production-ready hooks, slash commands, and specialist agent definitions. Install once, works in any project.

No runtime. No dependencies. No build step. Just shell scripts and markdown that Claude Code reads natively.

---

## Quick Start

```bash
# Clone DevKit
git clone git@github.com:forbee-dev/ClaudeDevKit.git

# Install into your project
bash ClaudeDevKit/install.sh /path/to/your/project

# Or install into the current directory
cd your-project && bash /path/to/ClaudeDevKit/install.sh .
```

Then:

1. Edit `CLAUDE.md` with your project details (stack, conventions, key people)
2. Open Claude Code in your project directory
3. Start working — the hooks activate automatically, commands are available immediately

**Requires:** Bash 4+, Claude Code. `jq` is optional (used for settings validation).

---

## What's Included

| Category | Count | What it does |
|----------|-------|--------------|
| Hooks | 8 | Shell scripts wired to Claude Code lifecycle events |
| Commands | 24 | Slash commands that activate specialized workflows |
| Agents | 26 | Specialist agent definitions for multi-agent teams |

---

## Hooks

Hooks run automatically — no invocation needed. They fire on Claude Code lifecycle events defined in `.claude/settings.json`.

| Hook | Lifecycle Event | What it does |
|------|----------------|--------------|
| `permission-guard.sh` | `PreToolUse` (Bash) | 3-tier command safety: allowlist auto-approves safe commands (git status, npm test, etc.), blocklist blocks destructive patterns (rm -rf /, DROP TABLE, curl \| bash), cache remembers past decisions, then asks the user |
| `skill-activator.sh` | `UserPromptSubmit` | Reads your prompt and recommends relevant commands from the skill manifest |
| `session-load.sh` | `SessionStart` | Restores previous session context (branch, uncommitted changes, recent commits) so Claude remembers where you left off |
| `session-save.sh` | `Stop` | Persists session state to a JSON snapshot in `.claude/sessions/` |
| `self-improve.sh` | `Stop` | Auto-captures patterns and learnings from the session into `.claude/learnings/learnings.md` |
| `task-sync.sh` | `SessionStart` + `Stop` | Bidirectional sync with `TASKS.md` — loads active tasks on start, archives completed ones on stop |
| `pm-sync.sh` | `SessionStart` + `Stop` | Loads PM state, reports active features and blockers, detects stale features |
| `context-guard.sh` | `PreCompact` | Backs up critical context before compaction so nothing is lost |

---

## Commands

Invoke any command with a slash in Claude Code: `/review`, `/debug`, `/test`, etc.

### Planning (BMAD-inspired)

| Command | What it does |
|---------|--------------|
| `/plan` | Phased planning workflow: Brief → Requirements → Architecture → Sprint Stories. Enforces artifact-first development with complexity routing (trivial changes skip ceremony, critical features get the full chain). Outputs versioned artifacts to `docs/planning/`. Auto-tracks in PM system. |

### Development

| Command | What it does |
|---------|--------------|
| `/review` | Multi-dimensional code review: structure, security, performance, correctness |
| `/debug` | Systematic debugging: reproduce → isolate → diagnose → fix → prevent |
| `/architect` | Architecture decisions with trade-off matrices and ADR generation |
| `/refactor` | Safe refactoring with mandatory test verification at each step |
| `/test` | Test generation following the testing pyramid: unit → integration → e2e |
| `/docs` | Documentation writer for API docs, READMEs, ADRs, and guides |
| `/security` | OWASP Top 10 audit with threat modeling |
| `/perf` | Performance optimization: baseline → profile → optimize → measure |
| `/migrate` | Version or framework migration with rollback plans |
| `/deploy` | Deployment coordinator with pre-flight checklist and post-deploy verification |
| `/browser-debug` | Client-side debugging: console errors, network, rendering, Core Web Vitals |

### Growth & Marketing

| Command | What it does |
|---------|--------------|
| `/gtm` | Go-to-market planning with launch checklists and timeline |
| `/seo` | Technical SEO audit, keyword research, on-page optimization |
| `/social` | Social media strategy with platform playbooks and content calendars |
| `/launch` | Product Hunt / Hacker News / press launch execution |
| `/competitive` | Competitive intelligence with battlecards |
| `/landing` | Conversion-optimized landing page builder (single HTML + Tailwind) |
| `/payments` | Stripe / LemonSqueezy / Paddle integration with webhook handlers |
| `/analytics` | Event tracking setup, dashboard specs, metrics framework |

### Meta

| Command | What it does |
|---------|--------------|
| `/workflow` | Full pipeline orchestrator with adversarial debate: Plan → Debate → Architect → Scrum → Execute → Debate → Deliver. Main agent never executes — only delegates, connects, and ships requirements. Includes blind Advocate/Skeptic/Judge review at requirements and code checkpoints. Auto-tracks in PM system. |
| `/team` | Lightweight orchestrator: breaks tasks into parallel workstreams and delegates to specialist agents (ad-hoc, without debate ceremony) |
| `/idea` | Idea-to-product: validate → debate → define MVP → debate → pick stack → create roadmap. Auto-tracks in PM system. |
| `/pm` | Automated project management — reads `state.yaml`, syncs `TASKS.md`, regenerates markdown dashboards, surfaces blockers and stale features |

---

## Agents

Specialist agent definitions for Claude Code's Agent Teams feature. Invoke them directly or let `/team` orchestrate them automatically.

**Development**

| Agent | Specialty |
|-------|-----------|
| `frontend-specialist` | UI, components, accessibility, performance |
| `backend-engineer` | APIs, services, data modeling |
| `database-specialist` | Schema design, queries, migrations, optimization |
| `security-auditor` | Threat modeling, vulnerability assessment, hardening |
| `test-engineer` | Test strategy, coverage, quality gates |
| `devops-engineer` | CI/CD, infrastructure, containers, deployments |
| `performance-optimizer` | Profiling, bottlenecks, caching strategies |
| `debugger-detective` | Root cause analysis, tracing, log investigation |

**Design & Planning**

| Agent | Specialty |
|-------|-----------|
| `ux-designer` | User flows, wireframes, interaction patterns, usability heuristics, accessibility |
| `scrum-master` | Sprint planning, story decomposition, backlog grooming, estimation, dependency mapping |

**Adversarial Debate (used by `/workflow`)**

| Agent | Specialty |
|-------|-----------|
| `requirements-advocate` | Argues FOR planning artifacts — defends quality, feasibility, completeness |
| `requirements-skeptic` | Argues AGAINST planning artifacts — finds gaps, risks, flawed assumptions |
| `requirements-judge` | Rules on each debated item — approve, block, or flag with escalation |
| `code-advocate` | Argues FOR implementation — defends code quality, test coverage, correctness |
| `code-skeptic` | Argues AGAINST implementation — finds bugs, security holes, missed requirements |
| `code-judge` | Rules on each code item — approve, block, or flag with escalation |

**Delivery**

| Agent | Specialty |
|-------|-----------|
| `delivery-agent` | Integration verification, changelog generation, doc updates, deployment readiness |
| `dashboard-generator` | Reads `state.yaml` and regenerates all PM markdown dashboards |

**Research & Content**

| Agent | Specialty |
|-------|-----------|
| `deep-researcher` | Technical research, documentation synthesis |
| `content-writer` | Technical writing, docs, landing copy |
| `seo-specialist` | Search optimization, keyword strategy |
| `session-librarian` | Session history retrieval and context management |

**Platform**

| Agent | Specialty |
|-------|-----------|
| `supabase-specialist` | Supabase auth, database, storage, edge functions |
| `ios-expert` | Swift, SwiftUI, Xcode, App Store |
| `flutter-expert` | Dart, Flutter, cross-platform mobile |
| `n8n-builder` | n8n workflows, automation, integrations |

---

## How It Works

Claude Code supports lifecycle hooks — shell scripts or prompts that fire at specific points in the agent's execution:

- **SessionStart** — runs when you open a project in Claude Code
- **UserPromptSubmit** — runs each time you send a message
- **PreToolUse** — runs before any tool call (Bash, file writes, etc.)
- **PreCompact** — runs before Claude compacts its context window
- **Stop** — runs when the session ends
- **TaskCompleted / TeammateIdle** — quality gates for multi-agent teams

DevKit wires all eight hooks to these events via `.claude/settings.json`. No manual setup required after installation.

Slash commands are markdown files in `.claude/commands/`. Claude Code reads them natively — each file is a structured prompt that activates a specialized workflow.

Agent definitions in `.claude/agents/` follow the same pattern. The `/team` command uses them as a delegation layer for parallel multi-agent work.

---

## Installed Structure

After running `install.sh`, your project gets:

```
your-project/
├── CLAUDE.md                          # Project memory (stack, conventions, people, patterns)
├── TASKS.md                           # Auto-managed task tracking
├── docs/
│   ├── pm/                            # Project management (auto-managed)
│   │   ├── state.yaml                 # Machine-readable project state
│   │   ├── index.md                   # Project dashboard (auto-generated)
│   │   ├── decisions.md               # Decision log (auto-generated)
│   │   └── features/                  # Per-feature detail pages
│   └── planning/                      # Planning artifacts from /plan
│       ├── briefs/
│       ├── requirements/
│       └── stories/
└── .claude/
    ├── settings.json                  # Hook wiring and environment config
    ├── hooks/
    │   ├── permission-guard.sh
    │   ├── skill-activator.sh
    │   ├── session-load.sh
    │   ├── session-save.sh
    │   ├── self-improve.sh
    │   ├── task-sync.sh
    │   ├── pm-sync.sh
    │   └── context-guard.sh
    ├── commands/
    │   └── *.md                       # 24 slash command definitions
    ├── agents/
    │   └── *.md                       # 26 specialist agent definitions
    ├── sessions/                      # Session snapshots (auto-managed)
    ├── session-cache/                 # Permissions cache, skill manifest
    └── learnings/
        └── learnings.md              # Auto-captured patterns (auto-managed)
```

If a `.claude/settings.json` already exists, the installer backs it up to `settings.json.bak` before writing the new one. `CLAUDE.md` is never overwritten if one already exists.

---

## CLAUDE.md — Project Memory

The installed `CLAUDE.md` is a structured template Claude Code reads at the start of every session. Fill in your stack, conventions, key components, common commands, and team contacts.

The `self-improve` hook appends captured patterns to the `Learned Patterns` section automatically over time.

---

## Project Management System

DevKit includes an automated PM layer that tracks features across sessions. The system uses a hybrid YAML + Markdown approach:

- **`docs/pm/state.yaml`** — Machine-readable project state (features, stories, decisions, risks, counters)
- **`docs/pm/index.md`** — Auto-generated project dashboard
- **`docs/pm/features/*.md`** — Per-feature detail pages
- **`docs/pm/decisions.md`** — Append-only decision log from all debates

The PM system is fully automated — `/workflow`, `/idea`, and `/plan` all read and write `state.yaml` at every phase transition. The `pm-sync` hook loads state on session start and reports active features, blockers, and stale items. Run `/pm` at any time for a full status report with regenerated dashboards.

Features enter the lifecycle at different points depending on their origin: `/idea` starts at the `idea` phase, `/plan` starts at `planning`, and `/workflow` starts at `planning` or resumes an existing feature.

---

## License

MIT
