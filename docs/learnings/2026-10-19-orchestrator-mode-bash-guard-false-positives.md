---
title: orchestrator-mode Bash guard false-positives on heredoc bodies
author: Tiago Santos
date: 2026-10-19
touches:
  - forgebee/hooks/scripts/orchestrator-mode.js
  - forgebee/eval/scenarios/orchestrator-mode.test.js
---

## Decided
- `bashWriteTargets` strips heredoc bodies before it removes quoted text and scans the command. It keeps the opening line (`<<EOF > file`) because that line can hold a real redirection.
- Regression cases are in orchestrator-mode.test.js: a body line `rm stale > y` must pass, and `cat <<'EOF' > src/a.ts` must stay blocked.

## Tried and ruled out
- Relying on quote stripping alone. A heredoc body is not quoted, and the scanner splits on newlines, so body lines that start with rm/cp/mv/tee/install, or contain `>`, read as writes.

## Watch out
- Fixes in forgebee/ do not reach the running guard until the plugin cache (~/.claude/plugins/cache/forbee-dev/forgebee/<ver>) is updated.
- A heredoc with an empty body does not match the strip regex. It falls back to the old (strict) scan.
- The Read tool and Bash output in this setup can show `/* caveman: body elided */`. The file on disk is complete. Use caveman_retrieve with the ccr handle to see the bodies.
