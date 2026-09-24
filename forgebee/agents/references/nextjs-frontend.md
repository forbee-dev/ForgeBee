# nextjs-frontend — Reference Material

Working library for `forgebee/agents/nextjs-frontend.md`. The persona holds rules; this file holds patterns.

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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

- Server Components, Route Handlers, Server Actions → `createSupabaseServer()`
- Client Components → `createSupabaseBrowser()`
- Middleware/proxy → `createServerClient` with request/response cookies (below)
- Do not import the browser client in server code, or the reverse.

## Middleware (Next 16: `proxy.ts`, export `proxy`)

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // getUser() refreshes the session cookie; getSession() does not revalidate the JWT.
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only: bypasses RLS
```

`NEXT_PUBLIC_` values ship to the browser. Never put the service role key or other secrets behind that prefix.
