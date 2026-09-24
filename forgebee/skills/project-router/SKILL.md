---
name: project-router
description: Use at session start or when switching projects — detects stack (WordPress, Next.js, PHP, Node), tooling, styling system, database, and routes to the right conventions and guardrails.
version: 1.1.0
---

# Project Router

## Objective

Detect project type, stack, and conventions so every later agent uses the right guardrails. Run first in a development session. Target: under 10 seconds.

## Never

- Never guess the stack. Verify from config files (package.json, composer.json, etc.).
- Never reuse stale triage. Re-detect if the project structure changed.
- Never skip WordPress detection when wp-config.php, or style.css with "Theme Name", exists.

## When to Use

- New session in an unfamiliar codebase, or when switching projects.
- User asks "what kind of project is this?"
- Before `/plan`, `/workflow`, `/team`, or any implementation command.
- The skill-activator reports an unclassified project.

## Procedure

### Step 0: Run Detection

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/project-router/scripts/detect_project.js "$PROJECT_DIR"
```

The JSON output is the single source of truth for routing.

### Step 1: Classify

Map the triage output with `references/decision-tree.md` to: primary domain (WordPress, Next.js, PHP, Node.js), sub-domain (plugin, block theme, classic theme, App Router, Pages Router), and convention set.

### Step 2: Load Conventions

| Project Type | Reference File |
|-------------|---------------|
| WordPress plugin / classic theme / block theme | `references/conventions-wordpress.md` |
| Next.js (App Router / Pages Router) | `references/conventions-nextjs.md` |
| SCSS/Tailwind styling | `references/conventions-styling.md` |
| Generic PHP | `references/conventions-wordpress.md` (PHP section) |
| Generic Node.js | `references/conventions-nextjs.md` (Node section) |

Always load `references/conventions-styling.md` when triage detects any styling system (SCSS, Tailwind, CSS Modules).

### Step 3: Present Triage Summary

**Output mode (per `terse-report`):** if the caller set `responseStyle: "orchestrator"` (`/workflow`, `/team`, `/plan`), emit the terse JSON and no prose. Otherwise emit the Markdown summary.

**Terse JSON (orchestrator mode):**

```json
{
  "status": "DONE",
  "project_type": "wordpress-plugin",
  "stack": ["PHP 8.2", "Node 20", "TypeScript"],
  "styling": ["SCSS", "Tailwind"],
  "database": "MySQL",
  "testing": ["PHPUnit", "Jest", "Playwright"],
  "ci": ["GitHub Actions", "Docker"],
  "conventions_loaded": ["wordpress", "styling"],
  "guardrails": ["WPCS", "nonce + capability checks on writes"],
  "recommendations": ["no CLAUDE.md — suggest forgebee-setup"]
}
```

Take values from the detection JSON only. When detection is inconclusive, use `"project_type": "unknown"` and add a `recommendations` note. The `status` field is required in both modes.

**Markdown summary (direct mode):**

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
- [key rules from conventions]

### Recommendations
- [e.g. "No CLAUDE.md found — consider running /forgebee-setup"]
```

### Step 4: Inject Context

When another command consumes the triage, pass every dispatched agent the triage JSON and the relevant convention snippets.

## Verification

1. Detection script runs without errors.
2. JSON is valid and has `project_type`.
3. At least one convention reference loaded.
4. Summary matches the actual project structure.
5. Triage does not contradict the Stack section of an existing CLAUDE.md.

## Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `project_type: "unknown"` | No framework files at root | Ask the user; check for a subdirectory |
| WordPress but no `theme.json` or plugin header | mu-plugin or custom structure | Check `mu-plugins/` or ask |
| Both WordPress and Next.js | Monorepo or headless WP + Next.js | Load both convention sets; ask which is primary |
| SCSS but no Tailwind config | SCSS only | Load styling conventions, skip Tailwind sections |
| Empty `node.tools` despite package.json | Dependencies not installed | Note it; suggest `npm install` |

## Escalation

- Detection fails → ask the user to describe the stack.
- Monorepo → run detection per workspace/package.
- Novel project type → use generic conventions from CLAUDE.md.
- Deep WordPress questions → [WordPress Developer Resources](https://developer.wordpress.org/). Deep Next.js questions → [Next.js Docs](https://nextjs.org/docs).
