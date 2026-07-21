-- Strengthen the hand-seeded photosynthesis question while preserving its
-- identity and all historical attempts on the version originally presented.
do $$
declare
  previous_version public.question_versions%rowtype;
  replacement_version_id uuid;
  replacement_version_number integer;
  new_explanation constant text := 'Photosynthesis captures light energy and stores it in energy-rich organic molecules.';
  new_details constant text := 'In plants, chlorophyll in chloroplasts absorbs light. The light-dependent reactions produce chemical energy and release oxygen from water; the Calvin cycle uses that energy to incorporate carbon dioxide into sugars.';
begin
  select qv.*
  into previous_version
  from public.question_versions qv
  join public.questions q on q.id = qv.question_id
  where q.catalog_key is null
    and qv.status = 'published'
    and qv.prompt = 'What process lets plants convert light energy into chemical energy?'
  order by qv.version_number desc
  limit 1;

  if not found then
    return;
  end if;

  if previous_version.explanation = new_explanation
    and previous_version.details = new_details then
    return;
  end if;

  select max(version_number) + 1
  into replacement_version_number
  from public.question_versions
  where question_id = previous_version.question_id;

  update public.question_versions
  set status = 'retired'
  where id = previous_version.id;

  insert into public.question_versions(
    question_id, topic_id, version_number, status, prompt,
    canonical_answer, explanation, details, difficulty,
    time_limit_seconds, remove_leading_articles, verified_at, expires_at,
    created_by, published_at, answer_mode, editorial_key
  ) values (
    previous_version.question_id,
    previous_version.topic_id,
    replacement_version_number,
    'published',
    previous_version.prompt,
    previous_version.canonical_answer,
    new_explanation,
    new_details,
    previous_version.difficulty,
    previous_version.time_limit_seconds,
    previous_version.remove_leading_articles,
    now(),
    previous_version.expires_at,
    previous_version.created_by,
    now(),
    previous_version.answer_mode,
    previous_version.editorial_key
  ) returning id into replacement_version_id;

  insert into public.answer_aliases(question_version_id, answer, normalized_answer)
  select replacement_version_id, answer, normalized_answer
  from public.answer_aliases
  where question_version_id = previous_version.id;

  insert into public.distractors(question_version_id, answer, sort_order)
  select replacement_version_id, answer, sort_order
  from public.distractors
  where question_version_id = previous_version.id;

  insert into public.question_media(question_version_id, media_asset_id)
  select replacement_version_id, media_asset_id
  from public.question_media
  where question_version_id = previous_version.id;

  insert into public.question_citations(question_version_id, label, url, sort_order)
  values (
    replacement_version_id,
    'OpenStax Biology 2e',
    'https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis',
    0
  );
end;
$$;

update public.question_versions qv
set editorial_content_hash = md5(
  jsonb_build_object(
    'topic', t.slug,
    'prompt', qv.prompt,
    'canonicalAnswer', qv.canonical_answer,
    'answerMode', qv.answer_mode,
    'aliases', coalesce((
      select jsonb_agg(aa.answer order by aa.normalized_answer, aa.answer)
      from public.answer_aliases aa where aa.question_version_id = qv.id
    ), '[]'::jsonb),
    'distractors', coalesce((
      select jsonb_agg(d.answer order by d.sort_order, d.answer)
      from public.distractors d where d.question_version_id = qv.id
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
from public.questions q, public.topics t
where q.id = qv.question_id
  and t.id = qv.topic_id
  and q.catalog_key is null
  and qv.status = 'published'
  and qv.prompt = 'What process lets plants convert light energy into chemical energy?';
