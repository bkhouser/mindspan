create or replace function public.can_review_questions(
  check_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user
      and p.role in ('question_reviewer', 'sys_admin')
      and p.beta_access_granted_at is not null
      and p.disabled_at is null
  );
$$;

revoke all on function public.can_review_questions(uuid) from public;
grant execute on function public.can_review_questions(uuid)
  to authenticated, service_role;

create or replace function public.question_quality_pack_summary_v1()
returns table(
  pack_id uuid,
  pack_slug text,
  pack_name text,
  total_questions bigint,
  approved_questions bigint,
  needs_revision_questions bigint,
  rejected_questions bigint,
  unreviewed_questions bigint,
  flagged_questions bigint
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
  with published as (
    select qv.id as version_id, qv.question_id
    from public.question_versions qv
    where qv.status = 'published'
  ), feedback as (
    select qf.question_version_id,
      max(qf.updated_at) filter (where qf.sentiment = 'down') as latest_down_vote
    from public.question_feedback qf
    group by qf.question_version_id
  ), reports as (
    select qr.question_version_id,
      count(*) filter (where qr.status = 'open') as open_reports
    from public.question_reports qr
    group by qr.question_version_id
  )
  select
    p.id,
    p.slug,
    p.name,
    count(pub.version_id),
    count(*) filter (where pub.version_id is not null and er.verdict = 'approved'),
    count(*) filter (where pub.version_id is not null and er.verdict = 'needs_revision'),
    count(*) filter (where pub.version_id is not null and er.verdict = 'rejected'),
    count(*) filter (where pub.version_id is not null and er.question_version_id is null),
    count(*) filter (
      where pub.version_id is not null
        and (
          (
            f.latest_down_vote is not null
            and (
              er.player_feedback_reviewed_at is null
              or f.latest_down_vote > er.player_feedback_reviewed_at
            )
          )
          or coalesce(r.open_reports, 0) > 0
        )
    )
  from public.packs p
  left join public.pack_questions pq on pq.pack_id = p.id
  left join published pub on pub.question_id = pq.question_id
  left join public.question_editorial_reviews er on er.question_version_id = pub.version_id
  left join feedback f on f.question_version_id = pub.version_id
  left join reports r on r.question_version_id = pub.version_id
  group by p.id, p.slug, p.name
  order by p.is_starter desc, p.name;
end;
$$;

revoke all on function public.question_quality_pack_summary_v1() from public;
grant execute on function public.question_quality_pack_summary_v1()
  to authenticated, service_role;
