# tdd-enforcer — Reference Material

Working library for `forgebee/agents/tdd-enforcer.md`. The persona holds rules; this file holds the protocol and templates.

---

## Pre-Implementation Protocol

### Step 1: Analyze the Task

Extract behaviors, inputs, outputs, edge cases, and error conditions from the story.

### Step 2: Define Required Tests

```markdown
## Required Tests Before Implementation

### [Function Name]
1. **Happy path:** should [behavior] when [normal input] — Input: […] → Expected: […]
2. **Edge case:** should [behavior] when [boundary input] — Input: […] → Expected: […]
3. **Error case:** should [behavior] when [invalid input] — Input: […] → Expected: [error]

### Test Checklist
- [ ] Happy paths
- [ ] Boundary values
- [ ] Error conditions
- [ ] Null/empty/undefined
- [ ] Async behavior (if any)
- [ ] Integration points mocked
```

### Step 3: Verify RED

```bash
set -o pipefail
npm test -- --testPathPattern="[new-test-file]" 2>&1 | tail -20; echo "Exit code: $?"
```

Required: tests fail (non-zero exit). If they pass before the implementation exists, they do not test new behavior. Reject them.

`pipefail` matters: without it, `$?` is the exit code of `tail`, which is always 0.

### Step 4: Allow GREEN

After RED is confirmed, allow the minimum implementation that makes the tests pass. No extra code, no premature optimization.

```bash
set -o pipefail
npm test 2>&1 | tail -20; echo "Exit code: $?"
```

Required: all tests pass (exit 0).

### Step 5: Allow REFACTOR

After GREEN, allow cleanup, extraction, and renaming. Re-run the same command after each change; tests stay green.

## Post-Implementation Audit

### Check 1: Test-to-Code Ratio

```bash
BASE=$(git merge-base HEAD "$(git symbolic-ref -q --short refs/remotes/origin/HEAD || echo main)")
git diff --stat "$BASE" -- '*.test.*' '*.spec.*' 'test_*' '*_test.*'
git diff --stat "$BASE" -- . ':!*.test.*' ':!*.spec.*' ':!test_*' ':!*_test.*'
```

Run this check only against a ratio from triage or CLAUDE.md. The agent's Thresholds section resolves it.

### Check 2: Coverage of New Code

```bash
npm test -- --coverage --changedSince="$BASE" 2>&1 | tail -30
```

Run this check only against thresholds from triage or CLAUDE.md. None configured: skip Check 2 and say "no coverage threshold configured".

### Check 3: Test Quality

| Quality Check | Pass/Fail |
|--------------|-----------|
| Tests behavior, not implementation | |
| One assertion (or one related group) per test | |
| Descriptive names (should…when…) | |
| No test interdependencies | |
| Mocks external deps only | |
| Arrange-Act-Assert structure | |
| No unexplained magic values | |
| Edge cases covered | |

### Check 4: Git History Order

```bash
git log --oneline --diff-filter=A -- '*.test.*' '*.spec.*' | head -5
git log --oneline --diff-filter=A -- 'src/**' 'lib/**' | head -5
```

An implementation file committed before its test file is a TDD violation.

## Audit Verdict

```markdown
## TDD Audit Report

**Task:** [description]
**Verdict:** TDD COMPLIANT | PARTIAL COMPLIANCE | TDD VIOLATION

### Cycle Verification
| Phase | Result | Evidence |
|-------|--------|----------|
| RED (tests fail first) | PASS/FAIL | [git log or test output] |
| GREEN (minimal impl) | PASS/FAIL | [test output] |
| REFACTOR (still green) | PASS/FAIL | [test output] |

### Coverage
No coverage threshold configured: write "no coverage threshold configured" and skip the table.

| Metric | Value | Threshold | Result |
|--------|-------|-----------|--------|
| Statements | X% | [configured value] | PASS/FAIL |
| Branches | X% | [configured value] | PASS/FAIL |
| Functions | X% | [configured value] | PASS/FAIL |

### Test Quality Score: X/8

### Violations Found
- [file:line — violation]

### Required Actions
- [fix required before acceptance]
```
