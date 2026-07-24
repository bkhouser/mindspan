-- Final 1.0 operational hardening. The maintenance flag keeps active answers
-- available during deployments while preventing new play work from starting.
-- User access changes remain append-only in the audit log and preserve all
-- player history.

alter table public.system_settings
  add column maintenance_mode boolean not null default false,
  add column maintenance_started_at timestamptz,
  add column maintenance_message text;

create or replace function public.set_user_access_v1(
  p_user_id uuid,
  p_disabled boolean,
  p_reason text
)
returns table(disabled_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.profiles%rowtype;
  active_admin_count integer;
  next_disabled_at timestamptz;
begin
  if not public.is_sys_admin() then
    raise exception 'SYS_ADMIN_REQUIRED';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'CANNOT_CHANGE_OWN_ACCESS';
  end if;

  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'SUPPORT_REASON_REQUIRED';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p_disabled and target_profile.role = 'sys_admin' and target_profile.disabled_at is null then
    select count(*) into active_admin_count
    from public.profiles
    where role = 'sys_admin'
      and disabled_at is null;

    if active_admin_count <= 1 then
      raise exception 'FINAL_SYS_ADMIN_PROTECTED';
    end if;
  end if;

  next_disabled_at := case when p_disabled then coalesce(target_profile.disabled_at, now()) else null end;

  update public.profiles
  set disabled_at = next_disabled_at,
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
  values(
    auth.uid(),
    case when p_disabled then 'user.access_suspended' else 'user.access_restored' end,
    'profiles',
    p_user_id::text,
    jsonb_build_object('disabled_at', target_profile.disabled_at),
    jsonb_build_object('disabled_at', next_disabled_at, 'reason', btrim(p_reason))
  );

  return query select next_disabled_at as disabled_at;
end;
$$;

revoke all on function public.set_user_access_v1(uuid, boolean, text) from public, anon;
grant execute on function public.set_user_access_v1(uuid, boolean, text) to authenticated, service_role;
