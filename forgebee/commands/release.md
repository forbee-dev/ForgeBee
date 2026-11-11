---
name: release
description: Cut a release — pre-flight gate, version bump across all manifests, changelog, tag, and PR. Wraps bump-version.sh; never reimplements version logic.
allowed-tools: Read, Glob, Grep, Bash, Task, Skill, Edit
---

# Release

## Objective

Cut a clean, gated release in one flow: verify the tree is shippable, bump the version across every declared file, update the changelog, and propose the tag + PR. A single command for what is otherwise tribal knowledge split across `bump-version.sh`, `CHANGELOG.md`, and manual edits.

## Never

- Never release with a dirty tree or a red gate — pre-flight must pass first
- Never hand-edit version numbers in individual files — `scripts/bump-version.sh` is the single source of truth (it bumps all declared files atomically)
- Never push the tag or open the PR without showing the user the diff and the changelog entry first
- Never force past a failing check — surface the failure and stop

## Process

1. **Pre-flight** (all must pass; stop and report on any failure):
   - Clean tree: `git status --porcelain` empty, or only the intended release changes
   - On a release branch, not directly on `main`
   - `npm run check` green (index + references + agent-contract + version + eval + opencode)
   - `bash scripts/bump-version.sh --audit` — catches stale version strings outside the declared set
   - Run the `review-all` skill as the final quality gate, with the `npm run check` output as fresh evidence so it does not run the checks again; only Critical/High block the release
2. **Version**: derive the new semver from the user's intent (major/minor/patch) or an explicit value.
3. **Bump**: `bash scripts/bump-version.sh <version>` (updates every declared file).
4. **Changelog**: prepend a `## [<version>] — <YYYY-MM-DD>` section to `CHANGELOG.md`, summarizing commits since the last tag (`git log <last-tag>..HEAD --oneline`), grouped by type (feat/fix/docs/chore).
5. **Index**: if any skill/agent/command changed, regenerate with `node scripts/build-index.js`.
6. **Ship**: show the full diff + changelog entry. On approval — commit, tag `v<version>`, and open the PR (`gh pr create`) with the changelog entry as the body.

## Delegation

Version mechanics live in `scripts/bump-version.sh` (single source of truth) and the quality gate in the `review-all` skill. This command orchestrates them — it does not reimplement either.

## Fallback

If `bump-version.sh` or any gate fails, surface the exact failure and stop. A partial release (some files bumped, others not) is worse than no release — `bump-version.sh --check` will report the drift.
