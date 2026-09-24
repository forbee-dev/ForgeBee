# marketing-analyst — Reference Material

Working library for `forgebee/agents/marketing-analyst.md`. The persona holds workflow, gates, and Never rules.

---

## 1. Metric Tree

**North Star:** the one metric that best captures value delivery — why it matters, current, 30-day target, 90-day target.

### Input Metrics (leading)
| Metric | Definition | Current | Target | Owner | Action rule |
|--------|-----------|---------|--------|-------|-------------|
| Content velocity | Pieces published/week | | | Content | if < plan 2 weeks running → cut cadence or add batching day |
| Engagement rate | Avg. across platforms | | | Engagement | |
| Audience growth | Net new followers/week | | | Growth | |
| Conversion rate | Visitor → lead/customer | | | Funnel | |
| Email list growth | Net new subscribers/week | | | Content | |

### Health Metrics (guardrails)
| Metric | Healthy | Alert |
|--------|---------|-------|
| Unsubscribe rate | <0.5%/send | >1%/send |
| Content consistency (published vs. planned) | >90% | <80% |
| Engagement reply time | <2 hours | >6 hours |
| Brand sentiment | >80% positive | <70% positive |
| Follower quality (engagement per follower) | [range] | [threshold] |

## 2. Content Performance Dashboard

```markdown
### By Platform
| Platform | Followers | Growth Rate | Engagement Rate | Top Content | Trend |
| LinkedIn / X / Instagram | | %/week | % | | Up/Down/Flat |
| Email | | %/week | Click % (opens unreliable under Apple MPP) | [subject] | |
| Blog | visits/mo | %/mo | avg time | | |

### By Pillar
| Pillar | Published | Avg. Engagement | Avg. Reach | Conversion | ROI Score |

### By Format
| Format | Count | Avg. Engagement | Best | Worst |

### By Hook Type
| Hook Category | Times Used | Avg. Engagement | Best | Win Rate |
```

## 3. Campaign Analysis

```markdown
## Campaign Analysis: [Name]
- Duration · Goal · Channels · Pieces · Budget (if paid)

### Results vs. Goals
| Metric | Goal | Actual | Delta | Exceeded/Met/Missed |
| Reach · Engagement · Conversions · Revenue |

### What Worked (tactic — why)
### What Didn't (tactic — root cause)
### Key Learnings (actionable, replicable)
### Recommendations: do more of X · stop Y · test Z
```

## 4. Attribution

| Stage | Touch Points | Weight | Measurement |
|-------|-------------|--------|-------------|
| First touch | How they found us | % | UTM, referral |
| Nurture | Content consumed | % | Page views, email clicks |
| Conversion | What triggered action | % | CTA click, demo booked |
| Retention | What keeps them | % | Product usage, email engagement |

Models: first-touch (credit the entry channel) · last-touch (credit the closer) · linear (equal) · time decay (recent touches weigh more). State which model fits and why.

## 5. A/B Test Plan

```markdown
### Test: [what]
- Hypothesis: If we [change], then [metric] will [move] because [reason]
- Variable · Control (A) · Variant (B)
- Primary metric
- Sample size (compute before launch; do not stop early)
- Duration
- Success criteria (e.g., >10% lift at 95% confidence)

### Test Queue
| Priority | Test | Hypothesis | Effort | Expected Impact |
```

## 6. Review Cadence

**Weekly (30 min):** metrics check (5) → content top/bottom and patterns (10) → engagement health (5) → growth and funnel (5) → next week's priorities and tests (5).

**Monthly (60 min):** completed campaign analysis, pillar performance, audience trajectory vs. target, attribution and channel ROI, budget allocation, next month's adjustments.

## Output Format

```markdown
## Marketing Performance Report: [Brand/Period]
### Executive Summary (health, wins, concerns, priority actions — 3-5 sentences)
### Metrics Dashboard (North Star + input + health, with trends and action rules)
### Platform Performance
### Content Analysis (pillar, format, hook type)
### Campaign Results
### Attribution Insights
### A/B Test Results & Queue
### Optimization Recommendations
| Priority | Recommendation | Expected Impact | Effort |
### Review Schedule
```
