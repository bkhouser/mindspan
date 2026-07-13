create table public.system_settings (
  id boolean primary key default true check (id),
  default_timer_seconds smallint not null default 30 check (default_timer_seconds between 10 and 120),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.system_settings (id, default_timer_seconds)
values (true, 30)
on conflict (id) do nothing;

alter table public.groups
  add column timer_seconds_override smallint
  check (timer_seconds_override between 10 and 120);

alter table public.play_sessions
  add column group_id uuid references public.groups(id) on delete set null,
  add column timer_limit_seconds smallint not null default 30 check (timer_limit_seconds between 10 and 120),
  add column scoring_timer_seconds smallint not null default 30 check (scoring_timer_seconds between 10 and 120);

create index play_sessions_group_idx on public.play_sessions(group_id, started_at desc);

alter table public.question_presentations
  add column timer_limit_seconds smallint,
  add column scoring_timer_seconds smallint;

update public.question_presentations qp
set timer_limit_seconds = qv.time_limit_seconds,
    scoring_timer_seconds = qv.time_limit_seconds
from public.question_versions qv
where qv.id = qp.question_version_id;

alter table public.question_presentations
  alter column timer_limit_seconds set not null,
  alter column timer_limit_seconds set default 30,
  alter column scoring_timer_seconds set not null,
  alter column scoring_timer_seconds set default 30,
  add constraint presentation_timer_limit_range check (timer_limit_seconds between 5 and 360),
  add constraint presentation_scoring_timer_range check (scoring_timer_seconds between 5 and 360);

alter table public.system_settings enable row level security;

create policy system_settings_read on public.system_settings
  for select to authenticated
  using (public.is_active_user() or public.is_sys_admin());

create policy system_settings_admin on public.system_settings
  for all to authenticated
  using (public.is_sys_admin())
  with check (public.is_sys_admin());

drop policy own_sessions on public.play_sessions;
create policy own_sessions on public.play_sessions
  for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and (group_id is null or public.is_group_member(group_id))
  );

grant select, insert, update, delete on public.system_settings to authenticated, service_role;
