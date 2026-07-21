-- Publish immutable revisions for two seeded Arts & Literature questions and
-- add reviewer-only detail tags requested during the production QA pass.
do $$
declare
  item record;
  previous_version public.question_versions%rowtype;
  replacement_version_id uuid;
  replacement_version_number integer;
begin
  for item in
    select * from (values
      (
        'Who wrote the epic poem Paradise Lost?'::text,
        'Who wrote the epic poem Paradise Lost?'::text,
        'John Milton wrote Paradise Lost.'::text,
        'The poem was first published in 1667 and is largely composed in blank verse.'::text,
        3
      ),
      (
        'What architectural support transfers a roof’s lateral thrust to an exterior pier?'::text,
        'Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?'::text,
        'A flying buttress carries lateral force outward through an exterior arch to a separate support.'::text,
        'The technique enabled Gothic churches to use taller walls, larger windows, and extensive stained glass without sacrificing structural stability.'::text,
        5
      )
    ) values_to_publish(old_prompt, new_prompt, new_explanation, new_details, new_difficulty)
  loop
    select qv.*
    into previous_version
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where q.catalog_key is null
      and qv.status = 'published'
      and qv.prompt = item.old_prompt
    order by qv.version_number desc
    limit 1;

    if not found then
      continue;
    end if;

    if previous_version.prompt = item.new_prompt
      and previous_version.difficulty = item.new_difficulty
      and previous_version.explanation = item.new_explanation
      and previous_version.details = item.new_details then
      continue;
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
      item.new_prompt,
      previous_version.canonical_answer,
      item.new_explanation,
      item.new_details,
      item.new_difficulty,
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

    insert into public.question_citations(question_version_id, label, url, sort_order)
    select replacement_version_id, label, url, sort_order
    from public.question_citations
    where question_version_id = previous_version.id;

    insert into public.question_media(question_version_id, media_asset_id)
    select replacement_version_id, media_asset_id
    from public.question_media
    where question_version_id = previous_version.id;
  end loop;
end;
$$;

with requested(prompt, tag_name) as (values
  ('Which artist painted The Persistence of Memory?', 'Artists'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Gothic Architecture'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Structural Engineering')
), resolved as (
  select distinct
    qv.question_id,
    qv.topic_id,
    requested.tag_name,
    trim(both '-' from regexp_replace(lower(requested.tag_name), '[^a-z0-9]+', '-', 'g')) as tag_slug
  from requested
  join public.question_versions qv
    on qv.prompt = requested.prompt and qv.status = 'published'
), inserted_tags as (
  insert into public.detail_tags(topic_id, slug, name)
  select distinct topic_id, tag_slug, tag_name
  from resolved
  on conflict(topic_id, slug) do update set name = excluded.name
  returning id, topic_id, slug
)
insert into public.question_detail_tags(question_id, detail_tag_id)
select resolved.question_id, detail_tags.id
from resolved
join public.detail_tags
  on detail_tags.topic_id = resolved.topic_id
  and detail_tags.slug = resolved.tag_slug
on conflict do nothing;

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
  and qv.prompt in (
    'Which artist painted The Persistence of Memory?',
    'Who wrote the epic poem Paradise Lost?',
    'Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?'
  );
