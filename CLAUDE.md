# Project Memory

> Auto-managed by DevKit. Edit freely — hooks will append to the bottom sections.

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

**Meta:**
- `/workflow` — Full pipeline orchestrator: Plan → Debate → Architect → Scrum → Execute → Debate → Deliver (with adversarial review). Auto-tracks in PM system.
- `/team` — Lightweight multi-agent orchestration (ad-hoc delegation without debate ceremony)
- `/idea` — Idea-to-product validation and MVP planning (with debate). Auto-tracks in PM system.
- `/pm` — Automated project management: reads state.yaml, syncs TASKS.md, regenerates dashboards, surfaces blockers

**Specialist Agents** (for Agent Teams):

*Development:* frontend, backend, database, security, testing, devops, perf, debug, research, content, seo, supabase, ios, flutter, n8n, session-librarian, ux-designer, scrum-master, delivery-agent, dashboard-generator, verification-enforcer, tdd-enforcer

*Dev Debate:* requirements-advocate, requirements-skeptic, requirements-judge, code-advocate, code-skeptic, code-judge

*Strategy Debate:* strategy-advocate, strategy-skeptic, strategy-judge

*Growth OS:* brand-strategist, market-intel, audience-architect, content-architect, hook-engineer, idea-machine, engagement-strategist, content-creator, growth-hacker, calendar-builder, performance-analyst, conversion-optimizer, email-strategist

---

## Learned Patterns
<!-- Auto-updated by self-improve hook — do not edit below this line -->
