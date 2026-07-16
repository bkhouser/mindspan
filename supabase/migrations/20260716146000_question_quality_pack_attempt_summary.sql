create or replace function public.question_quality_pack_attempt_summary_v1(
  p_pack_id uuid
)
returns table(
  question_version_id uuid,
  attempt_count bigint,
  correct_count bigint
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
  select
    qv.id,
    count(a.id),
    count(a.id) filter (where a.correct)
  from public.pack_questions pq
  join public.question_versions qv
    on qv.question_id = pq.question_id
    and qv.status = 'published'
  left join public.attempts a on a.question_version_id = qv.id
  where pq.pack_id = p_pack_id
  group by qv.id;
end;
$$;

revoke all on function public.question_quality_pack_attempt_summary_v1(uuid)
  from public;
grant execute on function public.question_quality_pack_attempt_summary_v1(uuid)
  to authenticated, service_role;
