create or replace function public.question_quality_answer_summary_v1(
  p_question_version_id uuid
)
returns table(
  answer_text text,
  attempt_count bigint,
  correct_count bigint,
  assisted_count bigint,
  acceptance_flag_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_review_questions() then
    raise exception 'QUESTION_REVIEWER_REQUIRED';
  end if;

  return query
  with submitted as (
    select
      a.id,
      btrim(a.submitted_answer) as display_answer,
      lower(btrim(a.submitted_answer)) as answer_key,
      a.correct,
      a.assisted
    from public.attempts a
    where a.question_version_id = p_question_version_id
      and a.submitted_answer is not null
      and btrim(a.submitted_answer) <> ''
  )
  select
    mode() within group (order by s.display_answer),
    count(*),
    count(*) filter (where s.correct),
    count(*) filter (where s.assisted),
    count(qf.id) filter (
      where qf.reasons @> array['should_have_been_accepted']::text[]
    )
  from submitted s
  left join public.question_feedback qf on qf.attempt_id = s.id
  group by s.answer_key
  order by
    count(qf.id) filter (
      where qf.reasons @> array['should_have_been_accepted']::text[]
    ) desc,
    count(*) desc,
    mode() within group (order by s.display_answer);
end;
$$;

revoke all on function public.question_quality_answer_summary_v1(uuid)
  from public;
grant execute on function public.question_quality_answer_summary_v1(uuid)
  to authenticated, service_role;
