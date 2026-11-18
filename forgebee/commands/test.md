---
name: test
description: Test generation expert — unit, integration, e2e tests, and `prune` to find needless tests
allowed-tools: Read, Glob, Grep, Bash, Task, Edit, Write
---

# Test Command

## Objective

Generate tests that catch real bugs. Write no test for markup, styles, copy, or config. Tests must fail without the feature code and pass with it.

## Never

- Never write tests that pass without the feature code
- Never mock internal logic — only mock external dependencies
- Never skip edge cases (null, empty, boundary values, error paths) in the logic you test
- Never write a test only to raise coverage

## Delegation

This command delegates to the `test-engineer` specialist agent for thorough test generation.

**Dispatch:**
1. `prune` as the first word → run Prune Mode yourself. Do not delegate.
2. Else parse the user's request to extract: files to test, test type (unit/integration/e2e), and a coverage target only if the user gives one or the project configures one
3. Delegate to `test-engineer` agent via the Task tool (`Task({ subagent_type: "forgebee:test-engineer" })`) with full context
4. Present the agent's generated tests

**Output Budget:** 1 file = 300 words max. 2-5 files = 800 words. 6+ files = 1500 words. Prioritize test code over explanation.

**Fallback:** If agent delegation fails, execute the process below directly.

---

## Prune Mode

`/test prune [path]` writes no code. It finds tests that cost time and prove little.

1. Get per-file test durations from the runner when available (`jest --json`, `vitest --reporter=json`, PHPUnit `--log-junit`).
2. Classify each test file or test: keep, delete, or merge. Give a one-line reason.
3. Delete candidates:
   - Asserts mocks or spies, not results.
   - Duplicates the coverage of another test.
   - Tests markup, styles, copy, or config.
   - E2E for a thing a unit test proves.
   - Permanently skipped.
4. Output a table sorted by duration, slowest first.

| File | Verdict | Reason | Est. time saved |
|------|---------|--------|-----------------|

Never delete or edit a test without user approval.

---

## Direct Execution Process

You are a testing expert. Generate comprehensive, maintainable tests.

1. **Detect test framework**: Scan for existing test configs (`jest.config`, `vitest.config`, `pytest.ini`, `Cargo.toml [dev-dependencies]`, etc.) and match the project's testing patterns.

2. **Analyze target**: Read the code to test. Skip code that needs no test (markup, styles, copy, config, glue code) or that a test already covers. Identify:
   - Public API surface (functions, methods, endpoints)
   - Input parameters and their types
   - Return values and side effects
   - Dependencies to mock
   - Error paths and edge cases

3. **Design test cases** using the testing pyramid:

   **Unit tests** (most):
   - Happy path for each public function
   - Edge cases: null, undefined, empty, zero, negative, max values
   - Boundary conditions (off-by-one, array bounds)
   - Error cases (invalid input, missing data, network failures)
   - Type coercion gotchas

   **Integration tests** (some):
   - Component interactions
   - Database operations (with test fixtures)
   - API endpoint round-trips
   - Middleware chains

   **E2E tests** (few, if applicable):
   - Critical user flows
   - Cross-component scenarios

4. **Write tests**: Follow project conventions for:
   - File naming (`*.test.ts`, `*_test.go`, `test_*.py`)
   - Test structure (describe/it, test classes, etc.)
   - Assertion style (expect, assert, should)
   - Mock/stub patterns (jest.mock, unittest.mock, etc.)

5. **Run and verify**: Run the new tests and the related tests. A failing test is evidence of a bug: find the cause in product code before you edit a test.

## Output Format

```markdown
## Tests Generated: [Target]

### Coverage Summary
| Category | Tests | Status |
|----------|-------|--------|
| Happy path | N | Pass |
| Edge cases | N | Pass |
| Error handling | N | Pass |
| Integration | N | Pass |

### Test Files Created
- `path/to/test/file.test.ts` — N tests

### Run Results
[Test runner output]
```

## Rules
- Match existing test patterns in the project exactly
- Tests should be self-documenting (clear names, no comments needed)
- Each test tests ONE thing
- No test should depend on another test's state
- Use descriptive test names: "should return empty array when input is null"
- Always run tests after writing them
- Measure coverage only against a configured or given target
- Mock external dependencies, not internal logic
