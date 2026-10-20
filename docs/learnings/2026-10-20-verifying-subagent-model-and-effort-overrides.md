---
title: Verifying subagent model and effort overrides
author: Tiago Santos
date: 2026-10-20
touches:
  - forgebee/hooks/scripts/audit-trail.js
  - forgebee/hooks/hooks.json
---

## Decided
- Per-dispatch `model` override works: `model: haiku` ran claude-haiku-5-5, `model: sonnet` ran claude-sonnet-5-5.
- Subagents on Opus had no `model` on the Agent call. Fallback is frontmatter (24 agents `opus`), else main model (user settings `opus`, effort high).
- Ground truth per run: `~/.claude/projects/<proj>/<session>/subagents/*.meta.json` (requested model + effort) and `.message.model` in the subagent jsonl (actual model).

## Tried and ruled out
- `.claude/audit/*.jsonl` dispatch entries: empty until 7.1.0 PreToolUse hook (matcher `Task|Agent`) sees a dispatch. Not proof of a bug.

## Watch out
- Tier rule is advisory; orchestrator can omit `model`. Enforcement would need a PreToolUse check that blocks `forgebee:` dispatches without `model`.
- Bare names (`backend-engineer`) resolve to `.claude/agents/` local copies, not plugin agents.
