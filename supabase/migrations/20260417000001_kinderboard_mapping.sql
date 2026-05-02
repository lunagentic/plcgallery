-- ============================================================================
-- Kinderboard mapping — link PLC Gallery profiles to external Kinderboard users.
-- Kinderboard is a separate system; we store the external user id + nickname
-- as a future bridge. Populated later via an Edge Function that verifies a
-- Kinderboard auth token server-to-server.
-- ============================================================================

alter table public.profiles
  add column if not exists kinderboard_user_id text unique,
  add column if not exists kinderboard_nickname text,
  add column if not exists kinderboard_linked_at timestamptz;

create index if not exists idx_profiles_kinderboard_user
  on public.profiles(kinderboard_user_id);

-- Helpful helper for future linking via RPC (placeholder — real verification
-- should happen in an Edge Function; this just writes the mapping once verified).
create or replace function public.link_kinderboard_account(
  p_kinderboard_user_id text,
  p_kinderboard_nickname text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
     set kinderboard_user_id = p_kinderboard_user_id,
         kinderboard_nickname = p_kinderboard_nickname,
         kinderboard_linked_at = now()
   where id = v_user_id;
end;
$$;
