-- ============================================================================
-- PLC Gallery — Initial Schema & RLS Policies
-- Generated: 2026-04-17
-- Requires: Supabase (Postgres 15+) with auth schema
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
create type post_type as enum (
  'ai_assist', 'coloring', 'storybook', 'play_plan',
  'play_record', 'ai_sentence', 'activity_idea', 'custom'
);

create type visibility as enum ('public', 'team_only');

create type team_role as enum ('leader', 'member');

-- ---------------------------------------------------------------------------
-- TABLE: profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_bg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_nickname on public.profiles(nickname);

-- ---------------------------------------------------------------------------
-- TABLE: teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#F5EFE3',
  invite_code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_invite_code_format check (invite_code ~ '^KB-[A-Z0-9]{4,8}$'),
  constraint teams_color_format check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create index idx_teams_invite_code on public.teams(invite_code);
create index idx_teams_created_by on public.teams(created_by);

-- ---------------------------------------------------------------------------
-- TABLE: team_members (join table: users <-> teams)
-- ---------------------------------------------------------------------------
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role team_role not null default 'member',
  nickname text not null, -- per-team nickname (unique within a team)
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (team_id, nickname)
);

create index idx_team_members_user on public.team_members(user_id);
create index idx_team_members_team on public.team_members(team_id);

