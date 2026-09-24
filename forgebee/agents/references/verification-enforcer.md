# verification-enforcer — Reference Material

Working library for `forgebee/agents/verification-enforcer.md`. The persona holds rules; this file holds the protocol and templates.

---

## Verification Protocol

Run every command below with `set -o pipefail`. Without it, `echo $?` after `| tail` reports the exit code of `tail` (always 0), not of the test or build.

### Step 1: Identify What Changed

```bash
git diff --stat HEAD~1
git diff --name-only HEAD~1
```

| Change type | Evidence required |
|---|---|
| Code | Test output |
| Config | Validation output |
| Docs | Render/lint output |
| UI | Visual evidence (screenshot) |
| API | Request/response |

### Step 2: Collect Evidence by Type

**Tests — full suite, not only new tests:**
```bash
npm test 2>&1 | tail -20; echo "Exit code: $?"
```
Evidence: pass count and exit code 0.

**Build:**
```bash
npm run build 2>&1 | tail -10; echo "Exit code: $?"
```
Evidence: clean output, exit code 0.

**Lint and types:**
```bash
npm run lint 2>&1 | tail -10; echo "Exit code: $?"
npm run typecheck 2>&1 | tail -10; echo "Exit code: $?"
```
Evidence: zero errors.

**API:**
```bash
curl -s -w "\nHTTP_STATUS: %{http_code}\n" http://localhost:PORT/endpoint
```
Evidence: expected body and status code.

**Database migration:**
```bash
npm run db:migrate 2>&1
```
Evidence: migration output, then the resulting schema.

Use the project's equivalents (pytest, go test, composer, phpunit) where it is not a Node project.

### Step 3: Cross-Reference Requirements

| Criterion | Evidence | Verdict |
|-----------|----------|---------|
| [criterion text] | [command output or test name] | PASS / FAIL |

Every criterion needs its own evidence. "Implied by other tests" is not evidence.

### Step 4: Check for Regressions

```bash
npm test 2>&1 | grep -E "FAIL|fail|Error" | head -20
```

Compare against the baseline run before the change.

### Step 5: Verdict

```markdown
## Verification Report

**Task:** [description]
**Verdict:** VERIFIED | NOT VERIFIED | PARTIALLY VERIFIED

### Evidence Collected
| Check | Command | Result | Verdict |
|-------|---------|--------|---------|
| Tests | `npm test` | 47 passed, 0 failed | PASS |
| Build | `npm run build` | Clean, exit 0 | PASS |
| Lint | `npm run lint` | 0 errors | PASS |
| API | `curl /endpoint` | 200, correct body | PASS |

### Acceptance Criteria
| # | Criterion | Evidence | Verdict |
|---|-----------|----------|---------|
| 1 | [text] | [test name or output] | PASS / FAIL |

### Regressions
- None found / [failures]

### Missing Evidence
- [what could not be verified, and why]
```

## Claims to Reject

- "Tests pass" with no output → show the output.
- "Build works" with no run → run it.
- "The code looks correct" → that is review, not verification.
- "The user said it works" → run the commands yourself.
- "Small change, skipped lint" → lint everything.
