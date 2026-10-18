---
name: learn
description: Analyze session observations and extract patterns as instincts
allowed-tools: Read, Write, Bash
---

# /learn — Extract Patterns as Instincts

## Objective

Review pending instincts (auto-detected by heuristics) and analyze observations to extract new patterns. Instincts below 0.7 require user approval before activation.

## Never

- Never activate instincts below 0.7 without explicit user approval
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

A rejection is permanent. The id goes to `.claude/learnings/rejected-instincts.json`, and `add` and `review --auto` refuse it.

### Step 2: Analyze Observations

You do not always need to run this step by hand. The `learn-auto.js` Stop hook asks Claude for this step once per session after a turn with 3+ tool calls. The `learn-digest.js` SessionStart hook auto-activates candidates at 0.7 or higher.

1. **Load observations** from the current project's `observations.jsonl`
2. **Analyze patterns** looking for:
   - User corrections (undo/redo, "no, use X instead")
   - Error resolutions (error → fix sequences)
   - Repeated workflows (same tool sequences)
   - Tool preferences (consistently using one tool over another)
3. **Check existing instincts** to avoid duplicates
4. **Create/update instincts** with `add`. It validates, redacts, and writes `~/.claude/forgebee-learning/projects/<hash>/instincts/personal/<id>.yaml`:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/instinct-cli.js" add \
     --id <kebab-id> --trigger "when ..." --confidence 0.5 --domain workflow [--scope global] <<'EOF'
   ## Action
   ...
   ## Evidence
   - ...
   EOF
   ```
   Confidence 0.7 or higher saves as `active`. Lower saves as `pending`. A re-add never replaces a higher-confidence instinct.
5. **Save code learnings** with `learning-cli.js add` when the session worked out something about the code. It writes a new file in `docs/learnings/`, never an edit. Commit it with the code:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/learning-cli.js" add \
     --title "<what it was about>" [--touches a/b.js,c.php] [--standing] <<'EOF'
   ## Decided
   ...
   ## Tried and ruled out
   ...
   ## Watch out
   ...
   EOF
   ```
   Use `--standing` when the user corrected how something is done in this repo.
6. **Report** what was learned

### Step 3: Compress Aged Learnings (auto)

Compress session entries in `.claude/learnings/learnings.md` older than 14 days to keep context budget under control. Originals are archived to `.claude/learnings/archive/learnings-YYYY-Q<N>.md` before compression — nothing is lost.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning/scripts/compress-learnings.js"
```

Compression rules:
- Preserve EXACTLY: code blocks, file paths, line refs, ISO dates, URLs, commit hashes, error messages
- Compress prose: drop articles, filler words, pleasantries — fragments OK
- Refuse on entries containing `.env`, credentials, `.ssh/`, `.aws/`, private keys, secrets, passwords (sensitive-path defense)

Override age threshold: `node compress-learnings.js --days 30` or set `FORGEBEE_LEARN_AGE_DAYS=30`.

### Step 4: Show Status

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
