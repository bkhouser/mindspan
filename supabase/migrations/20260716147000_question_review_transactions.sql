create or replace function public.save_question_editorial_review_v1(
  p_question_version_id uuid,
  p_verdict text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_notes text := nullif(btrim(p_notes), '');
  previous_review jsonb;
  saved_review jsonb;
begin
  if not public.can_review_questions(actor_id) then
    raise exception 'QUESTION_REVIEWER_REQUIRED';
  end if;

  if p_verdict not in ('approved', 'needs_revision', 'rejected') then
    raise exception 'INVALID_EDITORIAL_VERDICT';
  end if;

  if normalized_notes is not null and char_length(normalized_notes) > 4000 then
    raise exception 'EDITORIAL_NOTES_TOO_LONG';
  end if;

  if not exists (
    select 1
    from public.question_versions qv
    where qv.id = p_question_version_id
      and qv.status = 'published'
  ) then
    raise exception 'PUBLISHED_QUESTION_VERSION_REQUIRED';
  end if;

  select to_jsonb(er)
  into previous_review
  from public.question_editorial_reviews er
  where er.question_version_id = p_question_version_id;

  insert into public.question_editorial_reviews(
    question_version_id,
    reviewed_by,
    verdict,
    notes,
    player_feedback_reviewed_at,
    updated_at
  )
  values (
    p_question_version_id,
    actor_id,
    p_verdict,
    normalized_notes,
    now(),
    now()
  )
  on conflict (question_version_id) do update
  set reviewed_by = excluded.reviewed_by,
      verdict = excluded.verdict,
      notes = excluded.notes,
      player_feedback_reviewed_at = excluded.player_feedback_reviewed_at,
      updated_at = excluded.updated_at;

  select to_jsonb(er)
  into saved_review
  from public.question_editorial_reviews er
  where er.question_version_id = p_question_version_id;

  insert into public.admin_audit_log(
    actor_user_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  )
  values (
    actor_id,
    'question.editorial_' || p_verdict,
    'question_versions',
    p_question_version_id::text,
    previous_review,
    saved_review
  );
end;
$$;

revoke all on function public.save_question_editorial_review_v1(uuid, text, text)
  from public;
grant execute on function public.save_question_editorial_review_v1(uuid, text, text)
  to authenticated, service_role;

create or replace function public.set_user_role_v1(
  p_user_id uuid,
  p_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  previous_role public.user_role;
begin
  if not public.is_sys_admin(actor_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  lock table public.profiles in share row exclusive mode;

  select p.role
  into previous_role
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if previous_role = p_role then
    return;
  end if;

  if previous_role = 'sys_admin' and p_role <> 'sys_admin' and not exists (
    select 1
    from public.profiles p
    where p.id <> p_user_id
      and p.role = 'sys_admin'
      and p.disabled_at is null
  ) then
    raise exception 'FINAL_SYS_ADMIN_REQUIRED';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = now()
  where id = p_user_id;

  insert into public.admin_audit_log(
    actor_user_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  )
  values (
    actor_id,
    'user.role_changed',
    'profiles',
    p_user_id::text,
    jsonb_build_object('role', previous_role),
    jsonb_build_object('role', p_role)
  );
end;
$$;

revoke all on function public.set_user_role_v1(uuid, public.user_role)
  from public;
grant execute on function public.set_user_role_v1(uuid, public.user_role)
  to authenticated, service_role;
