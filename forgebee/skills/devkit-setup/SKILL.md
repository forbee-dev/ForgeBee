---
name: devkit-setup
description: >
  This skill should be used when the user asks to "set up DevKit", "initialize project",
  "configure CLAUDE.md", "set up project memory", "initialize PM system", "set up project
  management", or needs help getting started with the DevKit framework. Also triggers on
  "what commands are available", "how do I use DevKit", or "DevKit help".
version: 1.1.0
---

# DevKit Setup & Configuration

Initialize and configure the DevKit development framework for any project. Walk the user through
setting up project memory, task tracking, and the project management system.

## First-Time Setup

When the user wants to initialize DevKit for their project:

1. **Create CLAUDE.md** from the template at `${CLAUDE_PLUGIN_ROOT}/skills/devkit-setup/references/claude-md-template.md`
   - Ask the user to fill in: stack, conventions, key components, common commands
   - Write to the project root

2. **Create TASKS.md** if it doesn't exist
   - Initialize with empty Active/Waiting On/Done sections

3. **Initialize PM system** by copying templates:
   - `docs/pm/state.yaml` from `${CLAUDE_PLUGIN_ROOT}/templates/docs/pm/state.yaml`
   - `docs/pm/index.md` from `${CLAUDE_PLUGIN_ROOT}/templates/docs/pm/index.md`
   - `docs/pm/decisions.md` from `${CLAUDE_PLUGIN_ROOT}/templates/docs/pm/decisions.md`
   - Create `docs/pm/features/` directory
   - Create `docs/planning/briefs/`, `docs/planning/requirements/`, `docs/planning/stories/`

4. **Create session directories**
   - `.claude/sessions/`
   - `.claude/session-cache/context-backups/`
   - `.claude/learnings/learnings.md`

## Command Reference

### Planning (BMAD-inspired)
- `/plan` — Phased planning: Brief → Requirements → Architecture → Sprint Stories

### Development
- `/review` — Code review (structural, security, performance)
- `/debug` — Systematic debugging (reproduce, isolate, fix)
- `/architect` — Architecture decisions with trade-off analysis
- `/refactor` — Safe refactoring with test verification
- `/test` — Test generation (unit, integration, e2e)
- `/docs` — Documentation writing (API, guides, ADRs)
- `/security` — Security audit (OWASP, secrets, dependencies)
- `/perf` — Performance optimization (profile, optimize, measure)
- `/migrate` — Version/framework migrations with rollback plans
- `/deploy` — Deployment with pre-flight checks and rollback
- `/browser-debug` — Client-side debugging (console, network, rendering)

### Growth & Marketing
- `/gtm` — Go-to-market planning with launch checklists
- `/seo` — SEO audit, keyword research, and optimization
- `/social` — Social media strategy and content calendars
- `/launch` — Product launch (Product Hunt, HN, press)
- `/competitive` — Competitive intelligence and battlecards
- `/landing` — Conversion-optimized landing page builder
- `/payments` — Stripe/LemonSqueezy/Paddle integration
- `/analytics` — Event tracking, dashboards, and metrics

### Meta
- `/workflow` — Full pipeline orchestrator with adversarial debate
- `/team` — Lightweight multi-agent orchestration
- `/idea` — Idea-to-product validation and MVP planning
- `/pm` — Automated project management dashboards

## Specialist Agents (26)

For Agent Teams delegation:
frontend, backend, database, security, testing, devops, perf, debug, research, content, seo,
supabase, ios, flutter, n8n, session-librarian, ux-designer, scrum-master,
requirements-advocate/skeptic/judge, code-advocate/skeptic/judge, delivery-agent,
dashboard-generator

## Additional Resources

- **`references/claude-md-template.md`** — Full CLAUDE.md template for project memory
- **`references/pm-overview.md`** — Project management system documentation
