create table public.user_subtopic_question_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  first_attempt_at timestamptz not null default now(),
  primary key (user_id, subtopic_id, question_id)
);

create index user_subtopic_question_state_user_idx
  on public.user_subtopic_question_state(user_id, subtopic_id);

alter table public.user_subtopic_question_state enable row level security;

create policy subtopic_question_state_self_or_shared
  on public.user_subtopic_question_state for select to authenticated
  using (
    public.is_sys_admin() or (
      public.is_active_user() and
      (user_id = auth.uid() or public.shares_group(user_id))
    )
  );

grant select on public.user_subtopic_question_state to authenticated;
grant select, insert, update, delete on public.user_subtopic_question_state to service_role;

insert into public.user_subtopic_question_state(
  user_id, subtopic_id, question_id, first_attempt_at
)
select
  a.user_id,
  qs.subtopic_id,
  qv.question_id,
  min(a.created_at)
from public.attempts a
join public.question_versions qv on qv.id = a.question_version_id
join public.question_subtopics qs on qs.question_id = qv.question_id
group by a.user_id, qs.subtopic_id, qv.question_id
on conflict do nothing;

delete from public.user_subtopic_mastery;

insert into public.user_subtopic_mastery(
  user_id,
  subtopic_id,
  weighted_successes,
  weighted_evidence,
  unique_questions,
  correct_attempts,
  total_attempts,
  assisted_correct_attempts,
  lifetime_points,
  updated_at
)
select
  a.user_id,
  qs.subtopic_id,
  sum(coalesce((a.score_snapshot ->> 'masterySuccessDelta')::numeric, 0)),
  sum(coalesce((a.score_snapshot ->> 'masteryEvidenceDelta')::numeric, 0)),
  count(distinct qv.question_id)::integer,
  count(*) filter (where a.correct)::integer,
  count(*)::integer,
  count(*) filter (where a.correct and a.assisted)::integer,
  sum(a.earned_points),
  max(a.created_at)
from public.attempts a
join public.question_versions qv on qv.id = a.question_version_id
join public.question_subtopics qs on qs.question_id = qv.question_id
group by a.user_id, qs.subtopic_id;

alter table public.user_subtopic_mastery
  add constraint subtopic_success_within_evidence
    check (weighted_successes <= weighted_evidence),
  add constraint subtopic_unique_within_attempts
    check (unique_questions <= total_attempts);

create or replace function public.update_subtopic_mastery_from_attempt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_question uuid;
  success_delta numeric;
  evidence_delta numeric;
begin
  select question_id into target_question
  from public.question_versions where id = new.question_version_id;

  success_delta := coalesce(
    (new.score_snapshot ->> 'masterySuccessDelta')::numeric,
    0
  );
  evidence_delta := coalesce(
    (new.score_snapshot ->> 'masteryEvidenceDelta')::numeric,
    0
  );

  with linked_subtopics as (
    select qs.subtopic_id
    from public.question_subtopics qs
    where qs.question_id = target_question
  ),
  newly_seen as (
    insert into public.user_subtopic_question_state(
      user_id, subtopic_id, question_id, first_attempt_at
    )
    select new.user_id, linked.subtopic_id, target_question, new.created_at
    from linked_subtopics linked
    on conflict do nothing
    returning subtopic_id
  )
  insert into public.user_subtopic_mastery(
    user_id,
    subtopic_id,
    weighted_successes,
    weighted_evidence,
    unique_questions,
    correct_attempts,
    total_attempts,
    assisted_correct_attempts,
    lifetime_points,
    updated_at
  )
  select
    new.user_id,
    linked.subtopic_id,
    success_delta,
    evidence_delta,
    case when newly.subtopic_id is null then 0 else 1 end,
    case when new.correct then 1 else 0 end,
    1,
    case when new.correct and new.assisted then 1 else 0 end,
    new.earned_points,
    now()
  from linked_subtopics linked
  left join newly_seen newly on newly.subtopic_id = linked.subtopic_id
  on conflict(user_id, subtopic_id) do update set
    weighted_successes =
      public.user_subtopic_mastery.weighted_successes +
      excluded.weighted_successes,
    weighted_evidence =
      public.user_subtopic_mastery.weighted_evidence +
      excluded.weighted_evidence,
    unique_questions =
      public.user_subtopic_mastery.unique_questions +
      excluded.unique_questions,
    correct_attempts =
      public.user_subtopic_mastery.correct_attempts +
      excluded.correct_attempts,
    total_attempts =
      public.user_subtopic_mastery.total_attempts +
      excluded.total_attempts,
    assisted_correct_attempts =
      public.user_subtopic_mastery.assisted_correct_attempts +
      excluded.assisted_correct_attempts,
    lifetime_points =
      public.user_subtopic_mastery.lifetime_points +
      excluded.lifetime_points,
    updated_at = now();

  return new;
end;
$$;
