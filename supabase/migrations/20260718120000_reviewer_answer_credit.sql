create table public.attempt_credit_corrections (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  question_feedback_id uuid not null unique references public.question_feedback(id) on delete cascade,
  awarded_to uuid not null references public.profiles(id) on delete cascade,
  awarded_by uuid references public.profiles(id) on delete set null,
  points_awarded integer not null check (points_awarded >= 0),
  mastery_success_delta numeric(14, 6) not null check (mastery_success_delta >= 0),
  original_attempt jsonb not null,
  corrected_attempt jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.attempt_credit_corrections enable row level security;

create policy own_attempt_credit_corrections_read
  on public.attempt_credit_corrections for select to authenticated
  using (awarded_to = auth.uid() and public.is_active_user());

grant select on public.attempt_credit_corrections to authenticated;
grant select, insert on public.attempt_credit_corrections to service_role;

create or replace function public.award_reviewed_answer_credit_v1(
  p_question_feedback_id uuid
)
returns table(
  result_corrected boolean,
  result_user_id uuid,
  result_points_awarded integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  feedback_row public.question_feedback%rowtype;
  attempt_row public.attempts%rowtype;
  correction_row public.attempt_credit_corrections%rowtype;
  topic_row public.user_topic_mastery%rowtype;
  question_state public.user_question_state%rowtype;
  target_question_id uuid;
  target_topic_id uuid;
  original_attempt jsonb;
  corrected_attempt jsonb;
  corrected_points integer;
  evidence_delta numeric;
  success_delta numeric;
  speed_quality numeric;
  new_weighted_successes numeric;
  rank_score numeric;
  previous_tier text;
  corrected_tier text;
  review_days integer;
  has_later_attempt boolean;
  previous_review jsonb;
  saved_review jsonb;
  correction_note text;
begin
  if not public.can_review_questions(actor_id) then
    raise exception 'QUESTION_REVIEWER_REQUIRED';
  end if;

  select * into feedback_row
  from public.question_feedback qf
  where qf.id = p_question_feedback_id
  for update;

  if not found then
    raise exception 'QUESTION_FEEDBACK_NOT_FOUND';
  end if;
  if not feedback_row.reasons @> array['should_have_been_accepted']::text[] then
    raise exception 'ANSWER_ACCEPTANCE_FEEDBACK_REQUIRED';
  end if;

  select * into correction_row
  from public.attempt_credit_corrections acc
  where acc.attempt_id = feedback_row.attempt_id;
  if found then
    return query select false, correction_row.awarded_to, correction_row.points_awarded;
    return;
  end if;

  select * into attempt_row
  from public.attempts a
  where a.id = feedback_row.attempt_id
  for update;

  if not found
    or attempt_row.user_id <> feedback_row.user_id
    or attempt_row.question_version_id <> feedback_row.question_version_id then
    raise exception 'FEEDBACK_ATTEMPT_MISMATCH';
  end if;
  if attempt_row.correct then
    raise exception 'ATTEMPT_ALREADY_CORRECT';
  end if;
  if attempt_row.timed_out
    or attempt_row.submitted_answer is null
    or btrim(attempt_row.submitted_answer) = '' then
    raise exception 'SUBMITTED_NON_TIMEOUT_ANSWER_REQUIRED';
  end if;
  if coalesce(attempt_row.score_snapshot ->> 'algorithmVersion', '') = 'assessment-v1' then
    raise exception 'ASSESSMENT_CREDIT_NOT_SUPPORTED';
  end if;

  select qv.question_id, qv.topic_id
  into target_question_id, target_topic_id
  from public.question_versions qv
  where qv.id = attempt_row.question_version_id;
  if target_question_id is null or target_topic_id is null then
    raise exception 'QUESTION_VERSION_NOT_FOUND';
  end if;

  corrected_points := round(
    coalesce((attempt_row.score_snapshot ->> 'startingPoints')::numeric, 0) *
    coalesce((attempt_row.score_snapshot ->> 'timeFactor')::numeric, 0)
  )::integer;
  evidence_delta := coalesce(
    (attempt_row.score_snapshot ->> 'masteryEvidenceDelta')::numeric,
    0
  );
  speed_quality := 0.9 + 0.1 * greatest(
    0,
    least(1, attempt_row.remaining_ratio)
  );
  success_delta := evidence_delta *
    case when attempt_row.assisted then 0.6 else 1 end *
    speed_quality;

  if corrected_points < 0 or evidence_delta < 0 or success_delta < 0 then
    raise exception 'INVALID_ATTEMPT_SCORE_SNAPSHOT';
  end if;

  select * into topic_row
  from public.user_topic_mastery utm
  where utm.user_id = attempt_row.user_id
    and utm.topic_id = target_topic_id
  for update;
  if not found then
    raise exception 'TOPIC_MASTERY_NOT_FOUND';
  end if;
  previous_tier := topic_row.tier;
  new_weighted_successes := topic_row.weighted_successes + success_delta;
  if topic_row.unique_questions < 5 then
    corrected_tier := 'unrated';
  else
    rank_score := (
      new_weighted_successes / topic_row.weighted_evidence +
      power(1.281551565545, 2) / (2 * topic_row.weighted_evidence) -
      1.281551565545 * sqrt(
        (
          (new_weighted_successes / topic_row.weighted_evidence) *
          (1 - new_weighted_successes / topic_row.weighted_evidence) +
          power(1.281551565545, 2) / (4 * topic_row.weighted_evidence)
        ) / topic_row.weighted_evidence
      )
    ) / (1 + power(1.281551565545, 2) / topic_row.weighted_evidence);
    corrected_tier := case
      when rank_score >= 0.85 and topic_row.unique_questions >= 30 then 'master'
      when rank_score >= 0.7 then 'expert'
      when rank_score >= 0.5 then 'proficient'
      else 'developing'
    end;
  end if;

  select * into question_state
  from public.user_question_state uqs
  where uqs.user_id = attempt_row.user_id
    and uqs.question_id = target_question_id
  for update;
  if not found then
    raise exception 'QUESTION_STATE_NOT_FOUND';
  end if;

  select exists (
    select 1
    from public.attempts later
    join public.question_versions later_version
      on later_version.id = later.question_version_id
    where later.user_id = attempt_row.user_id
      and later_version.question_id = target_question_id
      and (later.created_at, later.id) > (attempt_row.created_at, attempt_row.id)
  ) into has_later_attempt;
  review_days := case least(question_state.correct_count, 3)
    when 0 then 7
    when 1 then 30
    when 2 then 90
    else 180
  end;

  original_attempt := to_jsonb(attempt_row);
  corrected_attempt := original_attempt || jsonb_build_object(
    'correct', true,
    'earned_points', corrected_points,
    'score_snapshot', attempt_row.score_snapshot || jsonb_build_object(
      'correct', true,
      'earnedPoints', corrected_points,
      'masterySuccessDelta', success_delta,
      'reviewCorrection', jsonb_build_object(
        'feedbackId', feedback_row.id,
        'reviewedBy', actor_id,
        'correctedAt', now()
      )
    )
  );

  update public.attempts
  set correct = true,
      earned_points = corrected_points,
      score_snapshot = attempt_row.score_snapshot || jsonb_build_object(
        'correct', true,
        'earnedPoints', corrected_points,
        'masterySuccessDelta', success_delta,
        'reviewCorrection', jsonb_build_object(
          'feedbackId', feedback_row.id,
          'reviewedBy', actor_id,
          'correctedAt', now()
        )
      )
  where id = attempt_row.id;

  update public.user_topic_mastery
  set weighted_successes = new_weighted_successes,
      correct_attempts = correct_attempts + 1,
      assisted_correct_attempts = assisted_correct_attempts +
        case when attempt_row.assisted then 1 else 0 end,
      lifetime_points = lifetime_points + corrected_points,
      tier = corrected_tier,
      updated_at = now()
  where user_id = attempt_row.user_id
    and topic_id = target_topic_id;

  update public.user_subtopic_mastery usm
  set weighted_successes = usm.weighted_successes + success_delta,
      correct_attempts = usm.correct_attempts + 1,
      assisted_correct_attempts = usm.assisted_correct_attempts +
        case when attempt_row.assisted then 1 else 0 end,
      lifetime_points = usm.lifetime_points + corrected_points,
      updated_at = now()
  from public.question_subtopics qs
  where qs.question_id = target_question_id
    and usm.user_id = attempt_row.user_id
    and usm.subtopic_id = qs.subtopic_id;

  update public.user_question_state
  set correct_count = correct_count + 1,
      last_correct = case when has_later_attempt then last_correct else true end,
      next_review_at = case
        when has_later_attempt then next_review_at
        else now() + pg_catalog.make_interval(days => review_days)
      end
  where user_id = attempt_row.user_id
    and question_id = target_question_id;

  insert into public.attempt_credit_corrections(
    attempt_id,
    question_feedback_id,
    awarded_to,
    awarded_by,
    points_awarded,
    mastery_success_delta,
    original_attempt,
    corrected_attempt
  ) values (
    attempt_row.id,
    feedback_row.id,
    attempt_row.user_id,
    actor_id,
    corrected_points,
    success_delta,
    original_attempt,
    corrected_attempt
  );

  select to_jsonb(er) into previous_review
  from public.question_editorial_reviews er
  where er.question_version_id = attempt_row.question_version_id;
  correction_note := format(
    'Awarded credit for player answer "%s"; add it as an accepted answer or document why the matcher should accept it.',
    attempt_row.submitted_answer
  );
  insert into public.question_editorial_reviews(
    question_version_id,
    reviewed_by,
    verdict,
    notes,
    player_feedback_reviewed_at,
    updated_at
  ) values (
    attempt_row.question_version_id,
    actor_id,
    'needs_revision',
    correction_note,
    now(),
    now()
  )
  on conflict (question_version_id) do update
  set reviewed_by = excluded.reviewed_by,
      verdict = 'needs_revision',
      notes = left(
        concat_ws(E'\n\n', public.question_editorial_reviews.notes, correction_note),
        4000
      ),
      player_feedback_reviewed_at = excluded.player_feedback_reviewed_at,
      updated_at = excluded.updated_at;

  select to_jsonb(er) into saved_review
  from public.question_editorial_reviews er
  where er.question_version_id = attempt_row.question_version_id;

  insert into public.admin_audit_log(
    actor_user_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  ) values (
    actor_id,
    'question.answer_credit_awarded',
    'attempts',
    attempt_row.id::text,
    jsonb_build_object(
      'attempt', original_attempt,
      'editorial_review', previous_review
    ),
    jsonb_build_object(
      'attempt', corrected_attempt,
      'editorial_review', saved_review,
      'question_feedback_id', feedback_row.id,
      'points_awarded', corrected_points,
      'mastery_success_delta', success_delta
    )
  );

  if (case previous_tier
      when 'unrated' then 0 when 'developing' then 1 when 'proficient' then 2
      when 'expert' then 3 else 4 end)
    < (case corrected_tier
      when 'unrated' then 0 when 'developing' then 1 when 'proficient' then 2
      when 'expert' then 3 else 4 end) then
    insert into public.activity_events(group_id, actor_user_id, kind, payload)
      select gm.group_id, attempt_row.user_id, 'mastery_tier_up',
        jsonb_build_object('topic_id', target_topic_id, 'tier', corrected_tier)
      from public.group_memberships gm
      where gm.user_id = attempt_row.user_id;
  end if;

  return query select true, attempt_row.user_id, corrected_points;
end;
$$;

revoke all on function public.award_reviewed_answer_credit_v1(uuid)
  from public, anon;
grant execute on function public.award_reviewed_answer_credit_v1(uuid)
  to authenticated, service_role;
