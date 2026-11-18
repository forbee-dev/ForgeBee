# Test Policy

**A failing test**
- Find the root cause in the product code first. A failing test is evidence of a bug until you prove a different cause.
- Edit the test only when (a) the task changes the asserted behavior on purpose, or (b) the test is wrong. State the evidence in your report: file:line and the reason.
- Never weaken an assertion, add a skip, raise a timeout, add a retry, or delete a test to get a pass.
- No proof for (a) or (b): stop and report the failure. Do not edit the test.

**When to write a test**
- Write a test for: new non-trivial logic (branch, loop, parser, calculation); money, auth, or data paths; a bug fix (one regression test that fails without the fix); an explicit request.
- Write no test for: markup, styles, copy, config, glue code, renames, or code that an existing test already covers.
- No test written: report `Tests: none — <reason>`.
- Coverage is a target only when the project sets a threshold. Never write a test only to increase coverage.
- E2E: only for a critical user journey (login, signup, checkout, main conversion form) that has no e2e test. Extend an existing spec before you add a file. Never use e2e for a thing that a unit or integration test can prove.

**Running tests**
- During work, run only the tests related to the change (`jest --findRelatedTests <files>`, `vitest related <files>`, a PHPUnit path or `--filter`). Cannot find the related tests: run the full suite.
- Run the full suite one time, at the final gate before delivery. Run e2e only there, and only when the change touches a covered journey.

**Test quality**
- Tests should be independent — no shared mutable state
- Name tests for the behavior they verify, not the function they call
