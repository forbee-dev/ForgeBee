---
name: audit-self
description: Re-run the ForgeBee self-audit — scores every skill, agent, and command against the scorecard. Detects regressions since the last run. Outputs timestamped findings.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Audit Self

## Objective

Detect regressions in ForgeBee's skill/agent/command quality since the last audit. Output timestamped findings at `docs/planning/audit-YYYY-MM-DD.md`.

## Never

- Never overwrite prior audit files — always timestamped
- Never report on every fine item — focus on problematic ones, top-20 max
- Never propose fixes outside the audit's scope — recommend, don't implement
- Never skip the regression-detection step — that's the main value

## Delegation

This command invokes the `audit-self` skill (`${CLAUDE_PLUGIN_ROOT}/skills/audit-self/SKILL.md`). The skill reads three scorecards from `forgebee/skills/audit-self/scorecards/`, applies them across every skill, agent, and command listed in `${CLAUDE_PLUGIN_ROOT}/INDEX.md`, and writes findings.

**Dispatch:**
1. Run the audit-self skill
2. The skill reads prior audit files in `docs/planning/audit-*.md` for regression detection
3. Output: path to new findings file + top-10 priority fixes inline

## Pairs with

- **continuous-learning** — over time, regressions detected by `/audit-self` become candidates for new instincts
- **Before version bumps** — run it before `/release`
