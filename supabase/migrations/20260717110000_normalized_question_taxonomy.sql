create table public.detail_tags (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.question_detail_tags (
  question_id uuid not null references public.questions(id) on delete cascade,
  detail_tag_id uuid not null references public.detail_tags(id) on delete cascade,
  primary key (question_id, detail_tag_id)
);

create index question_detail_tags_tag_idx
  on public.question_detail_tags(detail_tag_id, question_id);

comment on table public.detail_tags is
  'Reviewer-only fine-grained labels. They do not drive player-facing mastery.';
comment on table public.question_detail_tags is
  'Reviewer-only detail classifications for a question.';

alter table public.detail_tags enable row level security;
alter table public.question_detail_tags enable row level security;

create policy detail_tags_reviewer_read
  on public.detail_tags for select to authenticated
  using (public.can_review_questions());
create policy detail_tags_admin_write
  on public.detail_tags for all to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy question_detail_tags_reviewer_read
  on public.question_detail_tags for select to authenticated
  using (public.can_review_questions());
create policy question_detail_tags_admin_write
  on public.question_detail_tags for all to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());

grant select on public.detail_tags, public.question_detail_tags to authenticated;
grant select, insert, update, delete
  on public.detail_tags, public.question_detail_tags to service_role;

create or replace function public.assign_question_subtopics_v1(
  target_question uuid,
  target_topic uuid,
  subtopic_names text[],
  target_admin uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
  target_slug text;
  target_subtopic uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin and role = 'sys_admin' and disabled_at is null
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if not exists (
    select 1 from public.question_versions
    where question_id = target_question and topic_id = target_topic
  ) then
    raise exception 'QUESTION_TOPIC_MISMATCH';
  end if;
  if coalesce(array_length(subtopic_names, 1), 0) <> 1 then
    raise exception 'EXACTLY_ONE_SUBTOPIC_REQUIRED';
  end if;

  normalized_name := trim(subtopic_names[1]);
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
    raise exception 'INVALID_SUBTOPIC:%', normalized_name;
  end if;
  target_slug := trim(
    both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')
  );
  if target_slug = '' then
    raise exception 'INVALID_SUBTOPIC:%', normalized_name;
  end if;

  insert into public.subtopics(topic_id, slug, name)
  values(target_topic, target_slug, normalized_name)
  on conflict(topic_id, slug) do update set name = excluded.name
  returning id into target_subtopic;

  insert into public.question_subtopics(question_id, subtopic_id)
  values(target_question, target_subtopic)
  on conflict do nothing;
end;
$$;

create or replace function public.replace_question_subtopics_v1(
  target_question uuid,
  target_topic uuid,
  subtopic_names text[],
  target_admin uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(array_length(subtopic_names, 1), 0) <> 1 then
    raise exception 'EXACTLY_ONE_SUBTOPIC_REQUIRED';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_admin and role = 'sys_admin' and disabled_at is null
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if not exists (
    select 1 from public.question_versions
    where question_id = target_question and topic_id = target_topic
  ) then
    raise exception 'QUESTION_TOPIC_MISMATCH';
  end if;

  delete from public.question_subtopics where question_id = target_question;
  perform public.assign_question_subtopics_v1(
    target_question, target_topic, subtopic_names, target_admin
  );
end;
$$;

revoke all on function public.assign_question_subtopics_v1(uuid,uuid,text[],uuid)
  from public, anon, authenticated;
grant execute on function public.assign_question_subtopics_v1(uuid,uuid,text[],uuid)
  to service_role;
revoke all on function public.replace_question_subtopics_v1(uuid,uuid,text[],uuid)
  from public, anon, authenticated;
grant execute on function public.replace_question_subtopics_v1(uuid,uuid,text[],uuid)
  to service_role;

create or replace function public.sync_published_catalog_v4(payload jsonb)
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
  item jsonb;
  tag_name text;
  normalized_name text;
  target_slug text;
  target_topic uuid;
  target_tag uuid;
begin
  if exists (
    select 1
    from jsonb_array_elements(payload) candidate
    where jsonb_typeof(candidate -> 'subtopics') <> 'array'
      or jsonb_array_length(candidate -> 'subtopics') <> 1
  ) then
    raise exception 'EXACTLY_ONE_SUBTOPIC_REQUIRED';
  end if;

  for synced in select * from public.sync_published_catalog_v3(payload) loop
    if synced.result_version_id is not null then
      select candidate into item
      from jsonb_array_elements(payload) candidate
      where candidate ->> 'catalogKey' = synced.result_key;

      select qv.topic_id into target_topic
      from public.question_versions qv
      where qv.id = synced.result_version_id;

      delete from public.question_detail_tags
      where question_id = synced.result_question_id;

      for tag_name in
        select value
        from jsonb_array_elements_text(coalesce(item -> 'detailTags', '[]'::jsonb))
      loop
        normalized_name := trim(tag_name);
        if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
          raise exception 'INVALID_DETAIL_TAG:%', tag_name;
        end if;
        target_slug := trim(
          both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')
        );
        if target_slug = '' then
          raise exception 'INVALID_DETAIL_TAG:%', tag_name;
        end if;

        insert into public.detail_tags(topic_id, slug, name)
        values(target_topic, target_slug, normalized_name)
        on conflict(topic_id, slug) do update set name = excluded.name
        returning id into target_tag;

        insert into public.question_detail_tags(question_id, detail_tag_id)
        values(synced.result_question_id, target_tag)
        on conflict do nothing;
      end loop;
    end if;

    return query select
      synced.result_key,
      synced.result_action,
      synced.result_question_id,
      synced.result_version_id;
  end loop;
end;
$$;

revoke all on function public.sync_published_catalog_v4(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v4(jsonb)
  to service_role;

-- The forty seed questions predate the generated catalog. Map their existing
-- labels to the same stable areas without replacing their question/version IDs.
create or replace function public.normalize_seed_question_taxonomy_v1()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  seed record;
  target_subtopic uuid;
begin
  for seed in
    with seed_mapping(old_name, area_name) as (values
  ('Periodic Table', 'Chemistry'),
  ('Astronomy', 'Astronomy & Space'),
  ('Botany', 'Botany'),
  ('Particle Physics', 'Physics'),
  ('United States History', 'United States History'),
  ('Inca Civilization', 'Latin American History'),
  ('Medieval Europe', 'Medieval History'),
  ('Early Modern Europe', 'Early Modern History'),
  ('Byzantine Empire', 'Medieval History'),
  ('World Capitals', 'Capitals & Cities'),
  ('Polar Geography', 'Climate & Biomes'),
  ('African Geography', 'Countries & Borders'),
  ('Straits and Waterways', 'Oceans, Seas & Islands'),
  ('Islands', 'Oceans, Seas & Islands'),
  ('Association Football', 'Association Football'),
  ('Tennis', 'Tennis & Racket Sports'),
  ('Basketball', 'Basketball'),
  ('Cricket', 'Cricket & Rugby'),
  ('Ice Hockey', 'Hockey'),
  ('Renaissance Art', 'Painting'),
  ('Fiction', 'Novels & Fiction'),
  ('Surrealism', 'Art Movements'),
  ('Poetry', 'Poetry'),
  ('Architecture', 'Architecture'),
  ('Film Directors', 'Directors & Filmmaking'),
  ('Superhero Films', 'Superheroes & Franchises'),
  ('Film History', 'Film History & Classics'),
  ('World Cinema', 'Film History & Classics'),
  ('Cinematography', 'Directors & Filmmaking'),
  ('String Instruments', 'Instruments'),
  ('Rock Music', 'Rock'),
  ('Classical Music', 'Classical Music'),
  ('Symphonies', 'Classical Music'),
  ('Music Theory', 'Music Theory & Terminology'),
  ('Jazz', 'Jazz'),
  ('Italian Cuisine', 'Cooking & Cuisine'),
  ('Board Games', 'Games, Hobbies & Recreation'),
  ('Japanese Cuisine', 'Cooking & Cuisine'),
  ('Fermentation', 'Cooking & Cuisine')
    )
    select distinct q.id as question_id, qv.topic_id, mapping.area_name
    from public.questions q
    join public.question_versions qv
      on qv.question_id = q.id and qv.status = 'published'
    join public.question_subtopics qs on qs.question_id = q.id
    join public.subtopics old_subtopic on old_subtopic.id = qs.subtopic_id
    join seed_mapping mapping on mapping.old_name = old_subtopic.name
    where q.catalog_key is null
      and old_subtopic.name <> mapping.area_name
  loop
    insert into public.subtopics(topic_id, slug, name)
    values(
      seed.topic_id,
      trim(both '-' from regexp_replace(lower(seed.area_name), '[^a-z0-9]+', '-', 'g')),
      seed.area_name
    )
    on conflict(topic_id, slug) do update set name = excluded.name
    returning id into target_subtopic;

    delete from public.question_subtopics
    where question_id = seed.question_id;
    insert into public.question_subtopics(question_id, subtopic_id)
    values(seed.question_id, target_subtopic);
  end loop;
end;
$$;

revoke all on function public.normalize_seed_question_taxonomy_v1()
  from public, anon, authenticated;
grant execute on function public.normalize_seed_question_taxonomy_v1()
  to service_role;

select public.normalize_seed_question_taxonomy_v1();

create or replace function public.finalize_normalized_taxonomy_v1()
returns table(
  published_questions bigint,
  primary_subtopics bigint,
  detail_tags bigint,
  mastery_rows bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invalid_count bigint;
begin
  perform public.normalize_seed_question_taxonomy_v1();

  with seed_mapping(old_name, area_name) as (values
    ('Periodic Table', 'Chemistry'),
    ('Astronomy', 'Astronomy & Space'),
    ('Botany', 'Botany'),
    ('Particle Physics', 'Physics'),
    ('United States History', 'United States History'),
    ('Inca Civilization', 'Latin American History'),
    ('Medieval Europe', 'Medieval History'),
    ('Early Modern Europe', 'Early Modern History'),
    ('Byzantine Empire', 'Medieval History'),
    ('World Capitals', 'Capitals & Cities'),
    ('Polar Geography', 'Climate & Biomes'),
    ('African Geography', 'Countries & Borders'),
    ('Straits and Waterways', 'Oceans, Seas & Islands'),
    ('Islands', 'Oceans, Seas & Islands'),
    ('Association Football', 'Association Football'),
    ('Tennis', 'Tennis & Racket Sports'),
    ('Basketball', 'Basketball'),
    ('Cricket', 'Cricket & Rugby'),
    ('Ice Hockey', 'Hockey'),
    ('Renaissance Art', 'Painting'),
    ('Fiction', 'Novels & Fiction'),
    ('Surrealism', 'Art Movements'),
    ('Poetry', 'Poetry'),
    ('Architecture', 'Architecture'),
    ('Film Directors', 'Directors & Filmmaking'),
    ('Superhero Films', 'Superheroes & Franchises'),
    ('Film History', 'Film History & Classics'),
    ('World Cinema', 'Film History & Classics'),
    ('Cinematography', 'Directors & Filmmaking'),
    ('String Instruments', 'Instruments'),
    ('Rock Music', 'Rock'),
    ('Classical Music', 'Classical Music'),
    ('Symphonies', 'Classical Music'),
    ('Music Theory', 'Music Theory & Terminology'),
    ('Jazz', 'Jazz'),
    ('Italian Cuisine', 'Cooking & Cuisine'),
    ('Board Games', 'Games, Hobbies & Recreation'),
    ('Japanese Cuisine', 'Cooking & Cuisine'),
    ('Fermentation', 'Cooking & Cuisine')
  ), seed_questions as (
    select distinct q.id as question_id, qv.topic_id, mapping.area_name
    from public.questions q
    join public.question_versions qv
      on qv.question_id = q.id and qv.status = 'published'
    join public.question_subtopics qs on qs.question_id = q.id
    join public.subtopics old_subtopic on old_subtopic.id = qs.subtopic_id
    join seed_mapping mapping on mapping.old_name = old_subtopic.name
    where q.catalog_key is null
      and old_subtopic.name <> mapping.area_name
  ), canonical as (
    insert into public.subtopics(topic_id, slug, name)
    select distinct
      topic_id,
      trim(both '-' from regexp_replace(lower(area_name), '[^a-z0-9]+', '-', 'g')),
      area_name
    from seed_questions
    on conflict(topic_id, slug) do update set name = excluded.name
    returning id, topic_id, name
  ), removed as (
    delete from public.question_subtopics qs
    using seed_questions seed
    where qs.question_id = seed.question_id
  )
  insert into public.question_subtopics(question_id, subtopic_id)
  select seed.question_id, canonical.id
  from seed_questions seed
  join canonical
    on canonical.topic_id = seed.topic_id and canonical.name = seed.area_name
  on conflict do nothing;

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
  from public.questions q, public.topics t
  where q.id = qv.question_id
    and t.id = qv.topic_id
    and qv.status = 'published'
    and q.catalog_key is null
    and (qv.editorial_key is null or qv.editorial_content_hash is null);

  select count(*) into invalid_count
  from (
    select qv.question_id
    from public.question_versions qv
    left join public.question_subtopics qs on qs.question_id = qv.question_id
    where qv.status = 'published'
    group by qv.question_id
    having count(qs.subtopic_id) <> 1
  ) invalid;
  if invalid_count <> 0 then
    raise exception 'INVALID_PRIMARY_SUBTOPIC_COUNT:%', invalid_count;
  end if;

  delete from public.user_subtopic_question_state where true;
  delete from public.user_subtopic_mastery where true;
  delete from public.subtopics s
  where not exists (
    select 1 from public.question_subtopics qs where qs.subtopic_id = s.id
  );
  delete from public.detail_tags dt
  where not exists (
    select 1 from public.question_detail_tags qdt where qdt.detail_tag_id = dt.id
  );

  insert into public.user_subtopic_question_state(
    user_id, subtopic_id, question_id, first_attempt_at
  )
  select
    a.user_id,
    qs.subtopic_id,
    qv.question_id,
    min(a.created_at)
  from public.attempts a
  join public.question_versions qv on qv.id = a.question_version_id
  join public.question_subtopics qs on qs.question_id = qv.question_id
  group by a.user_id, qs.subtopic_id, qv.question_id;

  insert into public.user_subtopic_mastery(
    user_id,
    subtopic_id,
    weighted_successes,
    weighted_evidence,
    unique_questions,
    correct_attempts,
    total_attempts,
    assisted_correct_attempts,
    lifetime_points,
    updated_at
  )
  select
    a.user_id,
    qs.subtopic_id,
    sum(coalesce((a.score_snapshot ->> 'masterySuccessDelta')::numeric, 0)),
    sum(coalesce((a.score_snapshot ->> 'masteryEvidenceDelta')::numeric, 0)),
    count(distinct qv.question_id)::integer,
    count(*) filter (where a.correct)::integer,
    count(*)::integer,
    count(*) filter (where a.correct and a.assisted)::integer,
    sum(a.earned_points),
    max(a.created_at)
  from public.attempts a
  join public.question_versions qv on qv.id = a.question_version_id
  join public.question_subtopics qs on qs.question_id = qv.question_id
  group by a.user_id, qs.subtopic_id;

  return query select
    (select count(*) from public.question_versions where status = 'published'),
    (select count(*) from public.subtopics),
    (select count(*) from public.detail_tags),
    (select count(*) from public.user_subtopic_mastery);
end;
$$;

revoke all on function public.finalize_normalized_taxonomy_v1()
  from public, anon, authenticated;
grant execute on function public.finalize_normalized_taxonomy_v1()
  to service_role;
