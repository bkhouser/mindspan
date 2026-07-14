create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New player'));
  return new;
end;
$$;

create or replace function public.redeem_invite_for_user(raw_token text, target_user uuid)
returns table(granted boolean, joined_group uuid) language plpgsql security definer set search_path = '' as $$
declare
  hashed text;
  beta_id uuid;
  group_invite_id uuid;
  target_group uuid;
  target_email text;
  inserted_count integer;
begin
  hashed := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  select lower(email) into target_email from auth.users where id = target_user;

  select bi.id into beta_id
    from public.beta_invites bi
    where bi.token_hash = hashed
      and bi.revoked_at is null
      and bi.expires_at > now()
      and bi.use_count < bi.max_uses
      and (bi.email is null or lower(bi.email) = target_email)
    for update;
  if beta_id is not null then
    update public.beta_invites set use_count = use_count + 1 where id = beta_id;
    update public.profiles set beta_access_granted_at = coalesce(beta_access_granted_at, now()) where id = target_user;
    insert into public.pack_unlocks(user_id, pack_id, cost_insight)
      select target_user, p.id, 0 from public.packs p where p.is_starter = true
      on conflict do nothing;
    return query select true, null::uuid;
    return;
  end if;

  select gi.id, gi.group_id into group_invite_id, target_group
    from public.group_invites gi
    where gi.token_hash = hashed
      and gi.revoked_at is null
      and gi.expires_at > now()
      and gi.use_count < gi.max_uses
    for update;
  if group_invite_id is not null then
    update public.group_invites set use_count = use_count + 1 where id = group_invite_id;
    update public.profiles set beta_access_granted_at = coalesce(beta_access_granted_at, now()) where id = target_user;
    insert into public.pack_unlocks(user_id, pack_id, cost_insight)
      select target_user, p.id, 0 from public.packs p where p.is_starter = true
      on conflict do nothing;
    insert into public.group_memberships(group_id, user_id, role)
      values (target_group, target_user, 'member') on conflict do nothing;
    get diagnostics inserted_count = row_count;
    if inserted_count > 0 then
      insert into public.activity_events(group_id, actor_user_id, kind, payload)
        values (target_group, target_user, 'group_joined', '{}'::jsonb);
    end if;
    return query select true, target_group;
    return;
  end if;
  return query select false, null::uuid;
end;
$$;

revoke all on function public.redeem_invite_for_user(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_invite_for_user(text, uuid) to service_role;
