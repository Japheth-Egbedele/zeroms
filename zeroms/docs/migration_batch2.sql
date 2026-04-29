-- ZeroMs — migration batch 2 (run in Supabase SQL editor if you already applied schema.sql v1)
-- Adds duration_seconds, public leaderboard SELECT for Realtime, extended leaderboard_public view.

alter table public.leaderboard add column if not exists duration_seconds int;

drop policy if exists leaderboard_select_none on public.leaderboard;
drop policy if exists leaderboard_select_public on public.leaderboard;
create policy leaderboard_select_public
on public.leaderboard for select
to anon, authenticated
using (not is_shadowed);

drop view if exists public.leaderboard_public;
create view public.leaderboard_public as
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

-- Supabase Realtime: Database → Replication → enable `leaderboard` INSERT (and optionally UPDATE),
-- or run once (ignore error if already added):
-- alter publication supabase_realtime add table public.leaderboard;
