---
name: codemaps
description: Generate or refresh token-lean architecture documentation optimized for AI context consumption
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Codemaps — Token-Lean Architecture Documentation

Generate or refresh architecture documentation optimized for AI context consumption. Each codemap stays under ~1000 tokens and captures structure, not implementation.

$ARGUMENTS: Optional flags — `--force` to regenerate all, `--diff` to show changes only.

## When to Use

- First session on a new project → generate initial codemaps
- After major feature additions or refactoring
- When subagents need codebase context but session is fresh
- Periodically (every ~20 sessions) to keep docs current

## Step 1: Detect Project Type

Read the triage JSON from `.claude/session-cache/triage.json` if it exists. Otherwise, scan for:

```
package.json       → Node.js / Next.js / React
composer.json      → PHP / WordPress / Laravel
pyproject.toml     → Python / Django / FastAPI
Cargo.toml         → Rust
go.mod             → Go
```

## Step 2: Generate Codemaps

Create or update codemaps in `docs/CODEMAPS/`:

| File | Contents | When |
|------|----------|------|
| `architecture.md` | System diagram, boundaries, data flow | Always |
| `backend.md` | Routes → controllers → services → repos | If API exists |
| `frontend.md` | Page tree, component hierarchy, state | If frontend exists |
| `data.md` | Tables, relationships, ACF fields | If database/CMS exists |
| `dependencies.md` | External services, integrations, APIs | Always |
| `wordpress.md` | Hooks, filters, CPTs, taxonomies, ACF groups | If WordPress |

### Codemap Format

Each codemap must be **token-lean** — optimized for AI context, not human reading:

```markdown
<!-- Generated: 2026-03-02 | Files scanned: 142 | Token estimate: ~800 -->

# Backend Architecture

## Routes
POST /api/users → UserController.create → UserService.create → UserRepo.insert
GET  /api/users/:id → UserController.get → UserService.findById → UserRepo.findById
PUT  /api/users/:id → UserController.update → UserService.update → UserRepo.update

## Key Files
src/services/user.ts (business logic, 120 lines)
src/repos/user.ts (database access, 80 lines)
src/middleware/auth.ts (JWT validation, 40 lines)

## Dependencies
- PostgreSQL (primary data store)
- Redis (session cache, rate limiting)
- Stripe (payment processing via src/integrations/stripe.ts)
```

### WordPress-Specific Codemap

```markdown
<!-- Generated: 2026-03-02 | Files scanned: 45 | Token estimate: ~600 -->

# WordPress Architecture

## Custom Post Types
portfolio → Portfolio Items (has_archive: true, supports: title, editor, thumbnail)
  └── ACF: project_url (url), project_tech (taxonomy), gallery (gallery)
service → Services (hierarchical: true)
  └── ACF: icon (image), pricing_table (repeater)

## Hooks (actions)
init → register_post_types(), register_taxonomies()
wp_enqueue_scripts → enqueue_frontend_assets() (priority: 10)
acf/init → register_options_pages(), register_field_groups()
rest_api_init → register_custom_endpoints()

## Hooks (filters)
the_content → add_cta_block() (priority: 20)
wp_nav_menu_items → add_search_to_menu() (priority: 10)
acf/load_field/name=hero_image → set_upload_dir()

## Template Hierarchy
front-page.php → Hero + Services Grid + Portfolio Slider
single-portfolio.php → Project Detail + Related Projects
archive-portfolio.php → Filterable Portfolio Grid
```

## Step 3: Diff Detection

1. If previous codemaps exist, calculate change percentage
2. If changes > 30%, show the diff and ask for approval before overwriting
3. If changes <= 30%, update in place
4. If `--force` flag, skip diff check and regenerate all

## Step 4: Add Metadata Headers

Every codemap gets a freshness header:

```markdown
<!-- Generated: YYYY-MM-DD | Files scanned: N | Token estimate: ~N -->
<!-- Stale after: 30 days | Last refresh: YYYY-MM-DD -->
```

## Step 5: Summary Report

After generation, write `.claude/session-cache/codemap-summary.txt`:

```
CODEMAP REPORT
==============
Generated: 2026-03-02
Files scanned: 142
Codemaps created: 4
Total tokens: ~3200

architecture.md  — 800 tokens (NEW)
backend.md       — 900 tokens (UPDATED, +15% from previous)
frontend.md      — 750 tokens (UNCHANGED)
data.md          — 750 tokens (NEW)

Next refresh recommended: 2026-04-01
```

## Integration with Project Router

The codemaps directory is auto-loaded by subagents when they need codebase context. The project-router triage JSON tells them WHAT stack is present; codemaps tell them HOW it's structured.

## Tips

- Focus on **structure and flow**, not implementation details
- Prefer **file paths and function signatures** over code blocks
- Use **ASCII arrows** (→) for call chains
- Keep each codemap under **1000 tokens**
- For WordPress: prioritize hooks, CPTs, and ACF over template hierarchy
- For Next.js: prioritize routes, API handlers, and data fetching patterns
- Run after every major PR merge or refactoring session
