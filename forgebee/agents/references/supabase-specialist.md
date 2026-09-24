# Supabase Specialist — Reference Material

Working library for `forgebee/agents/supabase-specialist.md`. The persona holds rules; this file holds patterns.

---

## CLI

```bash
supabase init | start | stop | status
supabase link --project-ref <ref>

supabase migration new <name>
supabase db reset                      # drop + recreate from migrations + seed
supabase db push                       # apply migrations to remote
supabase db pull                       # remote schema → migration
supabase db diff -f <name>             # local changes → new migration file

supabase gen types typescript --local > src/types/database.ts

supabase functions new <name>
supabase functions serve
supabase functions deploy <name>
supabase functions deploy --no-verify-jwt <name>   # public: no JWT check

supabase secrets set MY_KEY=value
supabase secrets list
```

## RLS Patterns

```sql
CREATE POLICY "users_read_own" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "team_members_read" ON public.projects
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = (select auth.uid()))
  );

-- Read roles from app_metadata only: users can edit user_metadata themselves.
CREATE POLICY "admin_full_access" ON public.settings
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "public_read_posts" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (published = true);
```

INSERT uses `WITH CHECK` only; DELETE uses `USING` only. Write one policy per operation.

**Performance:**
- Wrap `auth.uid()` and `auth.jwt()` in `(select …)` so Postgres evaluates them once per query, not per row.
- Index every column a policy filters on (`user_id`, `team_id`).
- Prefer `col IN (SELECT …)` over a correlated `EXISTS` on large tables.
- Always add `TO authenticated` (or `anon`) so policies skip for other roles.

## Auth Integration

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- `SECURITY DEFINER` functions bypass RLS: always add `SET search_path = ''` and schema-qualify every name.
- `ON DELETE CASCADE` on `auth.users(id)` cleans up when a user is deleted.
- `raw_user_meta_data` is user-controlled (OAuth profile, signUp options). Use it for display data, never for roles or permissions.
- A failing `handle_new_user` blocks signup. Keep it simple.

## Client Queries (`@supabase/supabase-js`)

```ts
const supabase = createClient<Database>(url, anonKey);

const { data, error } = await supabase
  .from('posts')
  .select('id, title, profiles(display_name)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .range(0, 9);
if (error) throw error;

await supabase.from('profiles').select('*').eq('id', userId).single();        // error unless exactly 1 row
await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(); // null when 0 rows
await supabase.from('profiles').upsert({ id: userId, display_name: name }, { onConflict: 'id' });
await supabase.rpc('get_user_stats', { user_id: userId });
```

- Use generated `Database` types, never `any`.
- Check `error` before you use `data`.
- Choose `.single()` or `.maybeSingle()` on purpose.

## Next.js (`@supabase/ssr`)

Server client, browser client, and middleware session refresh: see `forgebee/agents/references/nextjs-frontend.md` (Supabase SSR section).

- Server Components, Route Handlers, Server Actions → server client (`createServerClient` + `cookies()`)
- Client Components → browser client (`createBrowserClient`)
- Middleware → `createServerClient` with request/response cookies; call `auth.getUser()` to refresh the session
- Never import the browser client in server code, or the reverse.
- On the server, trust `auth.getUser()` (revalidates the JWT), not `auth.getSession()`.

## Realtime

```ts
const channel = supabase
  .channel('room-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
    (payload) => {
      if (payload.eventType === 'INSERT') addMessage(payload.new);
      if (payload.eventType === 'UPDATE') updateMessage(payload.new);
      if (payload.eventType === 'DELETE') removeMessage(payload.old);
    },
  )
  .subscribe();

const presence = supabase.channel('room-presence');
presence
  .on('presence', { event: 'sync' }, () => setOnlineUsers(Object.values(presence.presenceState()).flat()))
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await presence.track({ user_id: userId, online_at: new Date().toISOString() });
  });

return () => { supabase.removeChannel(channel); supabase.removeChannel(presence); };
```

- Add the table to the `supabase_realtime` publication (dashboard or migration).
- `REPLICA IDENTITY FULL` is needed for full old-row data on UPDATE/DELETE.
- RLS applies: a user receives only rows they can SELECT.
- Remove channels on cleanup.

## Edge Functions (Deno)

```ts
// supabase/functions/process-webhook/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const body = await req.json();
    // …process with the user-scoped client (RLS applies)
    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Bad request' }, 400);
  }
});
```

```ts
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

- Import with `npm:` or `jsr:` specifiers. Share code through `_shared/`.
- Service role client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS: use it only for admin work after you verify the caller.
- Webhooks from third parties: verify the provider signature before any processing; deploy with `--no-verify-jwt`.
- Return an explicit status code on every error path.

## Storage

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

CREATE POLICY "users_manage_own_avatar" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);
```

```ts
await supabase.storage.from('avatars').upload(`${userId}/avatar.png`, file, { contentType: file.type, upsert: true });
await supabase.storage.from('documents').createSignedUrl('path/to/file.pdf', 3600);
supabase.storage.from('avatars').getPublicUrl('path/img.jpg', { transform: { width: 200, height: 200, resize: 'cover' } });
await supabase.storage.from('documents').list(`${userId}/`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
```

The first path segment is the user ID, so `storage.foldername(name)[1]` scopes access per user.

## Full-Text Search and pgvector

```sql
ALTER TABLE posts ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX posts_fts_idx ON posts USING GIN (fts);
```

```ts
await supabase.from('posts').select('*').textSearch('fts', 'supabase & auth');
```

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  embedding extensions.vector(1536)
);
CREATE INDEX ON documents USING hnsw (embedding extensions.vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, similarity float)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT d.id, d.content, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

Use HNSW for new indexes: it needs no training data and recalls better than IVFFlat. `ORDER BY <=>` is what uses the index.
