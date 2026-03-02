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
| `permission` | permission-guard.js | Every Bash command allow/deny/ask with tier |
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
echo '{"event_type":"query","limit":"20"}' | node "$CLAUDE_PROJECT_DIR/.claude/hooks/audit-trail.js"

# Filter by type
echo '{"event_type":"query","filter_type":"debate","limit":"50"}' | node "$CLAUDE_PROJECT_DIR/.claude/hooks/audit-trail.js"

# Filter by feature
echo '{"event_type":"query","filter_feature":"FEATURE_NAME","limit":"50"}' | node "$CLAUDE_PROJECT_DIR/.claude/hooks/audit-trail.js"
```

## Presentation

Present results in a clean table format. For summaries, calculate:
- Total decisions by type
- Block rate (% of debates that resulted in BLOCK)
- Verification pass rate
- Most-used permission patterns
- Escalation frequency

Always mention the time range covered by the audit data.
