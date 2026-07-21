-- Publish immutable revisions for the three hand-seeded Sports Starter
-- questions touched by the full pack quality pass. Existing attempts remain
-- attached to the version originally presented.
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
        'How many players from one team are normally on the field in association football?'::text,
        'How many players from one team are normally on the field in soccer?'::text,
        'Each soccer team normally fields eleven players, including its goalkeeper.'::text,
        'A match is played by two teams of no more than eleven players each. One must be the goalkeeper, and a team generally cannot start or continue with fewer than seven players.'::text,
        1
      ),
      (
        'In cricket, how many stumps make up one wicket?'::text,
        'In cricket, how many stumps make up one wicket?'::text,
        'A cricket wicket consists of three upright stumps topped by two bails.'::text,
        'The two wickets stand opposite one another at the ends of the pitch. Under Law 8, each is formed from three wooden stumps with two bails resting in grooves across their tops.'::text,
        3
      ),
      (
        'Which trophy is awarded to the National Hockey League playoff champion?'::text,
        'Which trophy is awarded to the National Hockey League playoff champion?'::text,
        'The NHL playoff champion is awarded the Stanley Cup.'::text,
        'Lord Stanley of Preston donated the trophy in 1892, before the NHL existed. It became the NHL championship trophy after the league formed and is famous for bearing the engraved names of champions.'::text,
        2
      )
    ) values_to_publish(old_prompt, new_prompt, new_explanation, new_details, new_difficulty)
  loop
    select qv.*
    into previous_version
    from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where q.catalog_key is null
      and qv.status = 'published'
      and qv.prompt in (item.old_prompt, item.new_prompt)
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
    'How many players from one team are normally on the field in soccer?',
    'In cricket, how many stumps make up one wicket?',
    'Which trophy is awarded to the National Hockey League playoff champion?'
  );
