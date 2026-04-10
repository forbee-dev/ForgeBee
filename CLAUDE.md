# Project Memory

> Auto-managed by ForgeBee. Edit freely — hooks will append to the bottom sections.

## Instruction Priority

When instructions conflict, follow this precedence (highest first):

1. **User's explicit instructions** — CLAUDE.md overrides, direct requests in chat
2. **Inline skills** — skills running in session context (e.g., review-all)
3. **Forked skills** — skills with `context: fork` (e.g., debate agents)
4. **Subagents** — specialist agents dispatched by orchestrators
5. **Default system prompt** — Claude Code's built-in behavior

User instructions always win. Skills override agent defaults. When a skill says one thing and an agent says another, the skill takes precedence.

## Me
<!-- Your role and team context -->
- Role: [Your role, e.g. "Senior Backend Engineer"]
- Team: [Your team name]
- Focus: [Current sprint/focus area]

## Stack & Architecture
<!-- Tech stack and key architecture decisions -->
- Language: [e.g. TypeScript, Python, Go, Rust]
- Framework: [e.g. Next.js, FastAPI, Gin, Axum]
- Database: [e.g. PostgreSQL, MongoDB, SQLite]
- Infrastructure: [e.g. AWS, GCP, Vercel, Docker]
- CI/CD: [e.g. GitHub Actions, Jenkins, CircleCI]

## Conventions
<!-- Coding standards and team agreements -->
- Naming: [e.g. camelCase for JS, snake_case for Python]
- Branching: [e.g. feature/*, bugfix/*, main, develop]
- Commits: [e.g. Conventional Commits, imperative mood]
- PRs: [e.g. require 1 review, squash merge]
- Testing: [e.g. Jest for unit, Playwright for e2e, >80% coverage]

## Key Components
<!-- Major modules and where to find them -->
| Component | Path | Description |
|-----------|------|-------------|
| API | `src/api/` | REST endpoints |
| Auth | `src/auth/` | Authentication & authorization |
| Models | `src/models/` | Database models |
| Utils | `src/utils/` | Shared utilities |

## Common Commands
```bash
# Development
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build
npm run lint         # Lint check
npm run lint:fix     # Auto-fix lint issues

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database

# Deployment
npm run deploy:staging    # Deploy to staging
npm run deploy:production # Deploy to production
```

## Environment Variables
| Variable | Purpose | Where |
|----------|---------|-------|
| `DATABASE_URL` | Database connection | `.env` |
| `API_KEY` | External API auth | `.env` |
| `NODE_ENV` | Runtime environment | system |

## People
<!-- Key people and their areas -->
| Name | Role | Area |
|------|------|------|
| [Name] | [Role] | [What they own] |

## Known Issues & Tech Debt
<!-- Things to watch out for -->
- [ ] [Issue description and workaround]

## ForgeBee Commands

**Planning (BMAD-inspired):**
- `/plan` — Phased planning workflow: Brief → Requirements → Architecture → Sprint Stories

**Development:**
- `/review` — Code review with file:line references and fix recommendations
- `/debug` — Delegates to `debugger-detective` agent; systematic debugging with fallback
- `/architect` — Architecture decisions with trade-off analysis and ADR output
- `/refactor` — Safe refactoring with test verification
- `/test` — Delegates to `test-engineer` agent; test generation with fallback
- `/docs` — Documentation writing (API, guides, ADRs)
- `/security` — Delegates to `security-auditor` agent; OWASP audit + anti-rationalization gate
- `/perf` — Performance optimization (profile, optimize, measure)
- `/migrate` — Version/framework migrations with rollback + anti-rationalization gate
- `/deploy` — Deployment with pre-flight checks, rollback plan + anti-rationalization gate
- `/browser-debug` — Client-side debugging (console, network, rendering)
- `/codemaps` — Token-lean architecture documentation for AI context consumption

**Growth & Marketing:**
- `/growth` — **Growth OS orchestrator**: Brand → Intel → Audience → Content Architecture → Hooks → Debate → Calendar → Creation → Distribution → Measure. Main agent only delegates. Includes adversarial strategy debate.
- `/content` — Quick content production (single piece or small batch without full pipeline)
- `/gtm` — Go-to-market planning with launch checklists
- `/seo` — SEO audit, keyword research, and optimization
- `/social` — Social media strategy, content calendars, hook formulas, engagement psychology
- `/launch` — Product launch (Product Hunt, HN, press)
- `/competitive` — Competitive intelligence, FIA battlecards, niche intelligence
- `/landing` — Conversion-optimized landing page builder
- `/payments` — Stripe/LemonSqueezy/Paddle integration
- `/analytics` — Event tracking, dashboards, marketing performance metrics

**Learning:**
- `/learn` — Review pending instincts (auto-detected) + analyze observations for new patterns
- `/evolve` — Cluster related instincts into skills, commands, or agents
- `/instinct-status` — Show all learned instincts (project + global) with confidence scores
- `/instinct-export` — Export instincts to a shareable file
- `/instinct-import` — Import instincts from a file

**Meta:**
- `/workflow` — Full pipeline orchestrator: Plan → Batched Debate → Architect → Scrum → Execute (JSON contracts) → Debate → Deliver. Auto-tracks in PM system.
- `/team` — Multi-agent orchestration with dependency graphs + checkpoints at 3+ agents
- `/idea` — Idea-to-product validation and MVP planning (with debate). Auto-tracks in PM system.
- `/pm` — Automated project management: reads state.yaml, syncs TASKS.md, regenerates dashboards, surfaces blockers
- `/audit` — Governance audit trail: query permission decisions, debate rulings, verification results, escalations

**Specialist Agents** (for Agent Teams):

*Development:* frontend, backend, database, security, testing, devops, perf, debug, research, content, seo, supabase, ios, flutter, n8n, session-librarian, ux-designer, scrum-master, delivery-agent, dashboard-generator, verification-enforcer, tdd-enforcer, contract-validator

*Dev Debate (context:fork skills):* requirements-advocate, requirements-skeptic, requirements-judge, code-advocate, code-skeptic, code-judge

*Strategy Debate (context:fork skills):* strategy-advocate, strategy-skeptic, strategy-judge

*Growth OS:* brand-strategist, market-intel, audience-architect, content-architect, hook-engineer, idea-machine, engagement-strategist, content-creator, growth-hacker, calendar-builder, performance-analyst, conversion-optimizer, email-strategist

*WordPress:* wordpress-backend, wordpress-frontend, wordpress-content, wordpress-security, wordpress-seo, phpunit-engineer, woocommerce-cro

*Next.js:* nextjs-frontend, nextjs-content, nextjs-seo

*CRO:* saas-cro

*Review (context:fork skills):* review-code, review-code-style, review-security, review-performance, review-accessibility, review-api, review-database, review-tests, review-docs, review-best-practices, review-wordpress

*Review (inline skill):* review-all — runs in session context for efficiency, delegates to review agents for large diffs (>500 lines)

**Quality Pipeline:** All commands have Objective + Never rules. All code-producing agents self-review against review-all criteria before reporting `DONE`. Agents report status: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`. /workflow and /team enforce quality contracts and handle each status. review-all is the final validation gate — only Critical/High issues block the push.

---

## Learned Patterns
<!-- Auto-updated by self-improve hook — do not edit below this line -->
