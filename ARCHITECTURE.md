# ForgeBee Architecture

How the framework fits together, for maintainers. For the contribution contract
see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Source of truth & mirrors

- **`forgebee/`** is the canonical plugin source — agents, skills, commands, hooks,
  rules, contexts, templates, eval.
- **`forgebee/INDEX.md`** is **auto-generated** by `scripts/build-index.js` from the
  frontmatter of every surface. It is loaded on `SessionStart` so the model routes
  intent in one read instead of scanning every block. Never hand-edit it; regenerate.
- **`.claude/`** is a **gitignored, regenerable local mirror** of agents/commands
  that Claude Code auto-loads. `scripts/sync-local-install.js` rebuilds it from
  `forgebee/` (overwrites + prunes — safe because it's disposable). Do not treat
  edits there as canonical.
- **`forgebee.plugin`** is a build artifact and is gitignored — generate at release
  time, never commit.

## Surfaces

| Surface | Location | Loaded |
|---------|----------|--------|
| Agents (46) | `forgebee/agents/*.md` | dispatched via `Task` by orchestrators |
| Skills (34) | `forgebee/skills/*/SKILL.md` | activated by name / `skill-activator` |
| Commands (38) | `forgebee/commands/*.md` | `/name` slash invocation |
| Shared contracts | `forgebee/skills/_review-finding-contract.md`, `_debate-protocol.md` | imported by review/debate skills |

## Hooks (Claude Code only)

`forgebee/hooks/hooks.json` wires 25 Node lifecycle hooks (`forgebee/hooks/scripts/`)
to Claude Code events (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse,
PreCompact, Stop, PermissionDenied, Notification, TaskCompleted, TeammateIdle).
`_common.js` is the shared helper library (not itself a hook). These are the
framework's enforcement backbone — permission-guard, secret-scan, audit-trail,
project-triage, observe (continuous learning), the post-edit quality hooks.

**Parity caveat:** the Codex/Cursor/Gemini manifests re-point at the same
`forgebee/` skills/agents/commands, but they have no hook runtime — so the hooks,
governance trail, and learning loop are Claude-Code-only. See the parity matrix in
the README.

## Governance & learning

- **Audit trail** — `audit-trail.js` appends permission decisions, debate rulings,
  verification verdicts, and dispatches to `.claude/audit/*.jsonl`; query via `/audit`.
- **Continuous learning** — `observe.js` (PreToolUse/PostToolUse) records tool-use
  observations; `self-improve.js` (Stop) flags repeated patterns as pending instincts;
  `/learn` and `/evolve` promote them. Scoring/scope/conflict rules live in
  `forgebee/skills/continuous-learning/references/scope-and-confidence.md`.

## Build & quality scripts (`scripts/`)

| Script | Role | In `npm run check`? |
|--------|------|:---:|
| `build-index.js` | Generates INDEX.md from frontmatter (`--check` validates sync; also surfaces injection-scan rejections) | ✅ |
| `check-references.js` | Validates persona ↔ reference pairs | ✅ |
| `check-agent-contract.js` | Enforces the load-bearing agent contract (hardening + Status protocol) | ✅ |
| `bump-version.sh` | Syncs the version string across all declared files (`--check`, `--audit`); does **not** sync counts | ✅ (`--check`) |
| `inject-*.js` | **One-time migrations** that bulk-applied a section to existing agents. Idempotent, run by hand — **not** standing gates. | ❌ |
| `sync-local-install.js` | Rebuilds the `.claude/` mirror from `forgebee/` | ❌ |

## Testing

- **Eval harness** — `forgebee/eval/harness/run.js` runs every `forgebee/eval/scenarios/*.js`
  (deterministic JS: permission-guard, build-scripts, project-router). Part of `npm run check`.
- **Golden tasks** — `forgebee/eval/golden/` tests prompt **output** (does a review
  skill flag a planted issue, in the P6 vocabulary?). Opt-in (`npm run eval:golden`),
  needs the `claude` CLI, SKIPs cleanly without it. This is the prompt-regression layer.

## CI (`.github/workflows/`)

- `check.yml` — runs the full `npm run check` on every PR (no path filter). The merge gate.
- `eval.yml`, `index-check.yml`, `references-check.yml`, `version-check.yml` — granular,
  path-filtered jobs for fast targeted feedback.
- `sync-manifests.yml` — keeps the IDE manifests aligned.

## Multi-IDE packaging

One source, four manifests: `.claude-plugin/marketplace.json` (+ `forgebee/.claude-plugin/plugin.json`),
`.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`,
plus `openclaw/install-openclaw.js` (converts agents/commands to OpenClaw skills).
All version-bearing files are listed in `.version-bump.json` and kept in sync by
`bump-version.sh`. Surface **counts** in manifest/README prose are maintained by hand.
