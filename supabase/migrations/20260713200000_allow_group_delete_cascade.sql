create or replace function public.prevent_last_group_admin_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- A membership delete cascaded from deletion of its parent group is valid.
  -- Direct membership deletion still enters at trigger depth 1 and must retain
  -- at least one administrator.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') and
    (select count(*) from public.group_memberships where group_id = old.group_id and role = 'admin') <= 1
  then
    raise exception 'GROUP_REQUIRES_ADMIN';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
