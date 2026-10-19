# nextjs-frontend — Reference Material

Working library for `${CLAUDE_PLUGIN_ROOT}/agents/nextjs-frontend.md`. The persona holds rules; this file holds patterns.

---

## App Router Structure

```
app/
├── layout.tsx          # root layout
├── page.tsx            # /
├── loading.tsx         # Suspense boundary
├── error.tsx           # error boundary ('use client')
├── not-found.tsx
├── (auth)/             # route group, no URL segment
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/
│   ├── layout.tsx
│   └── settings/page.tsx
└── api/webhooks/route.ts
```

## Server vs Client Components

```tsx
async function PostList() {
  const posts = await getPosts();
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

```tsx
'use client';
import { useState } from 'react';

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? 'Liked' : 'Like'}</button>;
}
```

Server Components fetch data and read the backend; they cannot use state, effects, event handlers, or browser APIs. Put `'use client'` on the interactive leaf only.

## Server Actions

A Server Action is a public POST endpoint. Check auth and validate input inside it.

```tsx
// app/posts/new/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const PostInput = z.object({ title: z.string().min(1).max(200), content: z.string().min(1) });

export async function createPost(_prev: unknown, formData: FormData) {
  const user = await getUser();
  if (!user) return { error: 'Not signed in' };

  const parsed = PostInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Title and content are required' };

  await db.posts.insert({ ...parsed.data, authorId: user.id });
  revalidatePath('/posts');
  redirect('/posts');
}
```

Bind it in a Client Component with `useActionState(createPost, null)` to show the error; use `useFormStatus` for the pending state.

## Caching (Next 16 Cache Components)

Next 15 projects: skip this section. Data fetching is dynamic by default; you opt in to caching.

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true, partialPrefetching: true };
```

Set `partialPrefetching` explicitly. If unset, Next logs a warning. Cache Components needs the Node.js runtime; remove any `runtime` segment export. It replaces `experimental.ppr`, `experimental.dynamicIO`, and `experimental.useCache`.

```tsx
import { cacheLife, cacheTag } from 'next/cache';

export async function getPost(slug: string) {
  'use cache';
  cacheLife('days');
  cacheTag('posts', `post-${slug}`);
  return db.posts.find(slug);
}
```

- `'use cache'` works at file, component, or function level. The function must be `async`. Arguments and return values must be serializable.
- Read `cookies()`/`headers()`/`searchParams` outside the cached scope; pass the values as arguments.
- `cacheLife` takes a profile name (`seconds`, `minutes`, `hours`, `days`, `weeks`, `max`, `default`) or `{ stale, revalidate, expire }` in seconds. Omitted fields inherit from `default` (5 min stale, 15 min revalidate, never expire). `expire` must exceed `revalidate`. Set it in every cached scope. Define custom profiles under `cacheLife` in `next.config.ts`.
- `cacheTag(...tags)` takes up to 128 strings of up to 256 characters.
- `updateTag(tag)`: Server Actions only. The next read waits for fresh data (read-your-own-writes).
- `revalidateTag(tag, 'max')`: Server Actions and Route Handlers. Serves stale content while it revalidates. For webhooks that need immediate expiry, use `revalidateTag(tag, { expire: 0 })`. The one-argument form is deprecated.
- Short `cacheLife` (`revalidate: 0`, `expire` under 5 min, `stale` under 30 s) is not prerendered; wrap it in `<Suspense>`.
- Serverless: the default in-memory cache may not persist between requests. Consider `'use cache: remote'`.
- Cache keys include the build ID. Entries do not survive a deploy.

Sources: nextjs.org/docs/app/api-reference/{config/next-config-js/cacheComponents,directives/use-cache,functions/cacheLife,functions/cacheTag,functions/revalidateTag,functions/updateTag}.

## Tailwind v4 (CSS-first)

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.72 0.11 178); /* generates bg-brand-500, text-brand-500 */
}
```

- No `tailwind.config.js` by default. Put tokens in `@theme`. To keep a legacy JS config, load it with `@config "../tailwind.config.js"`.
- Vite apps: `npm install tailwindcss @tailwindcss/vite`, add `tailwindcss()` from `@tailwindcss/vite` to `plugins`, and use the same `@import "tailwindcss"`.
- `@theme` variables must be top-level. Use `:root` for plain variables that need no utilities.

Sources: tailwindcss.com/docs/installation/framework-guides/nextjs, tailwindcss.com/docs/installation/using-vite, tailwindcss.com/docs/theme.

## Supabase SSR

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
}
```

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export const createSupabaseBrowser = () =>
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
```

- Server Components, Route Handlers, Server Actions → `createSupabaseServer()`
- Client Components → `createSupabaseBrowser()`
- Proxy (`proxy.ts`) → `createServerClient` with request/response cookies (below)
- Do not import the browser client in server code, or the reverse.

## Proxy (Next 16: `proxy.ts`; Next 15: `middleware.ts`, export `middleware`)

```ts
// proxy.ts (Next 15: middleware.ts)
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() refreshes the session and revalidates with Auth. getClaims() verifies the JWT signature; getSession() verifies nothing.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...   # server-only: bypasses RLS
```

`NEXT_PUBLIC_` values ship to the browser. Legacy `anon` / `service_role` keys still work but Supabase deprecates them by end of 2026. Never put the secret key or other secrets behind that prefix.
