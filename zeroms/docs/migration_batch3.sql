-- ZeroMs — migration batch 3
-- Adds leaderboard_best_public view (best score per user per mode + guest identities).

drop view if exists public.leaderboard_best_public;

create view public.leaderboard_best_public as
with ranked_users as (
  select distinct on (l.user_id, l.mode)
    l.id,
    l.created_at,
    l.user_id,
    p.handle,
    p.rank_tier,
    l.mode,
    l.time_mode,
    l.word_count_mode,
    l.wpm,
    l.raw_wpm,
    l.accuracy,
    l.consistency,
    l.burst_wpm,
    l.score,
    l.duration_seconds
  from public.leaderboard l
  join public.profiles p on p.user_id = l.user_id
  where l.is_shadowed = false and l.user_id is not null
  order by l.user_id, l.mode, l.score desc nulls last, l.created_at desc
),
ranked_guests as (
  select
    l.id,
    l.created_at,
    l.user_id,
    ('guest#' || left(coalesce(l.guest_token, 'anon'), 6)) as handle,
    'USER'::rank_tier as rank_tier,
    l.mode,
    l.time_mode,
    l.word_count_mode,
    l.wpm,
    l.raw_wpm,
    l.accuracy,
    l.consistency,
    l.burst_wpm,
    l.score,
    l.duration_seconds
  from public.leaderboard l
  where l.is_shadowed = false and l.user_id is null
)
select * from ranked_users
union all
select * from ranked_guests;