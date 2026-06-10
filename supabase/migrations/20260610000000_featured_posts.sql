-- ---------------------------------------------------------------------------
-- Featured posts — admin-curated highlights on the gallery main page.
--
-- Admins (holders of the app_admin code) can pin any post to a "메인 추천"
-- section shown at the top of the home feed. Mirrors the admin-code auth
-- pattern used by update_post / delete_post: a SECURITY DEFINER RPC that
-- checks the passed code against public.app_admin before mutating.
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_at timestamptz;

-- Partial index: the featured section reads featured posts newest-first.
create index if not exists idx_posts_featured
  on public.posts (featured_at desc)
  where is_featured;

-- ---------------------------------------------------------------------------
-- RPC: set_post_featured
-- Admin-only. Toggles is_featured and stamps featured_at so the section can
-- order by when each post was pinned. Returns the updated row.
-- ---------------------------------------------------------------------------
create or replace function public.set_post_featured(
  p_post_id uuid,
  p_featured boolean,
  p_admin_code text default null
) returns public.posts
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
as $function$
declare
  v_is_admin boolean := false;
  v_updated public.posts;
begin
  if p_admin_code is not null then
    select (a.code = p_admin_code) into v_is_admin
      from public.app_admin a where a.id = 1;
    v_is_admin := coalesce(v_is_admin, false);
  end if;

  if not v_is_admin then
    raise exception 'Forbidden: only an admin can feature posts.';
  end if;

  update public.posts
     set is_featured = coalesce(p_featured, false),
         featured_at = case when coalesce(p_featured, false) then now() else null end
   where id = p_post_id
   returning * into v_updated;

  if v_updated.id is null then
    raise exception 'Post not found';
  end if;

  return v_updated;
end;
$function$;
