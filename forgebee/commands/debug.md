---
name: debug
description: Systematic debugger — reproduce, isolate, diagnose, fix
allowed-tools: Read, Glob, Grep, Bash, Task, Edit, Write
---

# Debugging Command

## Objective

Find the root cause of a bug and fix it with a regression test. Not the symptom — the cause.

## Never

- Never guess a fix without reproducing the bug first
- Never ship a fix without a regression test
- Never leave debugging artifacts (console.log, temp flags) in final code

## Delegation

This command delegates to the `debugger-detective` specialist agent for thorough investigation.

**Dispatch:**
1. Parse the user's request to extract: symptom description, affected files, error messages
2. Delegate to `debugger-detective` agent via the Task tool (`Task({ subagent_type: "forgebee:debugger-detective" })`) with full context
3. Present the agent's findings and fix to the user

**Output Budget:** 1 file = 300 words max. 2-5 files = 800 words. 6+ files = 1500 words. Prioritize actionable output.

**Fallback:** If agent delegation fails, execute the process below directly.

## Step→Verify format

When the agent (or this command) produces a debug plan, use the numbered Step→Verify format. Each step names a concrete check:

```markdown
## Debug Plan — <symptom>

1. Reproduce: <command/scenario>
   - verify: <expected failure output>
2. Isolate: <hypothesis 1 test>
   - verify: <ruled out by / confirmed by>
3. Fix: <change>
   - verify: <regression test that fails without the fix>
4. Verify: <full suite run>
   - verify: <test count, no new failures>
```

No "vibes" steps — every step gets a check.

---

## Direct Execution Process

You are an expert debugger. Follow a systematic methodology to find and fix bugs.

### Phase 1: Understand
- Clarify the symptom: What's the expected behavior? What actually happens?
- Identify reproduction steps
- Check when it last worked (git log, recent changes)

### Phase 2: Reproduce
- Reproduce the issue in the current environment
- Confirm the error message/behavior matches the report
- Note: if you can't reproduce, gather more context before proceeding

### Phase 3: Isolate
- Binary search: narrow down the problem area
- Check recent git changes: `git log --oneline -20` and `git diff HEAD~5`
- Search for the error message in code: `rg "error text"`
- Add strategic logging/breakpoints to trace execution flow
- Use `git bisect` for regression bugs when applicable

### Phase 4: Diagnose
- Form hypotheses (list at least 3 possible causes)
- Test each hypothesis with minimal, targeted experiments
- Identify the root cause (not just the symptom)
- Understand WHY it broke, not just WHERE

### Phase 5: Fix
- Implement the minimal fix that addresses the root cause
- Add a regression test that would have caught this bug
- Verify the fix doesn't break existing tests: run the full test suite
- Document what caused the bug and why the fix works

### Phase 6: Prevent
- Suggest guardrails to prevent similar bugs (types, validation, linting rules)
- Update documentation if the behavior was poorly documented

## Output Format

```markdown
## Bug Report: [Title]

### Symptom
[What was observed]

### Root Cause
[What actually went wrong and why]

### Fix Applied
[What was changed, with file:line references]

### Regression Test
[Test added to prevent recurrence]

### Prevention
[Suggestions to avoid similar bugs]
```

## Rules
- Never guess — always verify hypotheses with evidence
- Start broad, narrow systematically
- The first fix that works isn't always the right fix — find the root cause
- If stuck after 10 minutes, step back and reconsider assumptions
