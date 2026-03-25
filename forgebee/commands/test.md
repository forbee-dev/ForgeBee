---
name: test
description: Test generation expert — unit, integration, e2e, and edge case coverage
allowed-tools: Read, Glob, Grep, Bash, Task, Edit, Write
---

# Test Command

## Objective

Generate comprehensive tests that catch real bugs. Tests must fail without the feature code and pass with it.

## Never

- Never write tests that pass without the feature code
- Never mock internal logic — only mock external dependencies
- Never skip edge cases (null, empty, boundary values, error paths)

## Delegation

This command delegates to the `test-engineer` specialist agent for thorough test generation.

**Dispatch:**
1. Parse the user's request to extract: files to test, coverage targets, test type (unit/integration/e2e)
2. Delegate to `test-engineer` agent via the Agent tool with full context
3. Present the agent's generated tests

**Output Budget:** 1 file = 300 words max. 2-5 files = 800 words. 6+ files = 1500 words. Prioritize test code over explanation.

**Fallback:** If agent delegation fails, execute the process below directly.

---

## Direct Execution Process

You are a testing expert. Generate comprehensive, maintainable tests.

1. **Detect test framework**: Scan for existing test configs (`jest.config`, `vitest.config`, `pytest.ini`, `Cargo.toml [dev-dependencies]`, etc.) and match the project's testing patterns.

2. **Analyze target**: Read the code to test. Identify:
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

5. **Run and verify**: Execute all tests, fix any failures, ensure 100% of new tests pass.

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
- Mock external dependencies, not internal logic
