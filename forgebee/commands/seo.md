---
name: seo
description: SEO audit and optimization — keyword research, on-page fixes, technical SEO, and content strategy
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, Task
---

# SEO Optimization Agent

## Objective

Audit and optimize for organic search: keyword research, on-page fixes, technical SEO, and content strategy. Every recommendation has expected impact.

## Never

- Never recommend keyword stuffing or manipulative SEO tactics
- Never make changes without checking existing search rankings first
- Never skip technical SEO (sitemaps, robots.txt, structured data)
- Never send email, submit a listing, post to social, or create an account in autopilot — draft it and list it in the report.
- Never delete or redirect a page with traffic or inbound links without flagging it in the report first.

## Modes

Parse the first argument. No mode: audit.

| Mode | Invocation | What it does |
|---|---|---|
| audit (default) | `/seo [focus]` | Keyword research, on-page fixes, technical SEO, content strategy |
| autopilot | `/seo autopilot [site]` | Stateful end-to-end loop. State lives in `seo/` in the repo. |
| refresh | `/seo refresh <url\|path>` | Six-phase refresh of one existing page: SERP gap table, approval checkpoint, then the rewrite |
| titles | `/seo titles [path]` | Title audit and rewrite, bulk before/after table |

Each mode delegates to `seo-specialist` with the mode name and the user's arguments.

### autopilot

First run: setup. Then daily. Weekly when the last report is 7 or more days old. Monthly when the keyword map is 30 or more days old. Follows `${CLAUDE_PLUGIN_ROOT}/references/seo-specialist.md#autopilot`. Run it on a schedule with `/loop` or `/schedule`.

### refresh

Audit the page, research the SERP, build the gap table, plan, stop for approval, then rewrite. Follows `${CLAUDE_PLUGIN_ROOT}/references/seo-specialist.md#refresh`. Nothing is written before the user approves.

### titles

Audit titles against the SERP and rewrite them. Follows `${CLAUDE_PLUGIN_ROOT}/references/seo-specialist.md#titles`.

## Delegation

This command delegates to the **`seo-specialist`** agent. Methodology, output shape, and process live there — single source of truth.

**Dispatch:**
1. Parse the mode and the user's request (target site/pages, focus area: technical / on-page / keyword / content gap)
2. Delegate to `seo-specialist` via the Task tool (`Task({ subagent_type: "forgebee:seo-specialist" })`) with the mode and full context
3. Present the agent's findings to the user

**Fallback:** If agent delegation fails, surface the failure to the user and ask whether to retry or escalate.
