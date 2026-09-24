---
name: continuous-learning
description: Use when reviewing learned patterns from recent sessions, processing pending observations, or evolving repeated behaviors into reusable skills, commands, or agents.
version: 1.2.0
---

# Continuous Learning — Instinct-Based Architecture

## Objective

Turn session observations into atomic instincts: small learned behaviors with confidence scores that persist across sessions. Project-scoped by default, so React patterns stay in React projects and Python conventions in Python projects.

## When to Activate

- Review pending instincts after a work session.
- Turn recent observations into named patterns.
- Evolve repeated behaviors into skills, commands, or agents.
- Tune confidence thresholds, or promote a project instinct to global.

## The Instinct Model

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
scope: project
project_id: "a1b2c3d4e5f6"
project_name: "my-react-app"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional
```

One trigger, one action. Confidence 0.3 (tentative) to 0.9 (near certain). Domains: code-style, testing, git, debugging, workflow. Scope: `project` (default) or `global`.

## Process — Extracting an Instinct (the `/learn` loop)

Run this in-session. The references explain storage; these thresholds decide what becomes an instinct.

1. **Read the pool.** The project's `observations.jsonl` (paths in `references/architecture.md`). Each row is a tool call with inputs, outputs, timestamps.
2. **Cluster** observations that share a trigger ("editing a test file", "before a commit").
3. **Threshold.** A cluster becomes an instinct only when both hold:
   - **≥3 observations** support the same action, and
   - they span **≥2 distinct event types** (for example a tool-use pattern and a user correction). Repetition in one event type is a tooling habit, not a preference.
   - **Exception:** an explicit user correction ("no, always do X") counts as ~3 observations and can seed a tentative instinct alone.
4. **Confidence tier** (mirrors `references/scope-and-confidence.md`):
   - **0.3 (tentative)** — 3 observations of one event type, or one user correction. Suggested, not enforced.
   - **0.5 (moderate)** — 3-4 observations across ≥2 event types. Applied when relevant.
   - **0.7 (strong)** — 5+ observations across ≥2 event types, no contradiction. Auto-approved for application.
   - **0.9 (near-certain)** — 8+ consistent observations, or 0.7 plus explicit user confirmation. Core behavior.
   - Each contradicting observation drops one tier. Two contradictions in a row retire the instinct.
5. **Scope.** Default `project`. Promote to `global` only per the Scope Decision Guide in the reference. Security, git, and tool-workflow patterns are global; language, framework, file-structure, and style patterns stay project-scoped.
6. **Write the instinct** in the model shape. The `Evidence` block cites the observation count and the distinct event types.
7. **Surface for approval.** Below 0.7, present as a suggestion. At/above 0.7, present as auto-approvable but confirm on first activation.

Below threshold (1-2 observations, or one event type), leave it in the pool. Filtering thin evidence is the point of this loop.

## Commands

| Command | Purpose |
|---------|---------|
| `/learn` | Analyze current session and extract patterns as instincts |
| `/evolve` | Cluster related instincts into skills/commands/agents |
| `/instinct-status` | Show all instincts (project + global) with confidence |
| `/instinct-export` | Export instincts (filterable by scope/domain) |
| `/instinct-import` | Import instincts with scope control |

## References

- `references/architecture.md` — observation flow, project detection, hooks, file structure. Read for paths and storage.
- `references/scope-and-confidence.md` — confidence tiers, scope guide, promotion rules, privacy. Read before a global promotion.

## Never

- Never activate an instinct without explicit user approval.
- Never mix project-scoped instincts across projects.
- Never create instincts from one-time events (API outages, typos).
- Never export raw observations. Export instincts only.
