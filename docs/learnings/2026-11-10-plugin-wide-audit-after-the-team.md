---
title: Plugin-wide audit after the /team and review-all rewrite
author: Tiago Santos
date: 2026-11-10
touches:
  - forgebee/commands/team.md
  - forgebee/commands/grill.md
  - forgebee/hooks/hooks.json
  - forgebee/skills/_review-finding-contract.md
---

## Decided
- /team is the default flow: goal + outcome, ticket claims checked against code, spec-writer spec, lead builds with leaf agents, review-all loop (fix all severities, max 3 rounds, then the user). User chose: lead is the builder, no builder agent.
- /workflow is only for ADR / auth / payments / data-model work.
- Shared review rules (merge-base scope, connected code, verify, lanes, what counts as a finding) live in _review-finding-contract.md; each review skill has a Method section.
- Workstreams go in the `stories` list of state.yaml; no schema change.

## Tried and ruled out
- A separate builder agent: adds a layer, and per-dispatch model does not reach nested agents.
- Removing the 0-100 review score: /audit-self parses it.

## Watch out
- A plugin command hides a skill with the same name (grill, investigate, audit-self). `Skill({skill:"grill"})` loads the command. Those commands now read their SKILL.md file directly.
- No agent has the Skill tool. An agent told to "invoke the X skill" cannot.
- TaskCompleted and TeammateIdle hooks are `type: "prompt"` with no tools; they are told to run tests they cannot run. Not changed.
- `rules/common/hooks.md` is injected into every user project but holds ForgeBee-development rules.
- `code-advocate`, `contract-validator`, `observer.md`, `context-guard.js` are called by nothing. Not deleted.
- ACF block-binding requirements in references/wordpress-content.md are unconfirmed (setting name may be `enable_block_bindings`).
- `/growth` no longer stops for approval at Step 1; only at the Execution Plan.
