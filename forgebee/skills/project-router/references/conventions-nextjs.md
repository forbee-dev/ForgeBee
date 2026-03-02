# Next.js & TypeScript Conventions

Loaded by the project router when the triage detects a Next.js or Node.js/TypeScript project.
Agents receiving this reference should follow these patterns exactly.

---

## TypeScript General

### Coding Standards
- Strict mode: `"strict": true` in tsconfig.json — no exceptions
- Use `interface` for object shapes, `type` for unions/intersections/mapped types
- Prefer explicit return types on exported functions
- No `any` — use `unknown` and narrow with type guards, or define proper types
- Use `as const` for literal tuples and config objects
- Prefer `satisfies` over `as` for type-safe assignments: `const config = { ... } satisfies Config`
- camelCase for variables and functions, PascalCase for types/interfaces/components
- UPPER_SNAKE_CASE for environment variables and true constants
- Prefer named exports over default exports (better for refactoring and tree-shaking)

### Error Handling
- Use discriminated unions for result types: `type Result<T> = { ok: true; data: T } | { ok: false; error: string }`
- Wrap external calls in try/catch with typed error handling
- Use `Error` subclasses for domain errors: `class NotFoundError extends Error {}`
- Never swallow errors silently — log or propagate

### File Organization
- One component/module per file
- Co-locate tests: `utils.ts` → `utils.test.ts` (or `__tests__/utils.test.ts`)
- Co-locate types: keep types near usage, not in a global `types/` folder unless shared
- Barrel exports (`index.ts`) only at module boundaries, not everywhere

---

## Next.js — App Router (v13.4+)

### Directory Structure
```
src/
├── app/                     # App Router — routes and layouts
│   ├── layout.tsx           # Root layout (required)
│   ├── page.tsx             # Home page
│   ├── loading.tsx          # Loading UI (Suspense boundary)
│   ├── error.tsx            # Error boundary
│   ├── not-found.tsx        # 404 page
│   ├── globals.css          # Global styles
│   ├── (marketing)/         # Route group (no URL segment)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── [id]/
│   │       └── page.tsx     # Dynamic route
│   └── api/                 # Route Handlers (API routes)
│       └── webhooks/
│           └── route.ts
├── components/              # Shared React components
│   ├── ui/                  # Primitive UI components
│   └── features/            # Feature-specific components
├── lib/                     # Shared utilities, clients, helpers
│   ├── db.ts                # Database client
│   ├── auth.ts              # Auth utilities
│   └── utils.ts             # General helpers
├── types/                   # Shared TypeScript types
└── styles/                  # Global and shared styles
```

### Server vs Client Components
- **Default is Server Component** — no `"use client"` needed
- Add `"use client"` ONLY when you need: useState, useEffect, event handlers, browser APIs
- Push `"use client"` as far down the tree as possible — keep layouts and pages as Server Components
- Server Components can import Client Components, but NOT vice versa
- Pass server data to client components via props, not by importing server code

### Data Fetching (App Router)
```tsx
// Server Component — fetch directly, no useEffect
async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });
  // or: cache: 'no-store' for dynamic data
  // or: cache: 'force-cache' for static (default)
  return <Component data={data} />;
}
```

- Use `fetch()` in Server Components — it's extended with caching
- For database queries, use server actions or direct calls in Server Components
- Use `generateStaticParams()` for static generation of dynamic routes
- Use `loading.tsx` for streaming/Suspense boundaries
- Use `revalidatePath()` / `revalidateTag()` for on-demand revalidation

### Server Actions
```tsx
'use server';

export async function createItem(formData: FormData) {
  const name = formData.get('name') as string;

  // Validate
  if (!name || name.length < 2) {
    return { error: 'Name is required' };
  }

  // Mutate
  await db.items.create({ data: { name } });

  // Revalidate
  revalidatePath('/items');
}
```

- Mark with `'use server'` at the top of the file or function
- Always validate inputs — Server Actions are public HTTP endpoints
- Use `revalidatePath()` or `revalidateTag()` after mutations
- Return structured results, don't throw (better for forms)

### Route Handlers (API Routes)
```tsx
// app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const items = await getItems(searchParams);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // validate body...
  const item = await createItem(body);
  return NextResponse.json(item, { status: 201 });
}
```

### Middleware
```tsx
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check, redirects, headers, etc.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

---

## Next.js — Pages Router (Legacy)

### Directory Structure
```
src/
├── pages/                   # File-based routing
│   ├── _app.tsx             # App wrapper
│   ├── _document.tsx        # Document wrapper
│   ├── index.tsx            # Home
│   ├── api/                 # API routes
│   │   └── items.ts
│   └── [slug].tsx           # Dynamic route
├── components/
├── lib/
├── styles/
└── types/
```

### Data Fetching (Pages Router)
- `getStaticProps` — build-time data fetching (SSG)
- `getServerSideProps` — request-time data fetching (SSR)
- `getStaticPaths` — define dynamic routes for SSG
- **Never mix** App Router and Pages Router patterns in the same project

---

## Node.js API (Non-Next.js)

### Express / Hono Patterns
- Structure: `routes/` → `controllers/` → `services/` → `repositories/`
- Middleware pipeline: auth → validation → handler → error handler
- Validate request bodies with Zod: `const schema = z.object({ ... })`
- Return consistent error shapes: `{ error: string, code: string, details?: unknown }`
- Use async error wrapper or express-async-errors for try/catch-free handlers

---

## Environment Variables

### Next.js Conventions
- `NEXT_PUBLIC_*` — exposed to browser (public)
- Everything else — server-only
- Use `@t3-oss/env-nextjs` or manual validation in `env.ts` for type safety
- **Never** put secrets in `NEXT_PUBLIC_*` variables
- `.env.local` for local dev, `.env` for defaults, `.env.production` for prod overrides

### Validation Pattern
```tsx
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  API_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

---

## Testing (TypeScript/Next.js)

### Jest / Vitest
- Co-locate tests: `component.tsx` → `component.test.tsx`
- Use `@testing-library/react` for component tests
- Mock external dependencies with `vi.mock()` (Vitest) or `jest.mock()`
- Test Server Components by testing their data-fetching logic separately
- Test Client Components with render + user interaction

### Playwright (E2E)
- Page Object pattern for complex flows
- Test critical user paths: auth flow, main CRUD operations, payment
- Use `test.describe()` for grouping related tests
- Run against preview deployments in CI

### Running Tests
```bash
# Unit/integration
npm test                # or: npx vitest
npm run test:coverage   # with coverage

# E2E
npx playwright test
npx playwright test --ui  # interactive mode
```

---

## Verification Checklist (for agents)

Before marking any Next.js/TypeScript task as done:

- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No lint errors: `npx eslint .` or `npx biome check .`
- [ ] Server Components don't use client-only APIs (useState, useEffect, etc.)
- [ ] Client Components have `"use client"` directive
- [ ] Server Actions validate all inputs
- [ ] Environment variables are validated and typed
- [ ] No secrets in `NEXT_PUBLIC_*` variables
- [ ] Dynamic routes have proper loading/error states
- [ ] API routes return consistent error shapes
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
