-- Apply the completed 2026-07-21 reviewer decisions to hand-seeded questions
-- without changing question identity or historical attempts.
do $$
declare
  item record;
  previous_version public.question_versions%rowtype;
  replacement_version_id uuid;
  replacement_version_number integer;
begin
  for item in
    select * from (values
      ('seed.film-television.2cf6ed92f7753e231b75345019acabc1'::text, 3::smallint, null::text),
      ('seed.geography.f1ed0f50d99264fd14c4803380e74e9e'::text, 2::smallint, null::text),
      ('seed.science-nature.3e7ef5002d00a0cc6321451f820d036d'::text, 2::smallint, null::text),
      ('seed.geography.e3fb09dea77b4bcb39a2177f307a1f08'::text, 1::smallint, null::text),
      ('seed.lifestyle-culture.96b215915ca19d875c06ee233f075cef'::text, 4::smallint, null::text),
      ('seed.geography.61fafa06ce39b0f62e41bcaf94ac1e93'::text, 4::smallint, 'Gibraltar'::text),
      ('seed.arts-literature.a30f349f9fe29db7e7b4872438f89ef5'::text, 4::smallint, null::text)
    ) review_changes(editorial_key, new_difficulty, new_alias)
  loop
    select qv.*
    into previous_version
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where q.catalog_key is null
      and qv.status = 'published'
      and qv.editorial_key = item.editorial_key
    order by qv.version_number desc
    limit 1;

    if not found then
      continue;
    end if;

    if previous_version.difficulty = item.new_difficulty
      and (
        item.new_alias is null
        or exists (
          select 1
          from public.answer_aliases aa
          where aa.question_version_id = previous_version.id
            and aa.normalized_answer = lower(regexp_replace(item.new_alias, '[^[:alnum:]]+', '', 'g'))
        )
      ) then
      continue;
    end if;

    select coalesce(max(version_number), 0) + 1
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
      previous_version.explanation,
      previous_version.details,
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

    if item.new_alias is not null then
      insert into public.answer_aliases(question_version_id, answer, normalized_answer)
      values (
        replacement_version_id,
        item.new_alias,
        lower(regexp_replace(item.new_alias, '[^[:alnum:]]+', '', 'g'))
      )
      on conflict (question_version_id, normalized_answer) do nothing;
    end if;

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
  and qv.editorial_key in (
    'seed.film-television.2cf6ed92f7753e231b75345019acabc1',
    'seed.geography.f1ed0f50d99264fd14c4803380e74e9e',
    'seed.science-nature.3e7ef5002d00a0cc6321451f820d036d',
    'seed.geography.e3fb09dea77b4bcb39a2177f307a1f08',
    'seed.lifestyle-culture.96b215915ca19d875c06ee233f075cef',
    'seed.geography.61fafa06ce39b0f62e41bcaf94ac1e93',
    'seed.arts-literature.a30f349f9fe29db7e7b4872438f89ef5'
  );
