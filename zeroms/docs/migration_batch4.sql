-- ZeroMs — migration batch 4
-- Adds leaderboard_top5_public view for per-user top-5 per mode.

drop view if exists public.leaderboard_top5_public;

create view public.leaderboard_top5_public as
select
  l.created_at,
  l.user_id,
  p.handle,
  p.rank_tier,
  l.mode,
  l.wpm,
  l.accuracy,
  l.consistency,
  l.score,
  row_number() over (
    partition by l.user_id, l.mode
    order by l.score desc nulls last, l.created_at desc
  ) as rn
from public.leaderboard l
join public.profiles p on p.user_id = l.user_id
where l.is_shadowed = false and l.user_id is not null;

