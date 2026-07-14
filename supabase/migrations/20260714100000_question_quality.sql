create table public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  sentiment text not null check (sentiment in ('up', 'down')),
  reasons text[] not null default '{}',
  comment text,
  answer_correct boolean not null,
  assisted boolean not null,
  timed_out boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_version_id),
  check (cardinality(reasons) <= 8),
  check (comment is null or char_length(comment) between 1 and 1000),
  check (
    reasons <@ array[
      'incorrect_answer',
      'unclear',
      'difficulty',
      'weak_explanation',
      'poor_choices',
      'typo',
      'outdated',
      'media',
      'other'
    ]::text[]
  )
);

create index question_feedback_version_idx
  on public.question_feedback(question_version_id, sentiment, updated_at desc);
create index question_feedback_admin_queue_idx
  on public.question_feedback(sentiment, updated_at desc);

create table public.question_editorial_reviews (
  question_version_id uuid primary key references public.question_versions(id) on delete cascade,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  verdict text not null check (verdict in ('approved', 'needs_revision', 'rejected')),
  notes text,
  player_feedback_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (notes is null or char_length(notes) between 1 and 4000)
);

create index question_editorial_reviews_verdict_idx
  on public.question_editorial_reviews(verdict, updated_at desc);

alter table public.question_feedback enable row level security;
alter table public.question_editorial_reviews enable row level security;

create policy own_question_feedback_read
  on public.question_feedback for select
  using ((user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());

create policy own_question_feedback_insert
  on public.question_feedback for insert
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1
      from public.attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.question_version_id = question_feedback.question_version_id
    )
  );

create policy own_question_feedback_update
  on public.question_feedback for update
  using (user_id = auth.uid() and public.is_active_user())
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1
      from public.attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.question_version_id = question_feedback.question_version_id
    )
  );

create policy admin_question_feedback
  on public.question_feedback for all
  using (public.is_sys_admin())
  with check (public.is_sys_admin());

create policy admin_question_editorial_reviews
  on public.question_editorial_reviews for all
  using (public.is_sys_admin())
  with check (public.is_sys_admin());

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
  if not public.is_sys_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  with published as (
    select qv.id as version_id, qv.question_id
    from public.question_versions qv
    where qv.status = 'published'
  ), feedback as (
    select qf.question_version_id,
      count(*) filter (where qf.sentiment = 'down') as down_votes,
      max(qf.updated_at) filter (where qf.sentiment = 'down') as latest_down_vote
    from public.question_feedback qf
    group by qf.question_version_id
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
      where f.latest_down_vote is not null
        and (
          er.player_feedback_reviewed_at is null
          or f.latest_down_vote > er.player_feedback_reviewed_at
        )
    )
  from public.packs p
  left join public.pack_questions pq on pq.pack_id = p.id
  left join published pub on pub.question_id = pq.question_id
  left join public.question_editorial_reviews er on er.question_version_id = pub.version_id
  left join feedback f on f.question_version_id = pub.version_id
  group by p.id, p.slug, p.name
  order by p.is_starter desc, p.name;
end;
$$;

revoke all on function public.question_quality_pack_summary_v1() from public;
grant execute on function public.question_quality_pack_summary_v1() to authenticated, service_role;

grant select on public.question_feedback to authenticated;
grant select on public.question_editorial_reviews to authenticated;
grant select, insert, update, delete on public.question_feedback to service_role;
grant select, insert, update, delete on public.question_editorial_reviews to service_role;
