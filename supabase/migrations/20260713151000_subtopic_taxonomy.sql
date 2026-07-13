create table public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.question_subtopics (
  question_id uuid not null references public.questions(id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  primary key (question_id, subtopic_id)
);

create table public.user_subtopic_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  weighted_successes numeric(14, 6) not null default 0 check (weighted_successes >= 0),
  weighted_evidence numeric(14, 6) not null default 0 check (weighted_evidence >= 0),
  unique_questions integer not null default 0 check (unique_questions >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),
  total_attempts integer not null default 0 check (total_attempts >= 0),
  assisted_correct_attempts integer not null default 0 check (assisted_correct_attempts >= 0),
  lifetime_points bigint not null default 0 check (lifetime_points >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, subtopic_id)
);

create or replace function public.assign_question_subtopics_v1(
  target_question uuid,
  target_topic uuid,
  subtopic_names text[],
  target_admin uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare subtopic_name text; normalized_name text; target_slug text; target_subtopic uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = target_admin and role = 'sys_admin' and disabled_at is null
  ) then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (
    select 1 from public.question_versions
    where question_id = target_question and topic_id = target_topic
  ) then raise exception 'QUESTION_TOPIC_MISMATCH'; end if;

  foreach subtopic_name in array coalesce(subtopic_names, array[]::text[]) loop
    normalized_name := trim(subtopic_name);
    if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
      raise exception 'INVALID_SUBTOPIC:%', subtopic_name;
    end if;
    target_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g'));
    if target_slug = '' then raise exception 'INVALID_SUBTOPIC:%', subtopic_name; end if;
    insert into public.subtopics(topic_id, slug, name)
      values(target_topic, target_slug, normalized_name)
      on conflict(topic_id, slug) do update set name = excluded.name
      returning id into target_subtopic;
    insert into public.question_subtopics(question_id, subtopic_id)
      values(target_question, target_subtopic)
      on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.update_subtopic_mastery_from_attempt()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_question uuid;
  success_delta numeric;
  evidence_delta numeric;
  unique_delta integer;
begin
  select question_id into target_question
  from public.question_versions where id = new.question_version_id;
  success_delta := coalesce((new.score_snapshot ->> 'masterySuccessDelta')::numeric, 0);
  evidence_delta := coalesce((new.score_snapshot ->> 'masteryEvidenceDelta')::numeric, 0);
  unique_delta := coalesce((new.score_snapshot ->> 'masteryUniqueDelta')::integer, 0);

  insert into public.user_subtopic_mastery(
    user_id, subtopic_id, weighted_successes, weighted_evidence, unique_questions,
    correct_attempts, total_attempts, assisted_correct_attempts, lifetime_points, updated_at
  )
  select
    new.user_id, qs.subtopic_id, success_delta, evidence_delta, unique_delta,
    case when new.correct then 1 else 0 end, 1,
    case when new.correct and new.assisted then 1 else 0 end,
    new.earned_points, now()
  from public.question_subtopics qs where qs.question_id = target_question
  on conflict(user_id, subtopic_id) do update set
    weighted_successes = public.user_subtopic_mastery.weighted_successes + excluded.weighted_successes,
    weighted_evidence = public.user_subtopic_mastery.weighted_evidence + excluded.weighted_evidence,
    unique_questions = public.user_subtopic_mastery.unique_questions + excluded.unique_questions,
    correct_attempts = public.user_subtopic_mastery.correct_attempts + excluded.correct_attempts,
    total_attempts = public.user_subtopic_mastery.total_attempts + 1,
    assisted_correct_attempts = public.user_subtopic_mastery.assisted_correct_attempts + excluded.assisted_correct_attempts,
    lifetime_points = public.user_subtopic_mastery.lifetime_points + excluded.lifetime_points,
    updated_at = now();
  return new;
end;
$$;

create trigger update_subtopic_mastery
  after insert on public.attempts
  for each row execute function public.update_subtopic_mastery_from_attempt();

alter table public.subtopics enable row level security;
alter table public.question_subtopics enable row level security;
alter table public.user_subtopic_mastery enable row level security;

create policy subtopics_read on public.subtopics for select to authenticated
  using (public.is_active_user() or public.is_sys_admin());
create policy subtopics_admin on public.subtopics for all to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy question_subtopics_read on public.question_subtopics for select to authenticated
  using (
    public.is_sys_admin() or (
      public.is_active_user() and exists (
        select 1 from public.question_versions qv
        where qv.question_id = question_id and qv.status = 'published'
      )
    )
  );
create policy question_subtopics_admin on public.question_subtopics for all to authenticated
  using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy subtopic_mastery_self_or_shared on public.user_subtopic_mastery for select to authenticated
  using (
    public.is_sys_admin() or (
      public.is_active_user() and (user_id = auth.uid() or public.shares_group(user_id))
    )
  );

grant select, insert, update, delete on public.subtopics, public.question_subtopics, public.user_subtopic_mastery to authenticated, service_role;
revoke all on function public.assign_question_subtopics_v1(uuid,uuid,text[],uuid) from public, anon, authenticated;
grant execute on function public.assign_question_subtopics_v1(uuid,uuid,text[],uuid) to service_role;
