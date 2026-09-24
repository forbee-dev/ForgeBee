# email-strategist — Reference Material

Worked templates for `forgebee/agents/email-strategist.md`. The persona holds the method, gates, and Never rules.

---

## The 5 Core Flows — Worked Examples

### 1. Welcome (5 emails, 14 days)

| # | Timing | Subject | Goal | CTA |
|---|--------|---------|------|-----|
| 1 | Immediate | "Welcome to [Company]!" | Set expectations, deliver promised value | "See how it works" |
| 2 | Day 2 | "[Benefit] our customers love most" | First win | "Try [feature]" |
| 3 | Day 5 | "Quick question about your [goal]" | Qualify and engage | "Take the 2-minute assessment" |
| 4 | Day 10 | "How [Customer] achieved [result]" | Social proof | "See the full story" |
| 5 | Day 14 | "[Resource] most new users request" | Value before the harder ask | "Grab your [guide]" |

### 2. Cart Abandonment (3 emails; expected recovery 10-30%)

| # | Timing | Subject | Content | CTA |
|---|--------|---------|---------|-----|
| 1 | 1 hour | "You left something behind" | Product image, minimal copy, low pressure | "Complete my purchase" |
| 2 | 24 hours | "Why [Product] is worth it (+ what others say)" | Benefits, social proof, shipping info | "Claim my order" |
| 3 | 3-5 days | "15% off expires tomorrow" | Urgency, objection handling, trust signals | "Get my discount" |

### 3. Post-Purchase / Onboarding
Immediate: confirmation + what's next → after delivery: quick-start + first win → day 10: feedback + NPS → day 30: feature discovery.

### 4. Nurture (5-7 emails, 2-3 days apart; match intensity to engagement)
Educational (primary pain) → framework (your approach) → case study → common mistakes → tool/resource → soft pitch → direct offer (proof + urgency).

### 5. Re-Engagement / Win-Back
| # | Timing | Subject | CTA |
|---|--------|---------|-----|
| 1 | 90+ days inactive | "We miss you! Here's what's new" | "See what's new" |
| 2 | +14 days | "[Specific value] that [similar company] loves" | "Explore latest features" |
| 3 | +14 days | "Last chance: 30% off to welcome you back" | "Claim my discount" — last email before removal from the active list |

## Subject Line Formulas

| Formula | Template |
|---------|----------|
| Personalization | "[Name], [specific benefit]" |
| Curiosity gap | "We [achieved result]. Here's how." |
| Problem-solution | "Tired of [problem]? [Solution]." |
| Question | "How would you [benefit] in [timeframe]?" |
| Scarcity | "[Limited resource] + [time window]" |
| Listicle | "[Number] [adjective] ways to [benefit]" |
| Social proof | "[Number] [people] [achieved result] using [product]" |
| Benefit-first | "[Benefit] without [common objection]" |
| Time-specific | "Learn [skill] in [timeframe]" |

Length: 40-50 characters. A/B test always; small wording changes ("my" vs. "this") move results.

## Email Body Structure

```
PREHEADER (≈50 chars, extends the subject promise)
HERO (image or text hook)
BODY (3-5 short paragraphs: hook → benefit/use case → why now)
PRIMARY CTA (contrasting button, benefit text)
SECONDARY CTA (lower-commitment text link)
FOOTER (unsubscribe, company info, social)
```

Copy: sentences 10-15 words, paragraphs 2-3 sentences, anchor text names the benefit ("Get my guide", not "Click here"). Personalize on past actions, not only the name. 1-2 product-focused images.

## Segmentation

| Segment | Definition | Goal | Frequency |
|---------|-----------|------|-----------|
| New subscribers | 0-30 days | Build relationship | Welcome + 1-2x/week |
| Active customers | Recent purchasers | LTV, cross-sell | 1-2x/week |
| Cart abandoners | Unfinished purchase | Recover revenue | 3-email series |
| Inactive | No engagement 60-90 days | Re-engage or sunset | Re-engagement series |
| VIP | High LTV, frequent buyers | Loyalty, exclusive access | 2-3x/month |

Layers: behavioral (usage, adoption, content engagement) · demographic (industry, size, role, location) · RFM (recency × frequency × monetary) · lifecycle (awareness → retention).

### Engagement Scoring

```
open +1 · click +3 · site visit +2 · purchase +10 · 30 days no activity -5
score > 20 in 30 days  → Engaged  → raise frequency
score < 5 in 60 days   → At Risk  → re-engagement
score = 0 in 90 days   → Inactive → win-back
3+ purchases in 90 days → VIP     → exclusive content
```

## Deliverability & List Hygiene

- Authentication: SPF, DKIM, and DMARC are all required. Bulk senders to Gmail/Yahoo also need one-click unsubscribe (RFC 8058).
- Complaint rate below 0.1%; higher rates damage sender reputation.
- Cleaning cadence: 50K-250K quarterly · 250K-1M every 6-8 weeks · 1M+ every 4-6 weeks. Expect 25-30% annual decay (B2B 30-50%).
- Sunset: 60 days no opens → suppress · 90 days → re-engagement · no response → quarterly digest · 180 days → remove.
- Bounces: hard → remove now · soft → retry 2-3 times, then remove · spam complaint → remove after the first.
- Validate at signup (NeverBounce, ZeroBounce, Clearout). Double opt-in gives near-100% valid addresses but loses ~30% who never confirm.

## Metrics

| Metric | Benchmark | Measures |
|--------|-----------|----------|
| Open rate | 22-42% | Subject line + deliverability (inflated by Apple Mail Privacy Protection — do not optimize on opens alone) |
| Click rate | 2-5% | Relevance + CTA |
| Click-to-open | 10-15% | Content quality |
| Conversion | 1-5% | End-to-end effectiveness |
| Unsubscribe | <0.5% | Content-audience fit |
| Bounce | <2% | List quality |
| Complaint | <0.1% | Relevance + permission |
| List growth | 2-5%/month | Acquisition health |

Attribution models: first touch · last touch · linear · time decay. Track revenue per email, revenue per subscriber, email CAC, email-attributed LTV.
