alter table public.profiles
  add column last_app_version text,
  add column last_updates_read_version text;

comment on column public.profiles.last_app_version is
  'Most recent Mindspan application version used by this player.';

comment on column public.profiles.last_updates_read_version is
  'Most recent release whose in-app update notes this player opened.';

update public.profiles
set
  last_app_version = '0.2.0-beta.5',
  last_updates_read_version = '0.2.0-beta.5'
where beta_access_granted_at is not null;

grant update(last_app_version, last_updates_read_version)
  on public.profiles to authenticated;
