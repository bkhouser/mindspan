-- Supersede the rc.4 candidate's catalog finalizer before it reached
-- production. Retiring a replaced question removes it from active packs, but
-- keeps the retired question's taxonomy links so immutable attempts retain
-- their historical subtopic evidence. Per-question repeat state stays on the
-- retired identity and is deliberately not transferred to the successor.
--
-- This function-only follow-up also makes local databases that evaluated the
-- earlier candidate use the corrected behavior for all future synchronizations.
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
