alter table public.profiles
  add column immediate_choice_submit boolean not null default false;

comment on column public.profiles.immediate_choice_submit is
  'When true, selecting a revealed multiple-choice answer submits it immediately.';

grant update(immediate_choice_submit, updated_at) on public.profiles to authenticated;
