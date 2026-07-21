alter table public.question_versions
  add column editorial_key text,
  add column editorial_content_hash text;

comment on column public.question_versions.editorial_key is
  'Stable source identity used to carry editorial approval between environments.';
comment on column public.question_versions.editorial_content_hash is
  'Content fingerprint; a changed question version must receive a different value.';

create index question_versions_editorial_identity_idx
  on public.question_versions(editorial_key, editorial_content_hash)
  where status = 'published';

alter table public.question_editorial_reviews
  alter column reviewed_by drop not null,
  add column review_origin text not null default 'in_app'
    check (review_origin in ('in_app', 'catalog'));

comment on column public.question_editorial_reviews.review_origin is
  'in_app for a reviewer decision in this environment; catalog for a portable approval ledger entry.';

update public.question_versions qv
set editorial_key = q.catalog_key,
    editorial_content_hash = q.catalog_hash
from public.questions q
where q.id = qv.question_id
  and qv.status = 'published'
  and q.catalog_key is not null
  and q.catalog_hash is not null;

update public.question_versions qv
set editorial_key = 'seed.' || t.slug || '.' || md5(
      lower(regexp_replace(qv.prompt, '[^[:alnum:]]+', '', 'g'))
    ),
    editorial_content_hash = md5(
      jsonb_build_object(
        'topic', t.slug,
        'prompt', qv.prompt,
        'canonicalAnswer', qv.canonical_answer,
        'answerMode', qv.answer_mode,
        'aliases', coalesce((
          select jsonb_agg(aa.answer order by aa.normalized_answer, aa.answer)
          from public.answer_aliases aa
          where aa.question_version_id = qv.id
        ), '[]'::jsonb),
        'distractors', coalesce((
          select jsonb_agg(d.answer order by d.sort_order, d.answer)
          from public.distractors d
          where d.question_version_id = qv.id
        ), '[]'::jsonb),
        'explanation', qv.explanation,
        'details', qv.details,
        'difficulty', qv.difficulty,
        'timeLimitSeconds', qv.time_limit_seconds,
        'removeLeadingArticles', qv.remove_leading_articles,
        'expiresAt', qv.expires_at,
        'packs', coalesce((
          select jsonb_agg(p.slug order by p.slug)
          from public.pack_questions pq
          join public.packs p on p.id = pq.pack_id
          where pq.question_id = qv.question_id
        ), '[]'::jsonb),
        'subtopics', coalesce((
          select jsonb_agg(s.slug order by s.slug)
          from public.question_subtopics qs
          join public.subtopics s on s.id = qs.subtopic_id
          where qs.question_id = qv.question_id
        ), '[]'::jsonb),
        'citations', coalesce((
          select jsonb_agg(
            jsonb_build_object('label', qc.label, 'url', qc.url)
            order by qc.sort_order, qc.label, qc.url
          )
          from public.question_citations qc
          where qc.question_version_id = qv.id
        ), '[]'::jsonb)
      )::text
    )
from public.topics t
where t.id = qv.topic_id
  and qv.status = 'published'
  and qv.editorial_key is null;

create or replace function public.sync_published_catalog_v3(payload jsonb)
returns table(
  result_key text,
  result_action text,
  result_question_id uuid,
  result_version_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  synced record;
  current_hash text;
begin
  for synced in select * from public.sync_published_catalog_v2(payload) loop
    if synced.result_version_id is not null then
      select q.catalog_hash
      into current_hash
      from public.questions q
      where q.id = synced.result_question_id;

      update public.question_versions
      set editorial_key = synced.result_key,
          editorial_content_hash = current_hash
      where id = synced.result_version_id;
    end if;

    return query select
      synced.result_key,
      synced.result_action,
      synced.result_question_id,
      synced.result_version_id;
  end loop;
end;
$$;

revoke all on function public.sync_published_catalog_v3(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v3(jsonb)
  to service_role;

create or replace function public.apply_catalog_editorial_approvals_v1(
  payload jsonb
)
returns table(result_key text, result_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  item_key text;
  item_hash text;
  target_version uuid;
  affected integer;
begin
  if jsonb_typeof(payload) <> 'array' then
    raise exception 'INVALID_APPROVAL_LEDGER';
  end if;

  for item in select value from jsonb_array_elements(payload) loop
    item_key := nullif(trim(item ->> 'editorialKey'), '');
    item_hash := nullif(trim(item ->> 'contentHash'), '');
    if item_key is null or item_hash is null then
      raise exception 'INVALID_APPROVAL_ENTRY';
    end if;

    select qv.id
    into target_version
    from public.question_versions qv
    where qv.status = 'published'
      and qv.editorial_key = item_key
      and qv.editorial_content_hash = item_hash
    limit 1;

    if target_version is null then
      return query select item_key, false;
      continue;
    end if;

    insert into public.question_editorial_reviews(
      question_version_id,
      reviewed_by,
      verdict,
      review_origin,
      created_at,
      updated_at
    ) values (
      target_version,
      null,
      'approved',
      'catalog',
      now(),
      now()
    )
    on conflict (question_version_id) do nothing;
    get diagnostics affected = row_count;

    return query select item_key, affected = 1;
  end loop;
end;
$$;

revoke all on function public.apply_catalog_editorial_approvals_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_catalog_editorial_approvals_v1(jsonb)
  to service_role;

create or replace function public.save_question_editorial_review_v1(
  p_question_version_id uuid,
  p_verdict text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_notes text := nullif(btrim(p_notes), '');
  previous_review jsonb;
  saved_review jsonb;
begin
  if not public.can_review_questions(actor_id) then
    raise exception 'QUESTION_REVIEWER_REQUIRED';
  end if;

  if p_verdict not in ('approved', 'needs_revision', 'rejected') then
    raise exception 'INVALID_EDITORIAL_VERDICT';
  end if;

  if normalized_notes is not null and char_length(normalized_notes) > 4000 then
    raise exception 'EDITORIAL_NOTES_TOO_LONG';
  end if;

  if not exists (
    select 1
    from public.question_versions qv
    where qv.id = p_question_version_id
      and qv.status = 'published'
  ) then
    raise exception 'PUBLISHED_QUESTION_VERSION_REQUIRED';
  end if;

  select to_jsonb(er)
  into previous_review
  from public.question_editorial_reviews er
  where er.question_version_id = p_question_version_id;

  insert into public.question_editorial_reviews(
    question_version_id,
    reviewed_by,
    verdict,
    notes,
    player_feedback_reviewed_at,
    review_origin,
    updated_at
  )
  values (
    p_question_version_id,
    actor_id,
    p_verdict,
    normalized_notes,
    now(),
    'in_app',
    now()
  )
  on conflict (question_version_id) do update
  set reviewed_by = excluded.reviewed_by,
      verdict = excluded.verdict,
      notes = excluded.notes,
      player_feedback_reviewed_at = excluded.player_feedback_reviewed_at,
      review_origin = excluded.review_origin,
      updated_at = excluded.updated_at;

  select to_jsonb(er)
  into saved_review
  from public.question_editorial_reviews er
  where er.question_version_id = p_question_version_id;

  insert into public.admin_audit_log(
    actor_user_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  )
  values (
    actor_id,
    'question.editorial_' || p_verdict,
    'question_versions',
    p_question_version_id::text,
    previous_review,
    saved_review
  );
end;
$$;

revoke all on function public.save_question_editorial_review_v1(uuid, text, text)
  from public;
grant execute on function public.save_question_editorial_review_v1(uuid, text, text)
  to authenticated, service_role;
