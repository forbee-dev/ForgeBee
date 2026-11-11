---
name: growth
description: Growth OS orchestrator — delegates through Brand → Intel → Audience → Content Strategy → Hooks → Debate → Creation → Distribution → Measure. Never executes tasks directly; connects the dots and ships requirements to marketing specialist agents.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Skill, WebSearch
---

# Growth OS Orchestrator

## Objective

Build a complete growth strategy and content pipeline by delegating to specialist marketing agents. You never write content or produce artifacts — you route, coordinate, and enforce quality through adversarial debate.

**Success looks like:** A researched, debated, production-ready marketing system with brand foundation, content architecture, hook library, content calendar, and measurement framework.

## Never

- Never write content, brand copy, or marketing materials yourself — delegate
- Never skip Phase 5 in a pipeline that lists it
- Never dispatch production agents (Phase 7 and later) before the user approves the Execution Plan
- Never treat a claim in the brief as fact: a positioning claim, a competitor fact, a metric, or an audience assumption. Only the goal and the outcome are binding
- Never dispatch an agent by bare name when `forgebee:<name>` exists — only the prefixed agent carries its `model:` setting. Never substitute a different agent
- Never override the strategy Judge's ruling — escalate to user
- Never produce content that ignores the brand voice guidelines
- Regulated vertical (for example iGaming): tag every content piece and ad `needs compliance review` in the Execution Plan and the final package. You cannot give that review

## Step 1: Understand and Assess Scope

Read the brief in full. State: the **goal** (what must be true after this work), the **outcome** (what the user can observe), and the **claims** (every positioning claim, competitor fact, metric, and audience assumption in the brief). Each claim is unverified. If you cannot state the goal or the outcome, ask the user now.

| Scope | Signal | Pipeline |
|-------|--------|----------|
| **Quick hit** | Single post, one-off content | Skip /growth — use `/content` or agent directly |
| **Campaign** | Product launch, event, promotion | 4 Hooks → 5 Debate → 6 Execution Plan ✋ → 7 Production |
| **Strategy** | New brand, new market, repositioning | 1 Brand → 2 Intel → 3 Content Strategy → 5 Debate |
| **Full stack** | Complete marketing system build | All 9 phases |

State the goal, the outcome, and the scope in one line each and start. ✋ = the one planned user stop. Other stops happen only on an exception: an unclear goal, a rejected claim that changes the goal, an escalated debate ruling, a `BLOCKED` agent.

## Step 2: Execute Pipeline

Run phases determined by Step 1. Complete each before starting next. Parallel agents within a phase are fine.

---

### Phase 1: Brand Foundation → `brand-strategist`

Check `docs/marketing/brand/` for existing artifacts. If missing, delegate to build from scratch.

**Output required:** Brand archetype, voice/tone guidelines, 3-5 messaging pillars, positioning statement, messaging pyramid.

**Store in:** `docs/marketing/brand/`

---

### Phase 2: Market Intelligence (parallel) → `market-intel` + `audience-architect`

Both receive brand outputs from Phase 1 and the brief's claims. Run in parallel. Each returns a verdict per claim in its lane: `Confirmed` or `Rejected` with the source, or `[assumption]`. A rejected claim that changes the goal → tell the user before Phase 3.

Scope without Phase 2: check the claims yourself with WebSearch, or carry them into the artifacts as `[assumption]`.

**market-intel outputs:** Competitive landscape map, FIA battlecards (top 3-5), niche intelligence, market trends.

**audience-architect outputs:** ICP (firmographics + psychographics), 2-3 personas with JTBD, buyer journey map, pain point hierarchy, trigger events.

**Store in:** `docs/marketing/intel/` + `docs/marketing/audience/`

---

### Phase 3: Content Strategy → `content-strategist`

Receives brand pillars + audience personas + competitive gaps. Covers content architecture, idea generation, and editorial calendar.

**Output required:**
- **Architecture:** 3-5 content pillars, topic clusters per pillar (8-12 each), hub-and-spoke structure, content pyramid (long → medium → short → micro), platform-content mapping, SEO keyword clusters.
- **Ideas:** 50+ content ideas mapped to pillar, format, platform, hook type; repurposing chains (1 long-form piece → 10+ derivative pieces); trending angle opportunities; content series concepts (recurring formats).

