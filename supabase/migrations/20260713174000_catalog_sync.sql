alter table public.questions
  add column catalog_key text unique,
  add column catalog_hash text;

comment on column public.questions.catalog_key is
  'Stable source-control identifier used by the curated catalog loader.';
comment on column public.questions.catalog_hash is
  'Hash of the last catalog payload applied to this question.';

create or replace function public.sync_published_catalog_v1(payload jsonb)
returns table(result_key text, result_action text, result_question_id uuid, result_version_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  item_key text;
  incoming_hash text;
  stored_hash text;
  target_topic uuid;
  target_question uuid;
  target_version uuid;
  next_version integer;
  requested_packs integer;
  inserted_packs integer;
  subtopic_name text;
  normalized_name text;
  target_slug text;
  target_subtopic uuid;
begin
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) = 0 then
    raise exception 'EMPTY_CATALOG_BATCH';
  end if;

  for item in select value from jsonb_array_elements(payload) loop
    item_key := trim(item ->> 'catalogKey');
    if item_key is null or item_key = '' then
      raise exception 'MISSING_CATALOG_KEY';
    end if;

    incoming_hash := md5(item::text);
    select id, catalog_hash
      into target_question, stored_hash
    from public.questions
    where catalog_key = item_key;

    if target_question is not null and stored_hash = incoming_hash then
      return query select item_key, 'skipped'::text, target_question, null::uuid;
      continue;
    end if;

    select id into target_topic
    from public.topics
    where slug = item ->> 'topicSlug' and enabled = true;
    if target_topic is null then
      raise exception 'UNKNOWN_TOPIC:%', item ->> 'topicSlug';
    end if;

    if target_question is null then
      insert into public.questions(catalog_key, catalog_hash)
      values(item_key, incoming_hash)
      returning id into target_question;
      next_version := 1;
    else
      select coalesce(max(version_number), 0) + 1
        into next_version
      from public.question_versions
      where question_id = target_question;

      update public.question_versions
      set status = 'retired'
      where question_id = target_question and status <> 'retired';

      delete from public.pack_questions where question_id = target_question;
      delete from public.question_subtopics where question_id = target_question;
      update public.questions
      set catalog_hash = incoming_hash, retired_at = null
      where id = target_question;
    end if;

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
      published_at
    ) values (
      target_question,
      target_topic,
      next_version,
      'published',
      item ->> 'prompt',
      item ->> 'canonicalAnswer',
      item ->> 'explanation',
      item ->> 'details',
      (item ->> 'difficulty')::smallint,
      coalesce((item ->> 'timeLimitSeconds')::smallint, 30),
      coalesce((item ->> 'removeLeadingArticles')::boolean, false),
      now(),
      nullif(item ->> 'expiresAt', '')::timestamptz,
      now()
    ) returning id into target_version;

    insert into public.answer_aliases(question_version_id, answer, normalized_answer)
    select
      target_version,
      candidate,
      lower(regexp_replace(candidate, '[^[:alnum:]]+', '', 'g'))
    from (
      select item ->> 'canonicalAnswer' as candidate
      union
      select value
      from jsonb_array_elements_text(coalesce(item -> 'aliases', '[]'::jsonb))
    ) accepted;

    insert into public.distractors(question_version_id, answer, sort_order)
    select target_version, value, ordinality::smallint
    from jsonb_array_elements_text(item -> 'distractors') with ordinality;

    insert into public.question_citations(question_version_id, label, url)
    values(
      target_version,
      item #>> '{source,label}',
      item #>> '{source,url}'
    );

    requested_packs := jsonb_array_length(item -> 'packSlugs');
    insert into public.pack_questions(pack_id, question_id)
    select id, target_question
    from public.packs
    where slug in (
      select value
      from jsonb_array_elements_text(item -> 'packSlugs')
    );
    get diagnostics inserted_packs = row_count;
    if inserted_packs <> requested_packs then
      raise exception 'UNKNOWN_OR_DUPLICATE_PACK:%', item_key;
    end if;

    for subtopic_name in
      select value
      from jsonb_array_elements_text(coalesce(item -> 'subtopics', '[]'::jsonb))
    loop
      normalized_name := trim(subtopic_name);
      if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
        raise exception 'INVALID_SUBTOPIC:%', subtopic_name;
      end if;
      target_slug := trim(
        both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')
      );
      insert into public.subtopics(topic_id, slug, name)
      values(target_topic, target_slug, normalized_name)
      on conflict(topic_id, slug) do update set name = excluded.name
      returning id into target_subtopic;

      insert into public.question_subtopics(question_id, subtopic_id)
      values(target_question, target_subtopic)
      on conflict do nothing;
    end loop;

    return query select
      item_key,
      case when next_version = 1 then 'inserted' else 'updated' end,
      target_question,
      target_version;
  end loop;
end;
$$;

revoke all on function public.sync_published_catalog_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v1(jsonb)
  to service_role;
