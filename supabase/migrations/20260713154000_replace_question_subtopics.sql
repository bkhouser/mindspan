create or replace function public.replace_question_subtopics_v1(
  target_question uuid,
  target_topic uuid,
  subtopic_names text[],
  target_admin uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin and role = 'sys_admin' and disabled_at is null
  ) then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (
    select 1 from public.question_versions
    where question_id = target_question and topic_id = target_topic
  ) then raise exception 'QUESTION_TOPIC_MISMATCH'; end if;
  delete from public.question_subtopics where question_id = target_question;
  perform public.assign_question_subtopics_v1(
    target_question, target_topic, subtopic_names, target_admin
  );
end;
$$;

revoke all on function public.replace_question_subtopics_v1(uuid,uuid,text[],uuid) from public, anon, authenticated;
grant execute on function public.replace_question_subtopics_v1(uuid,uuid,text[],uuid) to service_role;
