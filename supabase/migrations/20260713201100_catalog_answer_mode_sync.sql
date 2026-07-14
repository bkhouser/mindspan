create or replace function public.sync_published_catalog_v2(payload jsonb)
returns table(result_key text, result_action text, result_question_id uuid, result_version_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  synced record;
  requested_mode text;
begin
  for synced in select * from public.sync_published_catalog_v1(payload) loop
    if synced.result_version_id is not null then
      select coalesce(item ->> 'answerMode', 'recall')
        into requested_mode
      from jsonb_array_elements(payload) item
      where item ->> 'catalogKey' = synced.result_key;

      if requested_mode not in ('recall', 'required_choice') then
        raise exception 'INVALID_ANSWER_MODE:%', requested_mode;
      end if;

      update public.question_versions
      set answer_mode = requested_mode
      where id = synced.result_version_id;
    end if;

    return query select
      synced.result_key,
      synced.result_action,
      synced.result_question_id,
      synced.result_version_id;
  end loop;
end;
$$;

revoke all on function public.sync_published_catalog_v2(jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_published_catalog_v2(jsonb)
  to service_role;
