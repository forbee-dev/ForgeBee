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

## Automatic loop

The loop runs without `/learn`. Set `auto_learn.enabled: false` in `config.json` to stop it.

1. **Stop ask.** `learn-auto.js` blocks one Stop per session when the turn made 3+ tool calls and saved nothing. Claude then reviews the session against the thresholds above.
2. **Save.** Claude runs `instinct-cli.js add` once per pattern, with the body on stdin.
3. **Auto-activate.** `add` saves an instinct at 0.7 or higher as `active`, else as `pending`. At session start, `learn-digest.js` also activates heuristic candidates at 0.7 or higher.
4. **Apply.** The session-start digest injects all active instincts. It lists new activations with the veto command `review --reject <id>`.
5. **Evolve.** Once per 24 h, with 3+ active instincts, the digest lists evolve candidates.

## Code learnings

Instincts store how the user works. Code learnings store what a session worked out about the code, so the next session does not explore it again.

- **Store.** `<project>/docs/learnings/YYYY-MM-DD-<slug>.md`. Frontmatter: `title`, `author`, `date`, optional `standing: true`, and `touches:` (repo-relative paths). The body uses `## Decided`, `## Tried and ruled out`, and `## Watch out`.
- **Capture.** The Stop ask also asks for one code learning when the turn found a decision, a dead end, or a trap. Claude runs `learning-cli.js add --title "..." [--touches a,b] [--standing]` with the body on stdin. Without `--touches`, the CLI uses paths named in the body plus files changed in the working tree.
- **Recall.** `learn-recall.js` (UserPromptSubmit) injects up to 3 learnings that share a file or words with the prompt. Files this session edited also count. Each learning is injected once per session.
- **Standing.** Use `--standing` when the user corrects how something is done in this repo. The session-start digest lists standing learnings.
- **Commit.** Commit `docs/learnings/` with the change it explains.
- Set `auto_learn.code_learnings: false` to turn this layer off. When `<project>/.trail/learnings` exists, Trail owns learnings and these hooks stay silent.

## Commands

| Command | Purpose |
|---------|---------|
| `/learn` | Analyze current session and extract patterns as instincts |
| `/evolve` | Cluster related instincts into skills/commands/agents |
| `/instinct-status` | Show all instincts (project + global) with confidence |
| `/instinct-export` | Export instincts (filterable by scope/domain) |
| `/instinct-import` | Import instincts with scope control |

`/learn` and `/evolve` are manual entry points for the same loop.

## References

- `references/architecture.md` — observation flow, project detection, hooks, file structure. Read for paths and storage.
- `references/scope-and-confidence.md` — confidence tiers, scope guide, promotion rules, privacy. Read before a global promotion.

## Never

- Never activate an instinct below 0.7 without explicit user approval. Instincts at or above 0.7 activate automatically and the next session start lists them with the veto command.
- Never mix project-scoped instincts across projects.
- Never create instincts from one-time events (API outages, typos).
- Never export raw observations. Export instincts only.
- Never edit or delete an existing code learning. A change gets a new file.
