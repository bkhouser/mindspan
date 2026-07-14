create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'confusing', 'suggestion', 'content', 'other')),
  impact text not null check (impact in ('minor', 'annoying', 'blocking')),
  description text not null check (char_length(description) between 10 and 4000),
  expected_behavior text check (expected_behavior is null or char_length(expected_behavior) between 1 and 2000),
  page_path text not null check (char_length(page_path) between 1 and 500),
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  app_version text check (app_version is null or char_length(app_version) <= 100),
  contact_allowed boolean not null default true,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index feedback_reports_admin_queue_idx
  on public.feedback_reports(status, created_at desc);
create index feedback_reports_reporter_idx
  on public.feedback_reports(reporter_user_id, created_at desc);

alter table public.feedback_reports enable row level security;

create policy own_feedback_insert on public.feedback_reports
  for insert
  with check (reporter_user_id = auth.uid() and public.is_active_user());

create policy own_feedback_read on public.feedback_reports
  for select
  using ((reporter_user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());

create policy admin_feedback on public.feedback_reports
  for all
  using (public.is_sys_admin())
  with check (public.is_sys_admin());