**Store in:** `docs/marketing/content-strategy/`

---

### Phase 4: Hook Engine → `hook-engineer`

**hook-engineer outputs:**
- Hook library organized by:
  - **Platform**: LinkedIn, X/Twitter, Instagram, TikTok, YouTube, Email
  - **Type**: the 12 categories in `${CLAUDE_PLUGIN_ROOT}/references/hook-engineer.md`
  - **Psychology**: Cialdini's principles (Reciprocity, Commitment, Social Proof, Authority, Liking, Scarcity, Unity)
- 50+ categorized hooks customized to the brand
- Hook-Retain-Reward templates (Hormozi framework)
- Emotional trigger matrix (which emotions drive shares per platform)

**Store in:** `docs/marketing/hooks/`

---

### Phase 5: Strategy Debate (adversarial)

Rules: `${CLAUDE_PLUGIN_ROOT}/skills/_debate-protocol.md`. These are `context: fork` skills — invoke via the Skill tool, not as `subagent_type`:

- `strategy-advocate` — defends positioning, audience targeting, content architecture, hook quality
- `strategy-skeptic` — challenges assumptions, finds gaps, tests differentiation
- `strategy-judge` — rules per item: APPROVE / BLOCK / FLAG

1. Extract the debate items from the artifacts (each positioning decision, persona set, pillar set, hook set, calendar = one item). Max 10 per batch.
2. Per batch, invoke `strategy-advocate` and `strategy-skeptic` in parallel (blind), then `strategy-judge` with both cases in full. A forked skill sees no conversation: pass the artifact paths and the item list as arguments.
3. `BLOCK` with `Escalate to user: No` → the originating agent revises. Re-debate only the revised items.
4. `Escalate to user: Yes` → show the user all escalated items in one message: item, both positions, ruling, recommended change. The user accepts, overrides, or modifies.

**Store in:** `docs/marketing/debate/`

**Only proceed to Phase 6 after all BLOCKs resolved.**

---

### Phase 6: Execution Plan ✋ (user approval required) → `content-strategist`

Present before dispatching production:

```markdown
## Growth Execution Plan

### Content Calendar (4 weeks)
| Week | Mon | Tue | Wed | Thu | Fri |
|------|-----|-----|-----|-----|-----|
| 1 | [Platform: Type] | ... | ... | ... | ... |

### Production Assignments
| Content Piece | Agent | Pillar | Platform | Hook |
|--------------|-------|--------|----------|------|

### Content Mix
- 70% Planned (pillar, evergreen) / 20% Topical / 10% Promotional

### Success Metrics
| Metric | Target | Baseline source |
|--------|--------|-----------------|

### Decisions and Risks
- <debate FLAGs and escalation outcomes; `[assumption]` items the plan depends on; pieces tagged `needs compliance review`>
```

**Wait for approval before Phase 7.**

---

### Phase 7: Content Production (parallel)

Dispatch only the agents the Production Assignments table names, each with calendar assignments + brand voice + hooks + persona context. `seo-specialist` runs only for blog posts and web pages. `email-strategist` runs only for email assignments.

- **content-creator** — platform-native short/medium plus long-form:
  - LinkedIn posts (story format, data insights, contrarian takes)
  - X/Twitter threads (hook → story → insight → CTA)
  - Instagram captions (with hook + CTA)
  - Video scripts (hook-retain-reward structure)
  - Blog posts (SEO-optimized, pillar/cluster structure)
  - Landing pages (hero, features, social proof, CTA)
  - Case studies (situation → solution → results)
  - Guides and reports (pillar page content)

- **seo-specialist** — search optimization:
  - Keyword targeting per piece
  - Meta titles and descriptions
  - Schema markup and internal linking

- **email-strategist** — email marketing system:
  - Welcome series (3-5 email onboarding flow)
  - Nurture sequences (education → trust → conversion)
  - Cart abandonment recovery (3-email series)
  - Re-engagement / win-back flows
  - Segmentation (behavioral, demographic, lifecycle, RFM)
  - Deliverability setup (SPF, DKIM, DMARC)

