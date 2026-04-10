---
name: forgebee-setup
description: >
  This skill should be used when the user asks to "set up ForgeBee", "initialize project",
  "configure CLAUDE.md", "set up project memory", "initialize PM system", "set up project
  management", or needs help getting started with the ForgeBee framework. Also triggers on
  "what commands are available", "how do I use ForgeBee", or "ForgeBee help".
version: 1.1.0
---

# ForgeBee Setup & Configuration

## Objective

Initialize ForgeBee for a project: CLAUDE.md, PM system, hook configuration. The user should have a working setup in under 5 minutes.

## Never

- Never overwrite an existing CLAUDE.md — merge or confirm with user first
- Never skip asking about the project's stack and conventions
- Never create directory structures without checking what already exists

Initialize and configure the ForgeBee development framework for any project. Walk the user through
setting up project memory, task tracking, and the project management system.

## First-Time Setup

When the user wants to initialize ForgeBee for their project:

1. **Create CLAUDE.md** from the template at `${CLAUDE_PLUGIN_ROOT}/skills/forgebee-setup/references/claude-md-template.md`
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
- `/codemaps` — Token-lean architecture documentation for AI context consumption

### Growth & Marketing
- `/growth` — 9-phase Growth OS with adversarial debate (18 agents)
- `/content` — Quick content production without full pipeline
- `/gtm` — Go-to-market planning with launch checklists
- `/seo` — SEO audit, keyword research, and optimization
- `/social` — Social media strategy and content calendars
- `/launch` — Product launch (Product Hunt, HN, press)
- `/competitive` — Competitive intelligence and battlecards
- `/landing` — Conversion-optimized landing page builder
- `/payments` — Stripe/LemonSqueezy/Paddle integration
- `/analytics` — Event tracking, dashboards, and metrics

### Learning
- `/learn` — Analyze session observations and extract patterns as instincts
- `/evolve` — Cluster related instincts into skills, commands, or agents
- `/instinct-status` — Show all learned instincts with confidence scores
- `/instinct-export` — Export instincts to a shareable file
- `/instinct-import` — Import instincts from a file

### Meta
- `/workflow` — Full pipeline orchestrator with adversarial debate
- `/team` — Lightweight multi-agent orchestration
- `/idea` — Idea-to-product validation and MVP planning
- `/pm` — Automated project management dashboards
- `/audit` — Governance audit trail: permissions, debates, verifications

## Specialist Agents (48)

For Agent Teams delegation:

*Development:* frontend, backend, database, security, testing, devops, perf, debug, research, content, seo, supabase, ios, flutter, n8n, session-librarian, ux-designer, scrum-master, delivery-agent, dashboard-generator, verification-enforcer, tdd-enforcer, contract-validator

*Growth OS:* brand-strategist, market-intel, audience-architect, content-architect, hook-engineer, idea-machine, engagement-strategist, content-creator, growth-hacker, calendar-builder, performance-analyst, conversion-optimizer, email-strategist

*WordPress:* wordpress-backend, wordpress-frontend, wordpress-content, wordpress-security, wordpress-seo, phpunit-engineer, woocommerce-cro

*Next.js:* nextjs-frontend, nextjs-content, nextjs-seo

*CRO:* saas-cro

## Skills (24)

*Review (inline):* review-all

*Review (context:fork):* review-code, review-code-style, review-security, review-performance, review-accessibility, review-api, review-database, review-tests, review-docs, review-best-practices, review-wordpress

*Dev Debate (context:fork):* requirements-advocate, requirements-skeptic, requirements-judge, code-advocate, code-skeptic, code-judge

*Strategy Debate (context:fork):* strategy-advocate, strategy-skeptic, strategy-judge

*Utility:* forgebee-setup, project-router, continuous-learning

## Permission Mode Recommendation

For experienced users, recommend **auto mode** for the best ForgeBee experience:

```bash
claude --permission-mode auto
```

Auto mode uses Claude's AI safety classifier to approve safe operations automatically while blocking dangerous ones. ForgeBee's Tier 0 blocklist still fires before the classifier for maximum safety.

**Requirements:** Team/Enterprise plan, Anthropic API, Sonnet 4.6 or Opus 4.6.

For users who can't use auto mode, the default permission mode works well — ForgeBee's built-in allowlist handles common safe commands.

## Additional Resources

- **`references/claude-md-template.md`** — Full CLAUDE.md template for project memory
- **`references/pm-overview.md`** — Project management system documentation
