alter table public.profiles
  add column show_play_intro boolean not null default true;

comment on column public.profiles.show_play_intro is
  'When true, show the introductory scoring explanation on the Play page.';

grant update(show_play_intro, updated_at) on public.profiles to authenticated;
