# Project Router — Decision Tree

Use the triage JSON from `detect_project.js` to classify and route.

## Primary Classification

```
Is wordpress.type != "none"?
├── YES → WORDPRESS domain
│   ├── wordpress.type == "plugin"
│   │   └── Load: conventions-wordpress.md § Plugin Development
│   ├── wordpress.type == "theme" AND wordpress.subtype == "block-theme"
│   │   └── Load: conventions-wordpress.md § Block Theme Development
│   ├── wordpress.type == "theme" AND wordpress.subtype == "classic-theme"
│   │   └── Load: conventions-wordpress.md § Classic Theme Development
│   ├── wordpress.type == "full-install"
│   │   └── Load: conventions-wordpress.md § Full Install (all sections)
│   └── wordpress.type == "mu-plugins"
│       └── Load: conventions-wordpress.md § Plugin Development (with MU-plugin notes)
│
├── NO → Check node.framework
│   ├── node.framework == "nextjs"
│   │   ├── node.nextjs_router == "app"
│   │   │   └── Load: conventions-nextjs.md § App Router
│   │   └── node.nextjs_router == "pages"
│   │       └── Load: conventions-nextjs.md § Pages Router
│   ├── node.framework == "express" | "hono"
│   │   └── Load: conventions-nextjs.md § Node API
│   ├── node.framework == "react" | "vite-react"
│   │   └── Load: conventions-nextjs.md § React SPA
│   ├── node.framework in ["nuxt", "svelte", "astro", "vue", "gatsby"]
│   │   └── Load: conventions-nextjs.md § Generic Node (adapt to framework)
│   │
│   ├── php.detected == true
│   │   ├── php.framework == "laravel"
│   │   │   └── Load: conventions-wordpress.md § PHP Generic (Laravel patterns)
│   │   └── php.framework == "symfony" | none
│   │       └── Load: conventions-wordpress.md § PHP Generic
│   │
│   └── FALLBACK → project_type == "unknown"
│       └── Ask user to confirm stack manually
```

## WordPress Ecosystem Overlay

```
Does wordpress.ecosystem contain entries?
├── "acf" in ecosystem → Load: conventions-wordpress.md § Advanced Custom Fields (ACF)
│   ├── "acf-pro" also present → Include ACF Blocks + Options Pages sections
│   └── "acf-pro" NOT present → Skip ACF Blocks + Options Pages (free version)
├── "woocommerce" in ecosystem → Note: WooCommerce detected — hooks, templates, and REST extensions apply
└── Empty → Standard WordPress only
```

## Styling Overlay (always check)

```
Does styling.systems contain any entries?
├── "tailwindcss" in systems → Load: conventions-styling.md § Tailwind CSS
├── "scss" in systems → Load: conventions-styling.md § SCSS/SASS
├── "css-modules" in systems → Load: conventions-styling.md § CSS Modules
├── "styled-components" in systems → Load: conventions-styling.md § CSS-in-JS
├── "postcss" in systems → Load: conventions-styling.md § PostCSS
└── Multiple systems → Load ALL matching sections (common in WP + Tailwind projects)
```

## Hybrid / Headless Detection

```
Is wordpress.type != "none" AND node.framework == "nextjs"?
├── YES → Headless WordPress + Next.js
│   ├── Load: conventions-wordpress.md § REST API / WPGraphQL
│   ├── Load: conventions-nextjs.md § App Router or Pages Router
│   └── Note: "Headless WP detected — WordPress provides content API, Next.js is the frontend"
└── NO → Single-stack project
```

## Supabase Overlay

```
Is supabase.detected == true?
├── YES → Database work routes to supabase-specialist (via database-specialist delegation)
│   ├── supabase.features contains "rls" → Existing RLS patterns to follow
│   ├── supabase.features contains "edge-functions" → Deno runtime active
│   ├── supabase.features contains "ssr" → @supabase/ssr for Next.js integration
│   └── supabase.features contains "realtime" → REPLICA IDENTITY FULL expected
└── NO → Database work handled directly by database-specialist
```

## Agent Routing Hints

Based on project type, prefer these Tier 1 agents (they auto-delegate to Tier 2 subagents):

### Dev Agents

| Project Type | Primary Agents | Always Include |
|-------------|---------------|----------------|
| WordPress plugin | backend-engineer → wordpress-backend, security-auditor → wordpress-security | test-engineer → phpunit-engineer |
| WordPress theme | frontend-specialist → wordpress-frontend, ux-designer | test-engineer → phpunit-engineer |
| WordPress block theme | frontend-specialist → wordpress-frontend, backend-engineer → wordpress-backend | test-engineer → phpunit-engineer |
| Next.js App Router | frontend-specialist → nextjs-frontend, backend-engineer | test-engineer, security-auditor |
| Next.js + Supabase | frontend-specialist → nextjs-frontend, database-specialist → supabase-specialist | test-engineer, security-auditor |
| Node API only | backend-engineer, database-specialist | test-engineer, security-auditor |
| Headless WP + Next.js | backend-engineer → wordpress-backend, frontend-specialist → nextjs-frontend | test-engineer, security-auditor |

### Growth Agents

| Project Type | SEO Routes To | CRO Routes To | Content Routes To |
|-------------|--------------|--------------|-------------------|
| WordPress (any) | seo-specialist → wordpress-seo | conversion-optimizer → woocommerce-cro (if WC) | content-writer → wordpress-content |
| Next.js (any) | seo-specialist → nextjs-seo | conversion-optimizer → saas-cro | content-writer → nextjs-content |
| Headless WP + Next.js | seo-specialist → nextjs-seo (frontend SEO) | conversion-optimizer → saas-cro | content-writer → nextjs-content |
| Generic / other | seo-specialist (direct) | conversion-optimizer (direct) | content-writer (direct) |

**Note:** Tier 1 agents handle delegation automatically via their Delegation Strategy section. Orchestrators (team.md, workflow.md, growth.md) just spawn the Tier 1 agent — routing to Tier 2 happens internally.
