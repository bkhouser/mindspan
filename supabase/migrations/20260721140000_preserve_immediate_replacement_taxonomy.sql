-- Apply the same historical-taxonomy rule to ordinary one-step replacements.
-- The v6 chained-root finalizer delegates immediate predecessor handling to
-- v5, so both functions must preserve taxonomy while removing retired
-- questions from active packs.
create or replace function public.sync_published_catalog_v5(payload jsonb)
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
  predecessor_key text;
  predecessor_question uuid;
begin
  if exists (
    select 1
    from jsonb_array_elements(payload) candidate
    where nullif(btrim(candidate ->> 'replacesCatalogKey'), '') =
      nullif(btrim(candidate ->> 'catalogKey'), '')
  ) then
    raise exception 'REPLACEMENT_IDENTITY_MUST_CHANGE';
  end if;

  if exists (
    select predecessor
    from (
      select nullif(btrim(candidate ->> 'replacesCatalogKey'), '') predecessor
      from jsonb_array_elements(payload) candidate
    ) replacements
    where predecessor is not null
    group by predecessor
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_REPLACEMENT_TARGET';
  end if;

  for synced in select * from public.sync_published_catalog_v4(payload) loop
    select candidate into item
    from jsonb_array_elements(payload) candidate
    where candidate ->> 'catalogKey' = synced.result_key;

    predecessor_key := nullif(btrim(item ->> 'replacesCatalogKey'), '');
    if predecessor_key is not null then
      select id into predecessor_question
      from public.questions
      where catalog_key = predecessor_key
      for update;

      if predecessor_question is not null
        and predecessor_question <> synced.result_question_id then
        update public.question_versions
        set status = 'retired'
        where question_id = predecessor_question
          and status <> 'retired';

        delete from public.pack_questions
        where question_id = predecessor_question;

        update public.questions
        set retired_at = coalesce(retired_at, now())
        where id = predecessor_question;
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

revoke all on function public.sync_published_catalog_v5(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v5(jsonb)
  to service_role;