-- ---------------------------------------------------------------------------
-- TABLE: moodboards
-- ---------------------------------------------------------------------------
create table public.moodboards (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  cover_gradient text,
  team_dot text, -- team color dot for card
  is_visible boolean not null default true,
  visibility visibility not null default 'team_only',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_moodboards_team on public.moodboards(team_id);
create index idx_moodboards_visibility on public.moodboards(visibility) where is_visible = true;

-- ---------------------------------------------------------------------------
-- TABLE: posts (작품/게시물)
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  moodboard_id uuid not null references public.moodboards(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade, -- denormalized for RLS perf
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  one_liner text,
  post_type post_type not null default 'custom',
  custom_type_label text, -- when post_type = 'custom'
  tip_text text,
  image_path text, -- supabase storage path, e.g., 'posts/<team_id>/<uuid>.jpg'
  image_ratio text default '4:3',
  stage_bg text, -- card background color
  likes_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_moodboard on public.posts(moodboard_id);
create index idx_posts_team on public.posts(team_id);
create index idx_posts_author on public.posts(author_id);
create index idx_posts_created_at on public.posts(created_at desc);

-- ---------------------------------------------------------------------------
-- TABLE: post_likes
-- ---------------------------------------------------------------------------
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_post_likes_user on public.post_likes(user_id);

-- ---------------------------------------------------------------------------
-- TABLE: moodboard_follows
-- ---------------------------------------------------------------------------
create table public.moodboard_follows (
  moodboard_id uuid not null references public.moodboards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (moodboard_id, user_id)
);

-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------------

-- Touch updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger trg_moodboards_touch before update on public.moodboards
  for each row execute function public.touch_updated_at();
create trigger trg_posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- is_team_member helper (used in policies)
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- is_team_leader helper
create or replace function public.is_team_leader(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role = 'leader'
  );
$$;

-- generate_invite_code (KB-XXXX format, no ambiguous chars)
create or replace function public.generate_invite_code()
returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempts integer := 0;
begin
  loop
    result := 'KB-' || string_agg(substr(chars, (floor(random() * length(chars))::int) + 1, 1), '')
      from generate_series(1, 4);
    exit when not exists (select 1 from public.teams where invite_code = result);
    attempts := attempts + 1;
    if attempts > 50 then raise exception 'Could not generate unique invite code'; end if;
  end loop;
  return result;
end;
$$;

-- RPC: create_team_with_leader (atomic: team + leader membership)
create or replace function public.create_team_with_leader(
  p_team_name text,
  p_team_color text,
  p_nickname text
)
returns table(team_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_invite_code text;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_invite_code := public.generate_invite_code();

  insert into public.teams(name, color, invite_code, created_by)
  values (p_team_name, p_team_color, v_invite_code, v_user_id)
  returning id into v_team_id;

  insert into public.team_members(team_id, user_id, role, nickname)
  values (v_team_id, v_user_id, 'leader', p_nickname);

  -- ensure profile exists
  insert into public.profiles(id, nickname) values (v_user_id, p_nickname)
  on conflict (id) do update set nickname = excluded.nickname;

  return query select v_team_id, v_invite_code;
end;
$$;

-- RPC: join_team_by_code (atomic: find team, add member)
create or replace function public.join_team_by_code(
  p_invite_code text,
  p_nickname text
)
returns table(team_id uuid, team_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, name into v_team from public.teams where invite_code = upper(p_invite_code);
  if v_team.id is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (select 1 from public.team_members where team_id = v_team.id and user_id = v_user_id) then
    return query select v_team.id, v_team.name;
    return;
  end if;

  if exists (select 1 from public.team_members where team_id = v_team.id and nickname = p_nickname) then
    raise exception 'Nickname already taken in this team';
  end if;

  insert into public.team_members(team_id, user_id, role, nickname)
  values (v_team.id, v_user_id, 'member', p_nickname);

  insert into public.profiles(id, nickname) values (v_user_id, p_nickname)
  on conflict (id) do update set nickname = excluded.nickname;

  return query select v_team.id, v_team.name;
end;
$$;

-- like toggle + counter
create or replace function public.toggle_post_like(p_post_id uuid)
returns boolean -- returns new liked state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select exists(select 1 from public.post_likes where post_id = p_post_id and user_id = v_user_id) into v_exists;

  if v_exists then
    delete from public.post_likes where post_id = p_post_id and user_id = v_user_id;
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = p_post_id;
    return false;
  else
    insert into public.post_likes(post_id, user_id) values (p_post_id, v_user_id);
    update public.posts set likes_count = likes_count + 1 where id = p_post_id;
    return true;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — enable on all tables
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.moodboards enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.moodboard_follows enable row level security;

-- profiles: public read, self write
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

-- teams: members can read, only leaders can update, anyone can read by invite_code lookup (via RPC)
create policy "teams_select_members" on public.teams
  for select using (public.is_team_member(id));
create policy "teams_insert_authenticated" on public.teams
  for insert with check (auth.uid() is not null);
create policy "teams_update_leader" on public.teams
  for update using (public.is_team_leader(id));

-- team_members: member can read own team's members, anyone authenticated can insert themselves
create policy "team_members_select_same_team" on public.team_members
  for select using (public.is_team_member(team_id));
create policy "team_members_insert_self" on public.team_members
  for insert with check (auth.uid() = user_id);
create policy "team_members_delete_self_or_leader" on public.team_members
  for delete using (auth.uid() = user_id or public.is_team_leader(team_id));

-- moodboards: public ones viewable by all; team_only viewable by team members; edit by team members
create policy "moodboards_select_public_or_member" on public.moodboards
  for select using (
    (is_visible and visibility = 'public')
    or public.is_team_member(team_id)
  );
create policy "moodboards_insert_member" on public.moodboards
  for insert with check (public.is_team_member(team_id));
create policy "moodboards_update_member" on public.moodboards
  for update using (public.is_team_member(team_id));
create policy "moodboards_delete_leader_or_creator" on public.moodboards
  for delete using (public.is_team_leader(team_id) or created_by = auth.uid());

-- posts: visibility follows moodboard
create policy "posts_select_by_visibility" on public.posts
  for select using (
    exists(
      select 1 from public.moodboards m
      where m.id = posts.moodboard_id
        and (
          (m.is_visible and m.visibility = 'public')
          or public.is_team_member(m.team_id)
        )
    )
  );
create policy "posts_insert_team_member" on public.posts
  for insert with check (
    public.is_team_member(team_id) and author_id = auth.uid()
  );
create policy "posts_update_author" on public.posts
  for update using (author_id = auth.uid());
create policy "posts_delete_author_or_leader" on public.posts
  for delete using (author_id = auth.uid() or public.is_team_leader(team_id));

-- post_likes: authenticated users
create policy "post_likes_select_all" on public.post_likes for select using (true);
create policy "post_likes_insert_self" on public.post_likes
  for insert with check (auth.uid() = user_id);
create policy "post_likes_delete_self" on public.post_likes
  for delete using (auth.uid() = user_id);

-- moodboard_follows
create policy "mb_follows_select_all" on public.moodboard_follows for select using (true);
create policy "mb_follows_insert_self" on public.moodboard_follows
  for insert with check (auth.uid() = user_id);
create policy "mb_follows_delete_self" on public.moodboard_follows
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STORAGE — buckets & policies
-- ---------------------------------------------------------------------------
-- Bucket 'post-images' (public-read) + 'post-private' (team-scoped)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Storage policies: any team member of the team_id encoded in the first path segment can upload
create policy "post_images_public_read"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "post_images_team_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and public.is_team_member(
      (regexp_match(name, '^([0-9a-f-]{36})/'))[1]::uuid
    )
  );

create policy "post_images_team_member_update"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and public.is_team_member(
      (regexp_match(name, '^([0-9a-f-]{36})/'))[1]::uuid
    )
  );

create policy "post_images_team_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and public.is_team_member(
      (regexp_match(name, '^([0-9a-f-]{36})/'))[1]::uuid
    )
  );
