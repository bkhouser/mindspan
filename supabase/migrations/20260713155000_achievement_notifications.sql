alter table public.user_achievements
  add column notified_at timestamptz;

create index user_achievements_unnotified_idx
  on public.user_achievements(user_id, earned_at desc)
  where notified_at is null;
