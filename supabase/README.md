# Supabase Setup

## Apply initial schema

**Option A — via Supabase Dashboard (easiest for one-off)**
1. Open https://supabase.com/dashboard/project/jvbnjziiqlxjsqouohcm/sql/new
2. Copy the contents of `migrations/20260417000000_initial_schema.sql`
3. Paste and click **Run**
4. Verify tables exist: https://supabase.com/dashboard/project/jvbnjziiqlxjsqouohcm/editor

**Option B — via Supabase CLI**
```bash
npx supabase link --project-ref jvbnjziiqlxjsqouohcm
npx supabase db push
```

## Auth configuration
Dashboard → Authentication → Providers:
- **Email**: enable. For dev, turn OFF "Confirm email" so signup is instant.
- (Optional) Google / Kakao: add later.

## Storage bucket
The migration creates the `post-images` bucket automatically (public read).
Verify at: Dashboard → Storage → `post-images`

## Security note
After finishing setup, rotate the `service_role` key:
Dashboard → Settings → API → **Reset service_role key**