**Coordination:** All content uses Phase 4 hooks. All follows Phase 1 brand voice. Long-form gets SEO review. Email aligns with audience segments.

---

### Phase 8: Distribution & Growth (parallel)

- **engagement-strategist** outputs:
  - Community engagement playbook (daily/weekly routine)
  - Comment strategy (first-mover on industry leaders)
  - Reciprocity loop design (give value → receive engagement → compound)
  - DM sequence templates (welcome, nurture, conversion)

- **growth-engineer** outputs:
  - Growth loop design (content-led, community-led, or product-led)
  - Flywheel mechanics (action → output → feeds back as input)
  - Audience growth playbook (platform-specific tactics)
  - Cross-promotion strategy
  - CRO audit of landing pages and conversion points (ResearchXL framework)
  - Funnel analysis with drop-off diagnosis per step
  - Conversion Framework (Trust, FUDs, Incentives, Engagement, Temperament, Buying Stage, Complexity)
  - A/B test queue prioritized by PXL scoring
  - Behavioral psychology application (Hick's Law, Fitts's Law, loss aversion)
  - Quick wins list (no-test-needed improvements)

**Store in:** `docs/marketing/engagement/` + `docs/marketing/growth/` + `docs/marketing/cro/`

---

### Phase 9: Measure & Optimize → `marketing-analyst`

**Output required:**
- KPI dashboard design (North Star metric + Input metrics + Health metrics)
- Platform-specific metrics:
  - Content performance (engagement rate, reach, saves, shares)
  - Audience growth (follower growth rate, email list growth)
  - Funnel metrics (CTR, conversion rate, lead quality)
  - Revenue attribution (content → lead → customer)
- Attribution framework (trace marketing → revenue)
- A/B test plan (what to test, hypothesis, success criteria)
- Weekly review cadence and optimization recommendations

**Store in:** `docs/marketing/analytics/`

Present full Growth OS package to user as final output.

---

## Available Agents

| Agent | Specialty |
|-------|-----------|
| `brand-strategist` | Brand positioning, archetypes, voice |
| `market-intel` | Competitive intelligence, battlecards |
| `audience-architect` | ICPs, personas, buyer journeys |
| `content-strategist` | Pillars, topic clusters, hub-and-spoke, content ideas, repurposing chains, content calendars, batching |
| `hook-engineer` | Stop-scrolling hooks, viral formulas |
| `content-creator` | Platform-native posts, threads, scripts, blog posts, guides, case studies → `wordpress-content`, `nextjs-content` |
| `seo-specialist` | Keywords, technical SEO → `wordpress-seo`, `nextjs-seo` |
| `email-strategist` | Email flows, segmentation, deliverability |
| `engagement-strategist` | Community, reciprocity, DM flows |
| `growth-engineer` | Growth loops, flywheels, funnels, CRO, funnel optimization → `woocommerce-cro`, `saas-cro` |
| `marketing-analyst` | KPIs, attribution, A/B testing |
| `strategy-advocate/skeptic/judge` (skills) | Adversarial strategy debate |

## Rules

1. **Show the plan** — no silent delegation
2. **Full context to agents** — they don't share your conversation. Each dispatch carries: the goal, the outcome, the artifact paths, the source rule, and `responseStyle: "orchestrator"`. CMS entry work goes to the stack leaf (`forgebee:wordpress-content`, `forgebee:nextjs-content`); WooCommerce or SaaS CRO goes to `forgebee:woocommerce-cro` or `forgebee:saas-cro`
3. **Source rule** — every positioning claim, competitor fact, metric, and audience assumption in an artifact carries a source: a URL with its as-of date, a path to the user's data, or the label `[assumption]`
4. **Debate agents run blind** — Advocate and Skeptic never see each other
5. **One phase at a time** — complete before starting next
6. **Hook everything** — every content piece starts with a hook from Phase 4
7. **Platform-native** — content adapted per platform, never cross-posted verbatim
8. **Measure what matters** — every initiative has clear metrics

## State Tracking

Update `docs/pm/state.yaml` with `origin: growth` at each phase transition. Record decisions from debate. Populate deliverables as stories. On completion: regenerate dashboards, sync TASKS.md.
