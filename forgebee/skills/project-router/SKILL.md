---
name: project-router
description: >
  Project triage and routing skill. Detects the project type (WordPress plugin/theme,
  Next.js, PHP, Node.js, etc.), available tooling, styling systems, and database setup.
  Routes to the correct conventions and guardrails. Should run at the start of any
  development session or when switching projects. Triggers on: "what kind of project is this",
  "detect project", "triage", "set up conventions", "what stack", session start.
version: 1.0.0
---

# Project Router

Classify the current project and load the right conventions, guardrails, and domain knowledge
before any work begins. This is the **first skill that should run** in any development session.

## When to Use

- Start of a new session in an unfamiliar codebase
- User asks "what kind of project is this?"
- Before `/plan`, `/workflow`, `/team`, or any implementation command
- When switching between projects (multi-repo workflows)
- When the skill-activator detects an unclassified project

## Inputs Required

- Repository root (working directory)
- User intent (optional — helps pick the right domain skill)

## Procedure

### Step 0: Run Detection

Execute the triage script to produce a machine-readable project profile:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/project-router/scripts/detect_project.js "$PROJECT_DIR"
```

Store the JSON output. This is the **single source of truth** for all routing decisions.

### Step 1: Classify and Route

Use the decision tree in `references/decision-tree.md` to map the triage output to:

1. **Primary domain** — WordPress, Next.js, PHP, Node.js, etc.
2. **Sub-domain** — Plugin, block theme, classic theme, App Router, Pages Router, etc.
3. **Convention set** — Which reference file(s) to load

### Step 2: Load Conventions

Based on the classification, read the appropriate convention reference(s):

| Project Type | Reference File |
|-------------|---------------|
| WordPress plugin | `references/conventions-wordpress.md` |
| WordPress theme (classic) | `references/conventions-wordpress.md` |
| WordPress block theme | `references/conventions-wordpress.md` |
| Next.js (App Router) | `references/conventions-nextjs.md` |
| Next.js (Pages Router) | `references/conventions-nextjs.md` |
| SCSS/Tailwind styling | `references/conventions-styling.md` |
| Generic PHP | `references/conventions-wordpress.md` (PHP section) |
| Generic Node.js | `references/conventions-nextjs.md` (Node section) |

**Always load `references/conventions-styling.md`** if the triage detects any styling system
(SCSS, Tailwind, CSS Modules, etc.) — styling conventions apply across all project types.

### Step 3: Present Triage Summary

Show the user a compact summary of what was detected:

```markdown
## Project Triage

**Type:** [WordPress Plugin / Next.js App Router / etc.]
**Stack:** PHP 8.2, Node 20, TypeScript
**Styling:** SCSS + Tailwind CSS
**Database:** MySQL (WordPress) / PostgreSQL (Prisma)
**Testing:** PHPUnit, Jest, Playwright
**CI/CD:** GitHub Actions, Docker
**Conventions loaded:** ✅ WordPress · ✅ Next.js · ✅ Styling

### Guardrails Active
- [List of key rules from conventions, e.g. "Use WordPress Coding Standards", "App Router patterns only"]

### Recommendations
- [Any suggestions, e.g. "No CLAUDE.md found — consider running /forgebee-setup"]
```

### Step 4: Inject Context

If the triage is being consumed by another command (e.g., `/workflow`, `/team`, `/plan`),
provide the triage JSON and loaded conventions as context for downstream agents.

Every agent dispatched should receive:
- The triage JSON (so they know what tools/frameworks are available)
- The relevant convention snippets (so they follow the right patterns)

## Verification

1. ✅ Detection script runs without errors
2. ✅ JSON output is valid and contains `project_type` field
3. ✅ At least one convention reference was loaded
4. ✅ Summary shown to user matches actual project structure
5. ✅ If CLAUDE.md exists, triage doesn't contradict its Stack section

## Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `project_type: "unknown"` | No recognizable framework files at root | Ask user to confirm project type manually; check if they're in a subdirectory |
| WordPress detected but no `theme.json` or plugin header | Might be a mu-plugin or custom structure | Check for `mu-plugins/` or ask user |
| Both WordPress and Next.js detected | Monorepo or headless WP + Next.js frontend | Load BOTH convention sets; ask user which is primary |
| SCSS detected but no Tailwind config | Project uses SCSS only | Load styling conventions, skip Tailwind sections |
| Empty `node.tools` despite package.json | Dependencies not installed yet | Note this in summary; suggest `npm install` first |

## Escalation

- If detection fails entirely → ask user to describe their stack manually
- If project is a monorepo → run detection on each workspace/package separately
- If project type is truly novel → fall back to generic conventions from CLAUDE.md
- For WordPress-specific deep questions → consult [WordPress Developer Resources](https://developer.wordpress.org/)
- For Next.js-specific deep questions → consult [Next.js Docs](https://nextjs.org/docs)
