alter table public.question_presentations
  add column activated_at timestamptz;

update public.question_presentations
set activated_at = started_at;

comment on column public.question_presentations.activated_at is
  'When the player was shown the question and its server-authoritative timer began. Null while a next question is prepared in the background.';
