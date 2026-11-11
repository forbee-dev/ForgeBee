# Project Router — Decision Tree

Use the triage JSON from `detect_project.js` to classify and route.

## Primary Classification

```
Is wordpress.type != "none"?
├── YES → WORDPRESS domain
│   ├── wordpress.type == "plugin"
│   │   └── Load: conventions-wordpress.md § Plugin Development
│   ├── wordpress.type == "theme" AND wordpress.subtype == "block-theme"
│   │   └── Load: conventions-wordpress.md § Theme Development › Block Theme Structure
│   ├── wordpress.type == "theme" AND wordpress.subtype == "classic-theme"
│   │   └── Load: conventions-wordpress.md § Theme Development › Classic Theme Structure
│   ├── wordpress.type == "full-install"
│   │   └── Load: conventions-wordpress.md (all sections)
│   └── wordpress.type == "mu-plugins"
│       └── Load: conventions-wordpress.md § Plugin Development
│
├── NO → Check node.framework
│   ├── node.framework == "nextjs"
│   │   ├── node.nextjs_router == "app"
│   │   │   └── Load: conventions-nextjs.md § Next.js — App Router
│   │   └── node.nextjs_router == "pages"
│   │       └── Load: conventions-nextjs.md § Next.js — Pages Router
│   ├── node.framework == "express" | "hono"
│   │   └── Load: conventions-nextjs.md § Node.js API (Non-Next.js)
│   ├── node.framework == "react" | "vite-react"
│   │   └── Load: conventions-nextjs.md § TypeScript General
│   ├── node.framework in ["nuxt", "svelte", "astro", "vue", "gatsby"]
│   │   └── Load: conventions-nextjs.md § TypeScript General (adapt to framework)
│   │
│   ├── php.detected == true
│   │   ├── php.framework == "laravel"
│   │   │   └── Load: conventions-wordpress.md § PHP General
│   │   └── php.framework == "symfony" | none
│   │       └── Load: conventions-wordpress.md § PHP General
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
├── "styled-components" in systems → No section; follow the project's own config
├── "postcss" in systems → No section; follow the project's own config
└── Multiple systems → Load ALL matching sections (common in WP + Tailwind projects)
```

## Hybrid / Headless Detection

```
Is wordpress.type != "none" AND node.framework == "nextjs"?
├── YES → Headless WordPress + Next.js
│   ├── Load: conventions-wordpress.md § REST API
│   ├── Load: conventions-nextjs.md § Next.js — App Router or Pages Router
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

Dispatch the leaf agent (right of `→`) when the stack is known. A router loads two agent definitions, and the per-dispatch model does not reach the inner agent. Add `test-engineer` only when the repo has a real suite and the change adds a code path; add `security-auditor` only for auth, sessions, payments, PII, secrets, uploads, or untrusted input.

### Dev Agents

| Project Type | Primary Agents | Conditional |
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
| WordPress (any) | seo-specialist → wordpress-seo | growth-engineer → woocommerce-cro (if WC) | content-creator → wordpress-content |
| Next.js (any) | seo-specialist → nextjs-seo | growth-engineer → saas-cro | content-creator → nextjs-content |
| Headless WP + Next.js | seo-specialist → nextjs-seo (frontend SEO) | growth-engineer → saas-cro | content-creator → nextjs-content |
| Generic / other | seo-specialist (direct) | growth-engineer (direct) | content-creator (direct) |

**Note:** `/team` and `/workflow` dispatch the leaf. A Tier 1 router delegates through its Delegation Strategy section only when the caller does not know the stack.
