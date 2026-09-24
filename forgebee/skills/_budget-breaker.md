# Budget Circuit Breaker (shared reference)

> Cited by `/workflow` and `/team`. No hook enforces this; the orchestrator applies it itself. It stops runaway dispatch fan-out (for example a skeptic that spawns a sub-debate that spawns another).

## Envelope

Every `Task()` dispatch carries a budget. Sub-dispatches increment `hopCount` and pass the same envelope on:

```json
{ "budget": { "hopCount": 1, "maxHops": 8, "maxTokens": null, "maxUsd": null } }
```

## Rules

- `hopCount` starts at 1 (the first dispatch). Each sub-dispatch adds 1.
- Reject a dispatch that makes `hopCount > maxHops` with `HOP_LIMIT_EXCEEDED`.
- `maxHops` default **8**, absolute ceiling **64**. Never accept or set a higher value.
- `maxTokens` / `maxUsd` are optional. When set, reject with `TOKEN_LIMIT_EXCEEDED` / `USD_LIMIT_EXCEEDED`.
- Report a trip to the **user** with the full dispatch chain and reason, and log it to `.claude/audit/`.

## Oracle-leakage defense (multi-tenant / untrusted fan-out only)

When dispatches can cross a trust boundary, error strings sent **to peer agents** are **constants only**. Never echo current or remaining budget, so a hostile peer cannot probe thresholds. The user and the audit log get full budget state; the triggering peer does not. `--debug-budget` dumps the full envelope to the user on every dispatch (debug only; it leaves the oracle gap open for that run).

For a single-user pipeline (the common case) the hop counter alone is enough.
