---
name: learn
description: Analyze session observations and extract patterns as instincts
allowed-tools: Read, Write, Bash
---

# /learn — Extract Patterns as Instincts

## Objective

Review pending instincts (auto-detected by heuristics) and analyze observations to extract new patterns. Every instinct requires user approval before activation.

## Never

- Never activate instincts without explicit user approval
- Never create instincts from one-time events (API outages, typos)
- Never overwrite active instincts with lower-confidence versions

Analyze accumulated observations and the current session to extract reusable patterns as instincts.

## Process

### Step 1: Review Pending Instincts

Check for auto-detected pattern candidates first:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" review
```

If pending instincts exist, present each to the user with its signal, confidence, and session count. For each:
- **Activate**: `node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" review --activate <id>`
- **Reject**: `node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" review --reject <id>`

### Step 2: Analyze Observations

1. **Load observations** from the current project's `observations.jsonl`
2. **Analyze patterns** looking for:
   - User corrections (undo/redo, "no, use X instead")
   - Error resolutions (error → fix sequences)
   - Repeated workflows (same tool sequences)
   - Tool preferences (consistently using one tool over another)
3. **Check existing instincts** to avoid duplicates
4. **Create/update instincts** in `~/.claude/forgebee-learning/projects/<hash>/instincts/personal/`
5. **Report** what was learned

### Step 3: Show Status

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" status
```

## What to Extract

Look for:

1. **Error Resolution Patterns** — What error? What root cause? What fixed it?
2. **Debugging Techniques** — Non-obvious steps, tool combinations
3. **Workarounds** — Library quirks, API limitations, version-specific fixes
4. **Project-Specific Patterns** — Codebase conventions, architecture decisions
5. **Workflow Patterns** — Repeated tool sequences, file change patterns

## Output Format

Create instinct files at `~/.claude/forgebee-learning/projects/<hash>/instincts/personal/<pattern-name>.yaml`:

```yaml
---
id: pattern-name
trigger: "when [trigger condition]"
confidence: 0.5
domain: [code-style|testing|git|debugging|workflow|security|general]
source: session-observation
scope: project
project_id: <hash>
project_name: <name>
---

# Pattern Name

## Action
[What to do when triggered]

## Evidence
- [What observations led to this instinct]
- [Date and context]
```

## Notes

- Don't extract trivial fixes (typos, simple syntax errors)
- Don't extract one-time issues (API outages, etc.)
- Focus on patterns that save time in future sessions
- One pattern per instinct — keep them atomic
- Default to project scope — promote to global later if seen across projects
