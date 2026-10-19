---
title: Bare agent names in dispatch bypass ForgeBee model routing
author: Tiago Santos
date: 2026-10-19
touches:
  - forgebee/commands/team.md
  - forgebee/commands/workflow.md
  - forgebee/agents/backend-engineer.md
---

## Decided
- Cause of wrong subagent models: commands and agent delegate tables dispatch bare names (`subagent_type: "backend-engineer"`). The plugin registers agents as `forgebee:<name>`.
- In projects without local `.claude/agents/` copies, the bare name does not resolve. The orchestrator then picks a near-match project agent with no `model:` line, which inherits the session model.
- Proposed fix (not applied yet): use `forgebee:` prefixed names everywhere and fail loudly on an unresolved name.

## Tried and ruled out
- Frontmatter `model:` values are correct (24 opus, 19 sonnet, 3 haiku). The model values are not the problem.

## Watch out
- ClaudeKit hides the bug: its local `.claude/agents/` copies make bare names resolve. Test in another project.
- Local copy of `llm-app-engineer` is missing from `.claude/agents/`.
- `ANTHROPIC_BASE_URL` sends all requests through the caveman proxy. Unverified whether it keeps a subagent's model.
- Unverified whether subagents can spawn nested subagents. If not, the "Delegate to X" tables never run.
