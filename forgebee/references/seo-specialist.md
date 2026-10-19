# seo-specialist — Reference Material

Working library for `forgebee/agents/seo-specialist.md`. The persona holds rules and routing; this file holds the mode playbooks.

---

## Autopilot

Run search for one product end to end. State lives in `seo/` in the repo. Read it at the start of every run. Update it before the run ends. Every change is a real change to the site: a page, an edit, a redirect, a tool. Advice in a document is not work.

### Brief

The user fills five lines before the first run:

```
Site:          https://example.com
Product:       <one sentence: what it does and who buys it>
Conversion:    <the action that counts, e.g. signup, demo booked>
Competitors:   <3 to 8 names, or "find them">
Ship mode:     <"PR for review" or "merge when the build passes">
```

### State files

| File | Content |
|---|---|
| `seo/context.md` | Product, buyer, prices, features, limits, claims, competitors. Each fact names its source file or URL. |
| `seo/keyword-map.csv` | One row per query. Columns: `query, intent, monthly_volume, difficulty, target_url, status, current_position, last_checked`. Status: `live`, `planned`, `gap`. |
| `seo/backlog.md` | Queue ordered by expected conversions per hour of work. Each item names the query, the page, and the change. |
| `seo/log.md` | One dated line per shipped change, with the URL. |
| `seo/ai-prompts.md` | 25 buyer questions for AI assistants, and each assistant's answer per check. |
| `seo/competitors/` | One sitemap snapshot per competitor, for the weekly diff. |
| `seo/reports/` | One report per weekly run: `YYYY-MM-DD.md`. |
| `seo/social/` | One `<slug>.md` per new article: one X post and one LinkedIn post. |
| `seo/outreach/` | Draft pitches, one file per named person. |
| `seo/directories.md` | Relevant directories with ready-to-paste copy. |

### Run order

1. `seo/` missing → run **Setup**, then stop.
2. Otherwise run **Daily**.
3. Last report 7 or more days old → also run **Weekly**.
4. Keyword map rebuilt 30 or more days ago → also run **Monthly**.

**Setup**

1. Read the repo. Learn how routes, posts, titles, meta, canonicals, the sitemap, robots.txt, and structured data are made. Add pages the same way.
2. Use the product, or read its code. Write `context.md`.
3. Confirm the competitors, or find them: who ranks for the target queries, who AI assistants name.
4. Build the keyword map (Monthly, step 1).
5. Crawl the site and list every problem (Daily, step 1).
6. Write the backlog. Ship the three highest-value fixes today.

**Daily**

1. Health check. Fetch the sitemap and request every URL. Flag and fix: non-200 responses, redirect chains, wrong redirect targets, missing or wrong canonicals, stray `noindex`, robots.txt blocks, broken internal links, orphan pages, duplicate or missing titles and descriptions, main content absent from server HTML, slow pages. Fix what you can; backlog the rest.
2. Fact check. Read the commits since the last run. A changed price, plan, limit, feature, or integration: correct every page that states the old fact today. A new feature: add a backlog item for the queries it can win.
3. Ship one backlog item. One finished page beats three drafts.
4. Add a line to `log.md`.

**Weekly**

1. Page 2 to page 1. Pull queries in positions 8–20 with real impressions. For each, open the top three results and name why they win. Then change the page: answer the query in the first paragraph, add the missing section, put the query in the title and H1 if it reads naturally, link from the strongest related pages with descriptive anchors. Good position but low CTR: rewrite the title and description instead.
2. Fixes to existing pages. Aim for 12 or more. A fix counts only if it changes what a searcher or a crawler sees.
3. Indexing. Confirm each sitemap URL is indexed. For each one that is not, find the cause (thin, duplicate, orphaned, blocked, canonical elsewhere) and fix the cause. No verification source: write "not verified", never "indexed".
4. AI answers. Ask each assistant the 25 questions in `ai-prompts.md`. Record: product named or not, what is said, sources cited, errors. Wrong fact: state the correct fact in plain text on the page that owns it. Absent: the cited sources become the outreach and directory list.
5. Competitors. Diff each sitemap against last week's snapshot. List what they published and which queries they gained. Add a backlog item only where you can make a better page.
6. Report. Write `seo/reports/YYYY-MM-DD.md` under 300 words: what shipped (links), what moved (clicks, impressions, positions, conversions against last week, each number with its source), what is broken, what is next, at most three asks for the owner.

**Monthly**

