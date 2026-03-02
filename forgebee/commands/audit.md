---
name: audit
description: Query the governance audit trail — permission decisions, debate rulings, verification results, agent dispatches, and escalations.
allowed-tools: Read, Bash, Glob, Grep
---

# Audit Trail Viewer

You query and present the ForgeBee governance audit trail. The audit log is an append-only JSONL file at `.claude/audit/audit-YYYY-MM.jsonl`.

## What Gets Logged

Every governance decision is recorded with timestamp, session ID, and context:

| Event Type | Source | What's Logged |
|:-----------|:-------|:-------------|
| `permission` | permission-guard | Every Bash command allow/deny/ask with tier |
| `debate` | judge agents | Every ruling (approve/block/flag) with severity |
| `verification` | verification-enforcer | Every verdict with evidence summary |
| `escalation` | judge agents | High/Critical items escalated to user |
| `dispatch` | workflow/growth | Every agent dispatch with pipeline context |

## Usage

When the user runs `/audit`, determine what they want to see:

1. **Recent activity** (default) — show last 20 events across all types
2. **By type** — filter to permissions, debates, verifications, or escalations
3. **By feature** — show all governance events for a specific feature
4. **Summary** — counts and patterns across the full log

## Commands

```bash
# Recent events (default)
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/audit-trail.js" query --limit 20

# Filter by type
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/audit-trail.js" query --filter-type debate --limit 50

# Filter by feature
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/audit-trail.js" query --filter-feature FEATURE_NAME --limit 50

# If the plugin script is unavailable, fall back to direct JSONL parsing:
# Recent events
tail -20 .claude/audit/audit-$(date +%Y-%m).jsonl 2>/dev/null | while read line; do echo "$line" | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{const o=JSON.parse(d);console.log(o.timestamp+' ['+o.event_type+'] '+(o.feature||'-')+' → '+(o.summary||o.verdict||o.ruling||''))}catch(e){console.log(d)}})" ; done

# Filter by type
cat .claude/audit/audit-$(date +%Y-%m).jsonl 2>/dev/null | grep '"event_type":"debate"' | tail -50
```

## Presentation

Present results in a clean table format:

```markdown
## Audit Trail: [time range]

| Timestamp | Type | Feature | Summary |
|:----------|:-----|:--------|:--------|
| 2024-01-15 14:30 | debate | auth-refactor | APPROVE — code quality meets threshold |
| 2024-01-15 14:28 | verification | auth-refactor | VERIFIED — 47 tests pass, build clean |
| 2024-01-15 14:25 | dispatch | auth-refactor | backend-engineer → implement auth middleware |
| 2024-01-15 14:20 | permission | - | ALLOW — npm test (tier: safe) |
```

For summaries, calculate:
- Total decisions by type
- Block rate (% of debates that resulted in BLOCK)
- Verification pass rate
- Most-used permission patterns
- Escalation frequency

Always mention the time range covered by the audit data.

## Summary View

When the user asks for a summary or overview:

```markdown
## Governance Summary: [month/range]

### Decision Counts
| Type | Count |
|:-----|:------|
| Permissions | X |
| Debates | X |
| Verifications | X |
| Escalations | X |
| Dispatches | X |

### Quality Gates
- **Debate block rate:** X% (Y blocked / Z total)
- **Verification pass rate:** X% (Y verified / Z total)
- **Escalation frequency:** X events (Y critical)

### Patterns
- Most common permission: [pattern]
- Most debated feature: [feature]
- Average debates per feature: [number]
```
