# Investigation: <symptom-or-ticket>

**Opened:** YYYY-MM-DD
**Owner:** <name>
**Status:** Open | Hypothesis ready | Handed off to debugger-detective | Closed

## Stronghold Evidence

<one confirmed fact with citation: error text, log line, stack frame, or commit. No stronghold: stop and ask the user.>

## Confirmed

- F-001: <observed fact> — cite: <path:line | log timestamp | commit hash>

## Deduced

- D-001: <conclusion> — rests on: F-001, F-002
  - **Reasoning:** <step chain; one wrong step breaks the deduction>

## Hypothesized

- H-001: <explanation>
  - **Would confirm:** <measurable check>
  - **Would refute:** <measurable check>
- H-002 [REFUTED YYYY-MM-DD by F-003]: <explanation> — refuted because: <citation>

## Next Steps (diagnostic, not fixes)

- [ ] <observation, experiment, or log to capture>

## Promotion Log

- H-001 promoted to F-NNN on YYYY-MM-DD (cite: <citation>)

## Handoff

The fix is a separate task for `debugger-detective`.

- **Handed off:** YYYY-MM-DD to debugger-detective
- **With finding:** F-NNN
- **Expected fix:** <one sentence, not the fix itself>
