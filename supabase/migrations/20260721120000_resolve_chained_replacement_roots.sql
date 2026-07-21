-- Chained catalog replacements must retire the durable original question even
-- when an intermediate replacement identity was never published to this
-- database. Keep the intermediate identity in the catalog payload for audit
-- clarity, but carry the root separately and exclude that transport metadata
-- from the immutable content hash.
create or replace function public.sync_published_catalog_v6(payload jsonb)
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
  sanitized_payload jsonb;
  root_key text;
  root_question uuid;
begin
  if exists (
    select 1
    from jsonb_array_elements(payload) candidate
    where nullif(btrim(candidate ->> 'replacementRootCatalogKey'), '') =
      nullif(btrim(candidate ->> 'catalogKey'), '')
  ) then
    raise exception 'REPLACEMENT_ROOT_IDENTITY_MUST_CHANGE';
  end if;

  if exists (
    select root_catalog_key
    from (
      select nullif(btrim(candidate ->> 'replacementRootCatalogKey'), '') root_catalog_key
      from jsonb_array_elements(payload) candidate
    ) roots
    where root_catalog_key is not null
    group by root_catalog_key
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_REPLACEMENT_ROOT';
  end if;

  select jsonb_agg(candidate - 'replacementRootCatalogKey' order by ordinality)
  into sanitized_payload
  from jsonb_array_elements(payload) with ordinality entries(candidate, ordinality);

  for synced in select * from public.sync_published_catalog_v5(sanitized_payload) loop
    select candidate into item
    from jsonb_array_elements(payload) candidate
    where candidate ->> 'catalogKey' = synced.result_key;

    root_key := nullif(btrim(item ->> 'replacementRootCatalogKey'), '');
    if root_key is not null then
      select id into root_question
      from public.questions
      where catalog_key = root_key
      for update;

      if root_question is not null
        and root_question <> synced.result_question_id then
        update public.question_versions
        set status = 'retired'
        where question_id = root_question
          and status <> 'retired';

        -- Remove the superseded question from active packs, but retain its
        -- taxonomy links. Historical attempts still contribute to their
        -- original subtopic when normalized mastery is rebuilt, while the
        -- distinct successor starts with fresh per-question repeat state.
        delete from public.pack_questions
        where question_id = root_question;

        update public.questions
        set retired_at = coalesce(retired_at, now())
        where id = root_question;
      end if;
    end if;

    return query select
      synced.result_key,
      synced.result_action,
      synced.result_question_id,
      synced.result_version_id;
  end loop;
end;
$$;

revoke all on function public.sync_published_catalog_v6(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v6(jsonb)
  to service_role;

-- Repair the partially upgraded rc.1 production shape. These operations are
-- deliberately retirement-only: attempts, scores, mastery, feedback, reviews,
-- and all immutable question/version history remain in place.
do $$
declare
  replacement record;
  successor_question uuid;
  root_question uuid;
begin
  for replacement in
    select * from (values
      ('lifestyle-culture-starter.replacement.20260721.qr-meaning', 'lifestyle-culture-starter.opentdb.d67115ddb0284bf4'),
      ('science-nature-starter.replacement.20260721.mycology', 'science-nature-starter.disease-specialty.dwarfism'),
      ('sports-starter.replacement.20260721.olympic-torch', 'sports-starter.athlete-sport.yury-vlasov'),
      ('sports-starter.replacement.20260721.traveling', 'sports-starter.athlete-sport.ronaldinho'),
      ('sports-starter.replacement.20260721.photo-finish-torso', 'sports-starter.athlete-sport.elena-lashmanova'),
      ('trivia-101.replacement.20260721.clue', 'trivia-101.opentdb.43ade97d762d36e4')
    ) as repairs(successor_key, root_key)
  loop
    select id into successor_question
    from public.questions
    where catalog_key = replacement.successor_key;

    select id into root_question
    from public.questions
    where catalog_key = replacement.root_key
    for update;

    -- Fresh databases have neither identity when migrations run. A successor
    -- without its historical root is already in the desired state.
    if root_question is null then
      continue;
    end if;
    if successor_question is null then
      raise exception 'CHAINED_REPLACEMENT_SUCCESSOR_MISSING:%', replacement.successor_key;
    end if;

    update public.question_versions
    set status = 'retired'
    where question_id = root_question
      and status <> 'retired';

    -- Pack membership controls play eligibility. Taxonomy links are historical
    -- metadata and must remain so an old attempt continues to contribute to
    -- the same derived subtopic mastery after catalog finalization.
    delete from public.pack_questions where question_id = root_question;

    update public.questions
    set retired_at = coalesce(retired_at, now())
    where id = root_question;
  end loop;
end;
$$;
