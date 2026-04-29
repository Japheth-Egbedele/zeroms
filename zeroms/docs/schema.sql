-- ZeroMs / 0ms — Supabase schema (paste-and-run)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums (use text if you prefer; enums keep data clean)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rank_tier') then
    create type rank_tier as enum ('USER', 'SUDO', 'KERNEL', 'ROOT');
  end if;
  if not exists (select 1 from pg_type where typname = 'test_mode') then
    create type test_mode as enum ('On', 'Ologn', 'O1');
  end if;
end$$;

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  rank_tier rank_tier not null default 'USER',
  created_at timestamptz not null default now()
);

-- Leaderboard (all submissions go through service role API)
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_id uuid references auth.users(id) on delete set null,
  guest_token text,

  mode test_mode not null,
  time_mode int,
  word_count_mode int,

  wpm int not null,
  raw_wpm int,
  accuracy numeric(5,2) not null,
  consistency int,
  sigma numeric,
  burst_wpm int,
  score int,
  duration_seconds int,

  error_map jsonb not null default '{}'::jsonb,
  wpm_timeline jsonb not null default '[]'::jsonb,
  keystroke_log jsonb,
  is_trusted boolean not null default true,

  flags text[] not null default '{}'::text[],
  is_shadowed boolean not null default false,
  is_verified boolean not null default true
);

-- Helpful indexes
create index if not exists leaderboard_score_desc on public.leaderboard (score desc nulls last);
create index if not exists leaderboard_mode_score_desc on public.leaderboard (mode, score desc nulls last);
create index if not exists leaderboard_user_created_desc on public.leaderboard (user_id, created_at desc);
create index if not exists profiles_handle_idx on public.profiles (handle);

-- Public view: only non-shadowed rows, joined with handle/tier
create or replace view public.leaderboard_public as
select
  l.id,
  l.created_at,
  l.user_id,
  coalesce(p.handle, 'guest') as handle,
  coalesce(p.rank_tier, 'USER'::rank_tier) as rank_tier,
  l.mode,
  l.time_mode,
  l.word_count_mode,
  l.wpm,
  l.raw_wpm,
  l.accuracy,
  l.consistency,
  l.burst_wpm,
  l.score,
  l.error_map,
  l.wpm_timeline,
  l.duration_seconds
from public.leaderboard l
left join public.profiles p on p.user_id = l.user_id
where l.is_shadowed = false;

-- RLS
alter table public.profiles enable row level security;
alter table public.leaderboard enable row level security;

-- profiles: public read, user can update own
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- leaderboard: public read of non-shadowed rows (required for Supabase Realtime + anon client refetch)
-- NOTE: Rows include guest_token; consider moving tokens to a private table in a future revision.
drop policy if exists leaderboard_select_none on public.leaderboard;
drop policy if exists leaderboard_select_public on public.leaderboard;
create policy leaderboard_select_public
on public.leaderboard for select
to anon, authenticated
using (not is_shadowed);

drop policy if exists leaderboard_insert_none on public.leaderboard;
create policy leaderboard_insert_none
on public.leaderboard for insert
to anon, authenticated
with check (false);

-- Trigger: auto-create profile row on signup (handle derived from email prefix)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := split_part(coalesce(new.email, 'user'), '@', 1);
  base := regexp_replace(lower(base), '[^a-z0-9_-]+', '', 'g');
  if base = '' then
    base := 'user';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles(user_id, handle)
  values (new.id, candidate)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Realtime: In Supabase Dashboard → Database → Replication, enable `public.leaderboard` for inserts.
-- Alternatively (run once; ignore error if already present):
-- alter publication supabase_realtime add table public.leaderboard;