1. Rebuild the keyword map. Start from buyers, not volume: problems, category terms, competitor names, "alternative" and "vs" queries, integrations, use cases, pre-purchase questions. Every page gets exactly one primary query. Two pages on one query: merge and redirect. A query with no page is a gap; gaps go in the backlog.
2. Up to 12 articles. Publish fewer if fewer are worth writing.
3. Comparison pages. One "alternatives to X" and one "product vs X" per competitor buyers search for. Admit where the competitor is better. Every competitor claim gets a source and an "as of" date.
4. One free tool. A calculator, generator, checker, or template people already search for, close to the product. No signup. Build it in the repo.
5. Links. Add directories to `directories.md` with paste-ready copy. Draft up to five pitches in `seo/outreach/`: a named person, a specific article of theirs, a specific reason your page improves it.

### Data sources

Use every connected source: Search Console, a keyword tool, analytics, web search. A source is missing: name it once in the report, say what it would unlock, continue with what you have. Never fill the gap with a guess.

### Rules for anything you write

- Search the query and read the top five results first. If the page adds nothing they lack, do not write it.
- Answer the question in the first two sentences. Detail follows.
- Use what only this product knows: real screenshots, real product numbers, real examples, the owner's opinions. None for a topic: ask for it in the report.
- Never invent a statistic, quote, customer, review, price, or benchmark. Unsourced: leave it out.
- No padding, no "why this matters" intro, no recap.
- Every new page ships with three inbound links from existing pages, a title, a description, a canonical, a sitemap entry, and structured data where it fits.
- Every new article gets `seo/social/<slug>.md`.

### Limits

- Follow the ship mode. Run the repo's lint, typecheck, and build before you ship. Load the changed pages and look at them.
- Do not send email, submit a listing, create an account, or post to social. Draft it and list it in the report.
- Do not delete or redirect a page with traffic or inbound links without flagging it in the report first.
- Do not change the product, its prices, or its claims. Page and product disagree: the product is right.
- The same fix failed twice: stop and report what you tried.

## Refresh

Update one existing page so it outranks the pages above it. Keep the original voice. Use live SERP data and fetched competitor pages, never memory. Use today's date for anything time-sensitive.

### Phases

1. Current state: audit the existing page.
2. Competitor research: read the SERP, pick five competitors, audit each.
3. Gap analysis: build the gap table.
4. Refresh strategy: plan the upgrade.
5. Approval: present the plan and wait.
6. Rewrite: write the refreshed version.

### Phase 1 audit checklist

```
METRICS    word count · last updated · current position for the primary query · monthly traffic
STRUCTURE  H2/H3 count · lists, tables, images, media · internal and external links
QUALITY    readability grade · depth (shallow / medium / deep) · unique insights · CTAs
```

Record strengths (sections to keep), weaknesses (outdated facts, missing topics, weak flow), and quick wins (stale stats, broken links).

### Phase 2 competitor audit

Read the SERP: top 10 titles, featured snippet, People Also Ask, related searches, dominant format. Pick five: direct competitors, positions 1–3, recently updated. Record per page:

```
URL · position · word count · H2/H3 outline · unique elements (data, examples, visuals, tools) · last modified
```

### Phase 3 gap table

| Element | Your page | Comp 1 | Comp 2 | Comp 3 | Comp 4 | Comp 5 | Priority |
|---|---|---|---|---|---|---|---|
| Word count | | | | | | | |
| Featured snippet format | | | | | | | |
| [Topic] | | | | | | | |
| Statistics / data | | | | | | | |
| Examples / cases | | | | | | | |
| Visuals | | | | | | | |
| FAQ section (content only; no FAQ rich result) | | | | | | | |
| Schema markup | | | | | | | |

Priority: **high** = 4+ competitors cover it, **medium** = 2–3, **low** = 1, **emerging** = none. End with each competitor's unique angle and the page's angle to differentiate.

### Phase 4 refresh strategy

```
IMMEDIATE   update stats to the latest sourced data · fix broken links · add high-priority topics · snippet-ready answer · refresh examples and screenshots
STRUCTURE   reorder H2s · FAQ section from People Also Ask (no rich result) · comparison tables · stronger intro hook
OPTIMIZE    target word count · internal links · external sources to cite · image alt text · schema
```

Proposed outline: three title options, the new H2 list marked Keep / Modified / New, target word count, new elements (table, FAQ, diagram).

### Phase 5 approval message

