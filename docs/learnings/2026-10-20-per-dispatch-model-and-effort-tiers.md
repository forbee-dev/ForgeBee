---
title: Per-dispatch model and effort tiers for orchestrator subagents
author: Tiago Santos
date: 2026-10-20
touches:
  - forgebee/hooks/scripts/orchestrator-mode.js
  - forgebee/commands/workflow.md
  - forgebee/commands/team.md
---

## Decided
- Agent tool `model` param overrides agent frontmatter `model:` per call. 24 agents (all FE/BE impl agents) are `model: opus` today.
- Proposed (not built): Work Breakdown tags each task with a tier (mechanical=haiku/low, implement=sonnet/medium, design=opus/high); orchestrator passes model+effort on dispatch; escalate one tier once on BLOCKED/DONE_WITH_CONCERNS.

## Tried and ruled out
- Switching impl-agent frontmatter to sonnet: cheaper default but also downgrades direct /debug and /review runs.

## Watch out
- Agent tool `effort` may only be set when an instruction (CLAUDE.md, skill, hook RULES) explicitly says so. The tier rule must be written into orchestrator RULES and the /workflow and /team dispatch steps.
- Override does not reach nested delegation: frontend-specialist -> wordpress-frontend via Task uses the inner agent's own frontmatter. Dispatch the leaf specialist directly.
- Override only applies with `forgebee:<name>` dispatch, not bare names.
