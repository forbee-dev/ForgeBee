# Failure Capture: <symptom-or-ticket>

> Fill before any recovery action. The 3-fix Iron Law in `debugger-detective` counts attempts; this block stops a failed approach from coming back with cosmetic changes.

## Fields

- **Session:** <session id, commit, or timestamp>
- **Goal:** <one sentence>
- **Error:** <exact error, stack frame, or log line, quoted verbatim>
- **Last successful step:** <operation, with citation>
- **Last failed tool/command:** <exact call or command>
- **Repeated pattern:** <attempt 1/2/3. At attempt 3: stop and escalate per Iron Law>
- **Environment assumptions:** <OS, runtime version, env vars, network>

## Hypothesis

- **What I believe is happening:** <one sentence>
- **What evidence would confirm:** <measurable check>
- **What evidence would refute:** <measurable check>
- **Reversible?** Yes | No (if no: ask the user before acting)

## Action

Propose the recovery action only after the fields and hypothesis are filled.
