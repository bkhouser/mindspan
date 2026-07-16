-- Preserve the immutable production history for the seeded Roger Deakins
-- question while publishing the reviewer-approved four-star version. Fresh
-- databases receive the same value directly from seed.sql, so this migration
-- intentionally does nothing when the seed question is not present yet.
do $$
declare
  previous_version public.question_versions%rowtype;
  replacement_version_id uuid;
  replacement_version_number integer;
begin
  select qv.*
  into previous_version
  from public.question_versions qv
  join public.questions q on q.id = qv.question_id
  where q.catalog_key is null
    and qv.status = 'published'
    and qv.prompt = 'Which cinematographer shot Blade Runner 2049 and 1917?'
  order by qv.version_number desc
  limit 1;

  if not found then
    return;
  end if;

  if previous_version.difficulty = 4 then
    return;
  end if;

  if previous_version.difficulty <> 5 then
    raise exception 'UNEXPECTED_ROGER_DEAKINS_DIFFICULTY:%', previous_version.difficulty;
  end if;

  select max(version_number) + 1
  into replacement_version_number
  from public.question_versions
  where question_id = previous_version.question_id;

  update public.question_versions
  set status = 'retired'
  where id = previous_version.id;

  insert into public.question_versions(
    question_id,
    topic_id,
    version_number,
    status,
    prompt,
    canonical_answer,
    explanation,
    details,
    difficulty,
    time_limit_seconds,
    remove_leading_articles,
    verified_at,
    expires_at,
    created_by,
    published_at,
    answer_mode
  ) values (
    previous_version.question_id,
    previous_version.topic_id,
    replacement_version_number,
    'published',
    previous_version.prompt,
    previous_version.canonical_answer,
    previous_version.explanation,
    previous_version.details,
    4,
    previous_version.time_limit_seconds,
    previous_version.remove_leading_articles,
    now(),
    previous_version.expires_at,
    previous_version.created_by,
    now(),
    previous_version.answer_mode
  )
  returning id into replacement_version_id;

  insert into public.answer_aliases(question_version_id, answer, normalized_answer)
  select replacement_version_id, answer, normalized_answer
  from public.answer_aliases
  where question_version_id = previous_version.id;

  insert into public.distractors(question_version_id, answer, sort_order)
  select replacement_version_id, answer, sort_order
  from public.distractors
  where question_version_id = previous_version.id;

  insert into public.question_citations(question_version_id, label, url, sort_order)
  select replacement_version_id, label, url, sort_order
  from public.question_citations
  where question_version_id = previous_version.id;

  insert into public.question_media(question_version_id, media_asset_id)
  select replacement_version_id, media_asset_id
  from public.question_media
  where question_version_id = previous_version.id;
end;
$$;
