create or replace function public.import_question_batch_v1(payload jsonb, target_admin uuid)
returns table(question_id uuid, version_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; target_topic uuid; q_id uuid; v_id uuid;
  inserted_packs integer; requested_packs integer; imported_subtopics text[];
begin
  if not exists (select 1 from public.profiles where id = target_admin and role = 'sys_admin' and disabled_at is null) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) = 0 then raise exception 'EMPTY_BATCH'; end if;
  for item in select value from jsonb_array_elements(payload) loop
    select id into target_topic from public.topics where slug = item ->> 'topicSlug' and enabled = true;
    if target_topic is null then raise exception 'UNKNOWN_TOPIC:%', item ->> 'topicSlug'; end if;
    if exists (
      select 1 from public.question_versions existing
      where existing.topic_id = target_topic and existing.status in ('draft', 'review', 'published')
        and lower(trim(existing.prompt)) = lower(trim(item ->> 'prompt'))
        and lower(trim(existing.canonical_answer)) = lower(trim(item ->> 'canonicalAnswer'))
    ) then raise exception 'DUPLICATE_QUESTION:%', item ->> 'prompt'; end if;

    insert into public.questions default values returning id into q_id;
    insert into public.question_versions(
      question_id, topic_id, version_number, status, prompt, canonical_answer, explanation, details,
      difficulty, time_limit_seconds, remove_leading_articles, verified_at, expires_at, created_by
    ) values (
      q_id, target_topic, 1, 'review', item ->> 'prompt', item ->> 'canonicalAnswer',
      item ->> 'explanation', item ->> 'details', (item ->> 'difficulty')::smallint,
      coalesce((item ->> 'timeLimitSeconds')::smallint, 30),
      coalesce((item ->> 'removeLeadingArticles')::boolean, false), now(),
      nullif(item ->> 'expiresAt', '')::timestamptz, target_admin
    ) returning id into v_id;

    insert into public.answer_aliases(question_version_id, answer, normalized_answer)
    select v_id, candidate, lower(regexp_replace(candidate, '[^[:alnum:]]+', '', 'g'))
    from (
      select item ->> 'canonicalAnswer' as candidate
      union
      select value from jsonb_array_elements_text(coalesce(item -> 'aliases', '[]'::jsonb))
    ) accepted;
    insert into public.distractors(question_version_id, answer, sort_order)
      select v_id, value, ordinality::smallint
      from jsonb_array_elements_text(item -> 'distractors') with ordinality;
    insert into public.question_citations(question_version_id, label, url)
      values(v_id, item #>> '{source,label}', item #>> '{source,url}');

    requested_packs := jsonb_array_length(item -> 'packSlugs');
    insert into public.pack_questions(pack_id, question_id)
      select p.id, q_id from public.packs p
      where p.slug in (select value from jsonb_array_elements_text(item -> 'packSlugs'));
    get diagnostics inserted_packs = row_count;
    if inserted_packs <> requested_packs then raise exception 'UNKNOWN_OR_DUPLICATE_PACK'; end if;

    select coalesce(array_agg(value), array[]::text[]) into imported_subtopics
    from jsonb_array_elements_text(coalesce(item -> 'subtopics', '[]'::jsonb));
    perform public.assign_question_subtopics_v1(q_id, target_topic, imported_subtopics, target_admin);

    insert into public.admin_audit_log(actor_user_id, action, target_table, target_id, after_data)
      values(target_admin, 'question.imported', 'question_versions', v_id,
        jsonb_build_object('status', 'review', 'subtopics', coalesce(item -> 'subtopics', '[]'::jsonb)));
    return query select q_id, v_id;
  end loop;
end;
$$;