```markdown
## Content refresh plan: [Page title]

### Summary
The page ranks #[X] and has fallen behind on [areas]. This refresh adds [N] sections and updates [N] outdated elements.

### Key findings
1. Depth: competitors average [X] words vs [Y]
2. Missing topics: [top 3 gaps]
3. Outdated elements: [main issues]
4. Opportunity: [unique angle]

### Gap table
### New outline

Write the refreshed version? Any sections to prioritize?
```

Never promise a ranking or traffic gain. Do not write before the user approves.

### Phase 6 rewrite

Keep: sections that rank, the voice, the URL (or plan a 301), anchors other pages link to. Improve: a visible "Last updated" date, a year next to every statistic, deeper coverage on the topics that matter, original data or examples competitors lack. Scannable: paragraphs of 2–3 sentences, more H3s, lists and tables, jump links on long posts.

SEO checklist: title per `## Titles` · meta description about 155 chars · answer the primary query early · related terms used naturally · snippet-ready answer near the top · FAQ answers People Also Ask · internal links in and out.

### Output format

```markdown
# [New title]

_Last updated: [date]_

[New intro]
[Jump links]
[Refreshed sections]

## Frequently asked questions
## Conclusion

---
### Refresh summary for the publisher
- Meta description: [new]
- Schema: [types to add]
- Internal links: [pages to link]
- Images needed: [list]
- URL: [keep / redirect plan]
- Word count: [old] → [new]
- Sections added: [list]
```

### Quality check

- Every Phase 3 gap is addressed or skipped on purpose.
- All data and examples are current and sourced.
- The original voice is intact.
- No keyword stuffing.
- The page gives more practical value than each competitor audited.

## Titles

### Core rule

The SERP is the brief. Identify the target query, study what ranks, then write the clearest title that matches the page and the intent. Do not write titles from vibes.

### Formula

```
primary keyword + modifier / benefit + brand
```

Examples: `Client Portal Software for Accountants` · `Best AI Presentation Makers in [Year]` · `Emergency Plumber Dublin - 24/7 Same-Day Service`

### Checklist

- Primary query near the front; important words visible before truncation.
- Title, meta description, H1, and slug align on one topic.
- Match the page type: pricing, support, docs, login, product, comparison, review, guide, pillar, definition, how-to, listicle.
- About 60 characters or fewer.
- Every title unique.
- Clear beats stuffed. Mirror SERP patterns when useful: `best`, `top`, numbers, year, comparison terms.
- No `Home`, `About`, `Products`, or vague category labels.
- Do not change a slug to match a temporary number or year.

### Intent to pattern

| Intent | Pattern |
|---|---|
| Beginner guide | `Beginner's Guide to [Topic]` · `[Topic]: What It Is & How to Use It` |
| Pillar | `The Complete Guide to [Topic]` · `Everything You Need to Know About [Topic]` |
| Definition | `What Is [Term]?` · `What Is [Term] & How to [Use It]` |
| How-to | `How to [Task]` · `How to [Task] Without [Obstacle]` |
| Listicle | `[Number] Best [Tools] for [Audience] in [Year]` · `10 [Things] to [Benefit]` |
| Checklist | `[Topic] Checklist: [Number] Tips to [Outcome]` |
| Comparison | `[A] vs [B]: [Decision]` |
| Error | `What Does [Error] Mean?` · `How to Fix [Problem]` |

One pattern per page. Modifiers that work: `Best`, `Top`, `Complete`, `Examples`, `Template`, `Free`, `Essential`, the year. Hype modifiers (`Shocking`, `Guaranteed`) only when the SERP uses them.

### Workflow

1. Identify the primary keyword, or infer it from the page, slug, H1, and content.
2. Determine the intent.
3. If SERP data exists, compare top titles for structure, modifiers, length, wording.
4. Pick the pattern that matches the intent.
5. Draft 3–5 options.
6. Pick the accurate, concise option most likely to earn the click.
7. When editing files, update the frontmatter `title`. Touch H1, meta, or slug only when asked or when the mismatch is harmful.
8. Bulk work: return the before/after table and name the pattern used.

### Common fixes

| Problem | Before | After |
|---|---|---|
| Too vague | `Home` | `AI Customer Support Chatbot for SaaS Teams` |
| Too bloated | `The Ultimate Complete Guide to the Many Benefits of Digital Signage for Businesses` | `8 Digital Signage Benefits for Businesses` |
| Wrong intent | `Plans for Growing Teams` | `Client Portal Pricing` |

### Bulk output

```markdown
| Page | Current title | Suggested title | Why |
|---|---|---|---|
| `/example` | `Home` | `Client Portal Software for Accountants` | Adds the main query and product clarity |
```

Keep the Why column short so the user can approve or edit fast.
