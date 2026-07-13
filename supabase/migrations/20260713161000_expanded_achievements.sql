create table public.user_login_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  login_date date not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, login_date)
);

alter table public.user_login_days enable row level security;

create policy own_login_days
  on public.user_login_days
  for select
  to authenticated
  using (
    (user_id = auth.uid() and public.is_active_user())
    or public.is_sys_admin()
  );

create or replace function public.record_daily_login_v1()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'ACTIVE_USER_REQUIRED';
  end if;

  insert into public.user_login_days(user_id, login_date)
  values(auth.uid(), (now() at time zone 'UTC')::date)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count > 0;
end;
$$;

revoke all on function public.record_daily_login_v1() from public, anon;
grant execute on function public.record_daily_login_v1() to authenticated;

insert into public.achievements
  (slug, name, description, evaluator_key, insight_reward)
values
  ('twenty-five-answers', 'Finding a Rhythm', 'Answer 25 questions.', 'attempts_25', 25),
  ('fifty-answers', 'Trivia Regular', 'Answer 50 questions.', 'attempts_50', 50),
  ('one-hundred-answers', 'Century Club', 'Answer 100 questions.', 'attempts_100', 75),
  ('two-fifty-answers', 'Knowledge Builder', 'Answer 250 questions.', 'attempts_250', 100),
  ('five-hundred-answers', 'Mindspan Marathon', 'Answer 500 questions.', 'attempts_500', 150),
  ('one-thousand-answers', 'Grand Archive', 'Answer 1,000 questions.', 'attempts_1000', 250),

  ('three-login-days', 'Back for More', 'Visit Mindspan on 3 different days.', 'login_days_3', 15),
  ('seven-login-days', 'Week of Wonder', 'Visit Mindspan on 7 different days.', 'login_days_7', 25),
  ('thirty-login-days', 'Familiar Face', 'Visit Mindspan on 30 different days.', 'login_days_30', 75),
  ('one-hundred-login-days', 'Mindspan Habit', 'Visit Mindspan on 100 different days.', 'login_days_100', 150),

  ('science-nature-proficient', 'Science Sleuth', 'Reach Proficient in Science & Nature.', 'topic_proficient:science-nature', 50),
  ('history-proficient', 'History Buff', 'Reach Proficient in History.', 'topic_proficient:history', 50),
  ('geography-proficient', 'Atlas Mind', 'Reach Proficient in Geography.', 'topic_proficient:geography', 50),
  ('sports-proficient', 'Sports Savant', 'Reach Proficient in Sports.', 'topic_proficient:sports', 50),
  ('arts-literature-proficient', 'Culture Curator', 'Reach Proficient in Arts & Literature.', 'topic_proficient:arts-literature', 50),
  ('film-television-proficient', 'Screen Scholar', 'Reach Proficient in Film & Television.', 'topic_proficient:film-television', 50),
  ('music-proficient', 'Music Maven', 'Reach Proficient in Music.', 'topic_proficient:music', 50),
  ('lifestyle-culture-proficient', 'Culture Connoisseur', 'Reach Proficient in Lifestyle & Culture.', 'topic_proficient:lifestyle-culture', 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  evaluator_key = excluded.evaluator_key,
  insight_reward = excluded.insight_reward,
  enabled = true;
