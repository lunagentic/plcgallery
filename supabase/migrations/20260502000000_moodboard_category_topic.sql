-- Add category + free-form topic to moodboards
-- Category enum mirrors the FilterChips on the home page:
--   activities | environment | play | inquiry | parents | annual

create type public.moodboard_category as enum (
  'activities',
  'environment',
  'play',
  'inquiry',
  'parents',
  'annual'
);

alter table public.moodboards
  add column category public.moodboard_category not null default 'inquiry',
  add column topic text;

-- Backfill: existing rows already get default 'inquiry' from the column default,
-- but be explicit for clarity.
update public.moodboards set category = 'inquiry' where category is null;

create index idx_moodboards_category on public.moodboards(category)
  where is_visible = true;

-- ── Update RPC to accept category + topic ────────────────────────────
create or replace function public.create_moodboard(
  p_title text,
  p_description text default null,
  p_cover_gradient text default null,
  p_team_dot text default null,
  p_visibility text default 'team_only',
  p_category text default 'inquiry',
  p_topic text default null
)
returns public.moodboards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_team_color text;
  v_row public.moodboards;
  v_visibility public.visibility;
  v_category public.moodboard_category;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'Title is required';
  end if;

  select tm.team_id, t.color
    into v_team_id, v_team_color
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
   where tm.user_id = v_user_id
   order by tm.joined_at desc
   limit 1;

  if v_team_id is null then
    raise exception 'No team membership for current user';
  end if;

  v_visibility := case when p_visibility = 'public' then 'public'::public.visibility
                       else 'team_only'::public.visibility end;

  begin
    v_category := coalesce(p_category, 'inquiry')::public.moodboard_category;
  exception when others then
    raise exception 'Invalid category: %', p_category;
  end;

  insert into public.moodboards (
    team_id, title, description, cover_gradient, team_dot,
    is_visible, visibility, created_by, category, topic
  ) values (
    v_team_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_cover_gradient, '')), ''),
    coalesce(nullif(btrim(coalesce(p_team_dot, '')), ''), v_team_color),
    true,
    v_visibility,
    v_user_id,
    v_category,
    nullif(btrim(coalesce(p_topic, '')), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;
