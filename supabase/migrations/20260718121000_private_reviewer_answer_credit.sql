revoke all on function public.award_reviewed_answer_credit_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.award_reviewed_answer_credit_v1(uuid)
  to service_role;

create or replace function public.award_reviewed_answer_credit_for_reviewer_v1(
  p_question_feedback_id uuid
)
returns table(
  result_corrected boolean,
  result_points_awarded integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_review_questions(auth.uid()) then
    raise exception 'QUESTION_REVIEWER_REQUIRED';
  end if;

  return query
  select credit.result_corrected, credit.result_points_awarded
  from public.award_reviewed_answer_credit_v1(p_question_feedback_id) credit;
end;
$$;

revoke all on function public.award_reviewed_answer_credit_for_reviewer_v1(uuid)
  from public, anon;
grant execute on function public.award_reviewed_answer_credit_for_reviewer_v1(uuid)
  to authenticated, service_role;
