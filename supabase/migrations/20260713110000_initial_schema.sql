create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'sys_admin');
create type public.group_role as enum ('member', 'admin');
create type public.play_mode as enum ('mixed', 'topic', 'pack');
create type public.question_status as enum ('draft', 'review', 'published', 'retired');
create type public.media_kind as enum ('image', 'audio', 'video');
create type public.assistance_kind as enum ('show_choices');
create type public.activity_kind as enum ('group_joined', 'played_today', 'achievement_earned', 'mastery_tier_up', 'pack_unlocked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New player' check (char_length(display_name) between 1 and 50),
  avatar_path text,
  role public.user_role not null default 'user',
  beta_access_granted_at timestamptz,
  age_confirmed boolean not null default false,
  onboarding_completed boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beta_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text not null,
  sort_order smallint not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text not null,
  price_insight integer not null default 0 check (price_insight >= 0),
  is_starter boolean not null default false,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status public.question_status not null default 'draft',
  prompt text not null check (char_length(prompt) between 5 and 1000),
  canonical_answer text not null,
  explanation text not null,
  details text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  time_limit_seconds smallint not null default 30 check (time_limit_seconds between 15 and 90),
  remove_leading_articles boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (question_id, version_number)
);

create unique index one_published_version_per_question
  on public.question_versions(question_id) where status = 'published';
create index question_versions_eligible_idx
  on public.question_versions(topic_id, difficulty, status, expires_at);

create table public.answer_aliases (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  answer text not null,
  normalized_answer text not null,
  unique (question_version_id, normalized_answer)
);

create table public.distractors (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  answer text not null,
  sort_order smallint not null check (sort_order between 1 and 3),
  unique (question_version_id, sort_order)
);

create table public.question_citations (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  label text not null,
  url text not null check (url ~ '^https://'),
  sort_order smallint not null default 1,
  unique (question_version_id, sort_order)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null,
  storage_path text not null unique,
  alt_text text not null,
  transcript text,
  attribution text not null,
  license text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  duration_seconds numeric(8, 2),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.question_media (
  question_version_id uuid primary key references public.question_versions(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict
);

create table public.pack_questions (
  pack_id uuid not null references public.packs(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (pack_id, question_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  avatar_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_memberships_user_idx on public.group_memberships(user_id, group_id);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer not null default 20 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode public.play_mode not null,
  topic_id uuid references public.topics(id) on delete set null,
  pack_id uuid references public.packs(id) on delete set null,
  question_count integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check ((mode = 'topic' and topic_id is not null) or (mode = 'pack' and pack_id is not null) or mode = 'mixed')
);

create table public.question_presentations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  started_at timestamptz not null default now(),
  media_ready_at timestamptz,
  loading_grace_expires_at timestamptz,
  expires_at timestamptz not null,
  starting_points integer not null check (starting_points >= 0),
  proficiency_snapshot numeric(8, 6) not null,
  prior_correct_count integer not null check (prior_correct_count >= 0),
  algorithm_version text not null,
  choices_revealed boolean not null default false,
  finalized_at timestamptz,
  sequence_number integer not null,
  unique (session_id, sequence_number)
);

create table public.assistance_events (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.question_presentations(id) on delete cascade,
  kind public.assistance_kind not null,
  point_factor numeric(5, 4) not null check (point_factor between 0 and 1),
  created_at timestamptz not null default now(),
  unique (presentation_id, kind)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null unique references public.question_presentations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  submitted_answer text,
  correct boolean not null,
  assisted boolean not null,
  timed_out boolean not null default false,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  remaining_ratio numeric(8, 6) not null check (remaining_ratio between 0 and 1),
  earned_points integer not null check (earned_points >= 0),
  score_snapshot jsonb not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index attempts_user_created_idx on public.attempts(user_id, created_at desc);

create table public.user_question_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  attempt_count integer not null default 0,
  correct_count integer not null default 0,
  last_correct boolean,
  next_review_at timestamptz,
  last_attempt_at timestamptz,
  last_session_sequence integer,
  primary key (user_id, question_id)
);
create index user_question_review_idx on public.user_question_state(user_id, next_review_at);

create table public.user_topic_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  weighted_successes numeric(14, 6) not null default 0,
  weighted_evidence numeric(14, 6) not null default 0,
  unique_questions integer not null default 0,
  correct_attempts integer not null default 0,
  total_attempts integer not null default 0,
  assisted_correct_attempts integer not null default 0,
  lifetime_points bigint not null default 0,
  tier text not null default 'unrated' check (tier in ('unrated', 'developing', 'proficient', 'expert', 'master')),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null unique references public.play_sessions(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'skipped')),
  topic_difficulties jsonb not null default '{}'::jsonb,
  response_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_run_id uuid not null references public.assessment_runs(id) on delete cascade,
  attempt_id uuid not null unique references public.attempts(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  ordinal integer not null check (ordinal between 1 and 32),
  unique (assessment_run_id, ordinal)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  evaluator_key text not null unique,
  insight_reward integer not null default 0 check (insight_reward >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete restrict,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.insight_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  source_type text not null check (source_type in ('achievement', 'pack_unlock', 'admin_adjustment')),
  source_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.pack_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id uuid not null references public.packs(id) on delete restrict,
  cost_insight integer not null check (cost_insight >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  kind public.activity_kind not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  event_day date generated always as ((created_at at time zone 'UTC')::date) stored
);
create index activity_events_feed_idx on public.activity_events(group_id, created_at desc, id desc);
create unique index activity_events_daily_play_unique
  on public.activity_events(group_id, actor_user_id, kind, event_day)
  where kind = 'played_today';

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('answer', 'wording', 'source', 'media', 'other')),
  details text not null check (char_length(details) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_active_user(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = check_user and p.disabled_at is null and p.beta_access_granted_at is not null);
$$;

create or replace function public.is_sys_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = check_user and p.role = 'sys_admin' and p.disabled_at is null);
$$;

create or replace function public.is_group_member(check_group uuid, check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user(check_user) and exists (select 1 from public.group_memberships gm where gm.group_id = check_group and gm.user_id = check_user);
$$;

create or replace function public.is_group_admin(check_group uuid, check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user(check_user) and exists (select 1 from public.group_memberships gm where gm.group_id = check_group and gm.user_id = check_user and gm.role = 'admin');
$$;

create or replace function public.shares_group(other_user uuid, check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user(check_user) and exists (
    select 1 from public.group_memberships mine
    join public.group_memberships theirs on theirs.group_id = mine.group_id
    where mine.user_id = check_user and theirs.user_id = other_user
  );
$$;

create or replace function public.create_group_with_admin(group_name text, group_description text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_group_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.groups(name, description, created_by) values (group_name, group_description, auth.uid()) returning id into new_group_id;
  insert into public.group_memberships(group_id, user_id, role) values (new_group_id, auth.uid(), 'admin');
  insert into public.activity_events(group_id, actor_user_id, kind, payload)
    values(new_group_id, auth.uid(), 'group_joined', jsonb_build_object('role', 'admin'));
  return new_group_id;
end;
$$;

create or replace function public.unlock_pack(target_pack uuid, request_key text)
returns integer language plpgsql security definer set search_path = '' as $$
declare pack_cost integer; current_balance integer;
begin
  if auth.uid() is null or not public.is_active_user() then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  select price_insight into pack_cost from public.packs where id = target_pack and enabled = true;
  if pack_cost is null then raise exception 'PACK_UNAVAILABLE'; end if;
  if exists (select 1 from public.pack_unlocks where user_id = auth.uid() and pack_id = target_pack) then
    select coalesce(sum(amount), 0)::integer into current_balance from public.insight_ledger where user_id = auth.uid();
    return current_balance;
  end if;
  select coalesce(sum(amount), 0)::integer into current_balance from public.insight_ledger where user_id = auth.uid();
  if current_balance < pack_cost then raise exception 'INSUFFICIENT_INSIGHT'; end if;
  insert into public.pack_unlocks(user_id, pack_id, cost_insight) values (auth.uid(), target_pack, pack_cost);
  insert into public.insight_ledger(user_id, amount, reason, source_type, source_id, idempotency_key)
    values (auth.uid(), -pack_cost, 'Pack unlock', 'pack_unlock', target_pack, request_key)
    on conflict (user_id, idempotency_key) do nothing;
  insert into public.activity_events(group_id, actor_user_id, kind, payload)
    select gm.group_id, auth.uid(), 'pack_unlocked', jsonb_build_object('pack_id', target_pack)
    from public.group_memberships gm where gm.user_id = auth.uid();
  return current_balance - pack_cost;
end;
$$;

create or replace function public.redeem_invite_for_user(raw_token text, target_user uuid)
returns table(granted boolean, joined_group uuid) language plpgsql security definer set search_path = '' as $$
declare hashed text; beta_id uuid; group_invite_id uuid; target_group uuid; inserted_count integer;
begin
  hashed := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  select id into beta_id from public.beta_invites
    where token_hash = hashed and revoked_at is null and expires_at > now() and use_count < max_uses for update;
  if beta_id is not null then
    update public.beta_invites set use_count = use_count + 1 where id = beta_id;
    update public.profiles set beta_access_granted_at = coalesce(beta_access_granted_at, now()) where id = target_user;
    return query select true, null::uuid;
    return;
  end if;

  select id, group_id into group_invite_id, target_group from public.group_invites
    where token_hash = hashed and revoked_at is null and expires_at > now() and use_count < max_uses for update;
  if group_invite_id is not null then
    update public.group_invites set use_count = use_count + 1 where id = group_invite_id;
    update public.profiles set beta_access_granted_at = coalesce(beta_access_granted_at, now()) where id = target_user;
    insert into public.group_memberships(group_id, user_id, role) values (target_group, target_user, 'member') on conflict do nothing;
    get diagnostics inserted_count = row_count;
    if inserted_count > 0 then
      insert into public.activity_events(group_id, actor_user_id, kind, payload)
        values(target_group, target_user, 'group_joined', '{}'::jsonb);
    end if;
    return query select true, target_group;
    return;
  end if;
  return query select false, null::uuid;
end;
$$;

create or replace function public.finalize_attempt_v1(
  target_presentation uuid, target_user uuid, target_question uuid, target_topic uuid,
  submitted text, was_correct boolean, was_assisted boolean, was_timeout boolean,
  elapsed integer, remaining numeric, points integer, snapshot jsonb, request_key uuid,
  success_delta numeric, evidence_delta numeric, unique_delta integer,
  new_correct_count integer, next_review timestamptz, new_tier text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.question_presentations%rowtype; attempt_id uuid; version_id uuid; previous_tier text;
begin
  select * into p from public.question_presentations where id = target_presentation for update;
  if p.id is null or p.user_id <> target_user then raise exception 'PRESENTATION_NOT_FOUND'; end if;
  select id into attempt_id from public.attempts where user_id = target_user and idempotency_key = request_key;
  if attempt_id is not null then return attempt_id; end if;
  if p.finalized_at is not null then raise exception 'PRESENTATION_FINALIZED'; end if;
  version_id := p.question_version_id;
  select tier into previous_tier from public.user_topic_mastery
    where user_id = target_user and topic_id = target_topic for update;
  insert into public.attempts(presentation_id,user_id,question_version_id,submitted_answer,correct,assisted,timed_out,elapsed_ms,remaining_ratio,earned_points,score_snapshot,idempotency_key)
    values(target_presentation,target_user,version_id,submitted,was_correct,was_assisted,was_timeout,elapsed,remaining,points,snapshot,request_key)
    returning id into attempt_id;
  update public.question_presentations set finalized_at = now() where id = target_presentation;
  update public.play_sessions set question_count = question_count + 1 where id = p.session_id;
  insert into public.user_question_state(user_id,question_id,attempt_count,correct_count,last_correct,next_review_at,last_attempt_at,last_session_sequence)
    values(target_user,target_question,1,new_correct_count,was_correct,next_review,now(),p.sequence_number)
    on conflict(user_id,question_id) do update set
      attempt_count = public.user_question_state.attempt_count + 1,
      correct_count = new_correct_count,
      last_correct = was_correct,
      next_review_at = next_review,
      last_attempt_at = now(),
      last_session_sequence = p.sequence_number;
  insert into public.user_topic_mastery(user_id,topic_id,weighted_successes,weighted_evidence,unique_questions,correct_attempts,total_attempts,assisted_correct_attempts,lifetime_points,tier,updated_at)
    values(target_user,target_topic,success_delta,evidence_delta,unique_delta,case when was_correct then 1 else 0 end,1,case when was_correct and was_assisted then 1 else 0 end,points,new_tier,now())
    on conflict(user_id,topic_id) do update set
      weighted_successes = public.user_topic_mastery.weighted_successes + success_delta,
      weighted_evidence = public.user_topic_mastery.weighted_evidence + evidence_delta,
      unique_questions = public.user_topic_mastery.unique_questions + unique_delta,
      correct_attempts = public.user_topic_mastery.correct_attempts + case when was_correct then 1 else 0 end,
      total_attempts = public.user_topic_mastery.total_attempts + 1,
      assisted_correct_attempts = public.user_topic_mastery.assisted_correct_attempts + case when was_correct and was_assisted then 1 else 0 end,
      lifetime_points = public.user_topic_mastery.lifetime_points + points,
      tier = new_tier,
      updated_at = now();
  insert into public.activity_events(group_id, actor_user_id, kind, payload)
    select gm.group_id, target_user, 'played_today', '{}'::jsonb
    from public.group_memberships gm where gm.user_id = target_user
    on conflict do nothing;
  if (case coalesce(previous_tier, 'unrated')
      when 'unrated' then 0 when 'developing' then 1 when 'proficient' then 2 when 'expert' then 3 else 4 end)
    < (case new_tier
      when 'unrated' then 0 when 'developing' then 1 when 'proficient' then 2 when 'expert' then 3 else 4 end) then
    insert into public.activity_events(group_id, actor_user_id, kind, payload)
      select gm.group_id, target_user, 'mastery_tier_up',
        jsonb_build_object('topic_id', target_topic, 'tier', new_tier)
      from public.group_memberships gm where gm.user_id = target_user;
  end if;
  return attempt_id;
end;
$$;

create or replace function public.award_achievement_v1(target_user uuid, evaluator text)
returns table(slug text, name text, insight_awarded integer) language plpgsql security definer set search_path = '' as $$
declare achievement_row public.achievements%rowtype; inserted_count integer;
begin
  select * into achievement_row from public.achievements where evaluator_key = evaluator and enabled = true;
  if achievement_row.id is null then return; end if;
  insert into public.user_achievements(user_id, achievement_id) values(target_user, achievement_row.id) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return; end if;
  if achievement_row.insight_reward > 0 then
    insert into public.insight_ledger(user_id, amount, reason, source_type, source_id, idempotency_key)
      values(target_user, achievement_row.insight_reward, achievement_row.name, 'achievement', achievement_row.id, 'achievement:' || achievement_row.id::text)
      on conflict do nothing;
  end if;
  insert into public.activity_events(group_id, actor_user_id, kind, payload)
    select gm.group_id, target_user, 'achievement_earned', jsonb_build_object('achievement_id', achievement_row.id, 'name', achievement_row.name)
    from public.group_memberships gm where gm.user_id = target_user;
  return query select achievement_row.slug, achievement_row.name, achievement_row.insight_reward;
end;
$$;

create or replace function public.import_question_batch_v1(payload jsonb, target_admin uuid)
returns table(question_id uuid, version_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  item jsonb; target_topic uuid; q_id uuid; v_id uuid;
  inserted_packs integer; requested_packs integer;
begin
  if not exists (select 1 from public.profiles where id = target_admin and role = 'sys_admin' and disabled_at is null) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) = 0 then raise exception 'EMPTY_BATCH'; end if;
  for item in select value from jsonb_array_elements(payload) loop
    select id into target_topic from public.topics where slug = item ->> 'topicSlug' and enabled = true;
    if target_topic is null then raise exception 'UNKNOWN_TOPIC:%', item ->> 'topicSlug'; end if;
    if exists (
      select 1 from public.question_versions existing
      where existing.topic_id = target_topic and existing.status in ('draft', 'review', 'published')
        and lower(trim(existing.prompt)) = lower(trim(item ->> 'prompt'))
        and lower(trim(existing.canonical_answer)) = lower(trim(item ->> 'canonicalAnswer'))
    ) then raise exception 'DUPLICATE_QUESTION:%', item ->> 'prompt'; end if;

    insert into public.questions default values returning id into q_id;
    insert into public.question_versions(
      question_id, topic_id, version_number, status, prompt, canonical_answer, explanation, details,
      difficulty, time_limit_seconds, remove_leading_articles, verified_at, expires_at, created_by
    ) values (
      q_id, target_topic, 1, 'review', item ->> 'prompt', item ->> 'canonicalAnswer',
      item ->> 'explanation', item ->> 'details', (item ->> 'difficulty')::smallint,
      coalesce((item ->> 'timeLimitSeconds')::smallint, 30),
      coalesce((item ->> 'removeLeadingArticles')::boolean, false), now(),
      nullif(item ->> 'expiresAt', '')::timestamptz, target_admin
    ) returning id into v_id;

    insert into public.answer_aliases(question_version_id, answer, normalized_answer)
    select v_id, candidate, lower(regexp_replace(candidate, '[^[:alnum:]]+', '', 'g'))
    from (
      select item ->> 'canonicalAnswer' as candidate
      union
      select value from jsonb_array_elements_text(coalesce(item -> 'aliases', '[]'::jsonb))
    ) accepted;
    insert into public.distractors(question_version_id, answer, sort_order)
      select v_id, value, ordinality::smallint
      from jsonb_array_elements_text(item -> 'distractors') with ordinality;
    insert into public.question_citations(question_version_id, label, url)
      values(v_id, item #>> '{source,label}', item #>> '{source,url}');

    requested_packs := jsonb_array_length(item -> 'packSlugs');
    insert into public.pack_questions(pack_id, question_id)
      select p.id, q_id from public.packs p
      where p.slug in (select value from jsonb_array_elements_text(item -> 'packSlugs'));
    get diagnostics inserted_packs = row_count;
    if inserted_packs <> requested_packs then raise exception 'UNKNOWN_OR_DUPLICATE_PACK'; end if;

    insert into public.admin_audit_log(actor_user_id, action, target_table, target_id, after_data)
      values(target_admin, 'question.imported', 'question_versions', v_id, jsonb_build_object('status', 'review'));
    return query select q_id, v_id;
  end loop;
end;
$$;

create or replace function public.prevent_last_group_admin_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') and
    (select count(*) from public.group_memberships where group_id = old.group_id and role = 'admin') <= 1
  then raise exception 'GROUP_REQUIRES_ADMIN'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger preserve_group_admin before update of role or delete on public.group_memberships
  for each row execute function public.prevent_last_group_admin_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New player'));
  insert into public.pack_unlocks(user_id, pack_id, cost_insight)
    select new.id, p.id, 0 from public.packs p where p.is_starter = true
    on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.beta_invites enable row level security;
alter table public.topics enable row level security;
alter table public.user_interests enable row level security;
alter table public.packs enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.answer_aliases enable row level security;
alter table public.distractors enable row level security;
alter table public.question_citations enable row level security;
alter table public.media_assets enable row level security;
alter table public.question_media enable row level security;
alter table public.pack_questions enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.group_invites enable row level security;
alter table public.play_sessions enable row level security;
alter table public.question_presentations enable row level security;
alter table public.assistance_events enable row level security;
alter table public.attempts enable row level security;
alter table public.user_question_state enable row level security;
alter table public.user_topic_mastery enable row level security;
alter table public.assessment_runs enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.insight_ledger enable row level security;
alter table public.pack_unlocks enable row level security;
alter table public.activity_events enable row level security;
alter table public.question_reports enable row level security;
alter table public.admin_audit_log enable row level security;

create policy profiles_self on public.profiles for all using (id = auth.uid() and public.is_active_user()) with check (id = auth.uid() and public.is_active_user());
create policy profiles_shared_read on public.profiles for select using ((public.is_active_user() and public.shares_group(id)) or public.is_sys_admin());
create policy admin_profiles on public.profiles for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy admin_beta_invites on public.beta_invites for all using (public.is_sys_admin()) with check (public.is_sys_admin());

create policy authenticated_topics on public.topics for select to authenticated using ((enabled and public.is_active_user()) or public.is_sys_admin());
create policy admin_topics on public.topics for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy own_interests on public.user_interests for all using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user());
create policy authenticated_packs on public.packs for select to authenticated using ((enabled and public.is_active_user()) or public.is_sys_admin());
create policy admin_packs on public.packs for all using (public.is_sys_admin()) with check (public.is_sys_admin());

create policy published_question_versions on public.question_versions for select to authenticated
  using ((status = 'published' and (expires_at is null or expires_at > now()) and public.is_active_user()) or public.is_sys_admin());
create policy admin_questions on public.questions for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy admin_question_versions on public.question_versions for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy admin_answer_aliases on public.answer_aliases for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy admin_distractors on public.distractors for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy citations_for_published on public.question_citations for select to authenticated using (
  (public.is_active_user() and exists (select 1 from public.question_versions qv where qv.id = question_version_id and qv.status = 'published')) or public.is_sys_admin());
create policy admin_citations on public.question_citations for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy authenticated_media_metadata on public.media_assets for select to authenticated using (public.is_active_user());
create policy admin_media on public.media_assets for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy authenticated_question_media on public.question_media for select to authenticated using (public.is_active_user());
create policy admin_question_media on public.question_media for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy authenticated_pack_questions on public.pack_questions for select to authenticated using (public.is_active_user());
create policy admin_pack_questions on public.pack_questions for all using (public.is_sys_admin()) with check (public.is_sys_admin());

create policy group_read on public.groups for select using (public.is_group_member(id) or public.is_sys_admin());
create policy group_admin_update on public.groups for update using (public.is_group_admin(id) or public.is_sys_admin()) with check (public.is_group_admin(id) or public.is_sys_admin());
create policy membership_read on public.group_memberships for select using (public.is_group_member(group_id) or public.is_sys_admin());
create policy membership_admin on public.group_memberships for all using (public.is_group_admin(group_id) or public.is_sys_admin()) with check (public.is_group_admin(group_id) or public.is_sys_admin());
create policy group_invite_admin on public.group_invites for all using (public.is_group_admin(group_id) or public.is_sys_admin()) with check (public.is_group_admin(group_id) or public.is_sys_admin());

create policy own_sessions on public.play_sessions for all using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user());
create policy own_presentations on public.question_presentations for select using ((user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());
create policy own_assistance on public.assistance_events for select using ((public.is_active_user() and exists (select 1 from public.question_presentations qp where qp.id = presentation_id and qp.user_id = auth.uid())) or public.is_sys_admin());
create policy own_attempts on public.attempts for select using ((user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());
create policy own_question_state on public.user_question_state for select using ((user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());
create policy mastery_self_or_shared on public.user_topic_mastery for select using ((public.is_active_user() and (user_id = auth.uid() or public.shares_group(user_id))) or public.is_sys_admin());
create policy own_assessments on public.assessment_runs for all using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user());
create policy own_assessment_responses on public.assessment_responses for select using ((public.is_active_user() and exists (select 1 from public.assessment_runs ar where ar.id = assessment_run_id and ar.user_id = auth.uid())) or public.is_sys_admin());

create policy authenticated_achievements on public.achievements for select to authenticated using ((enabled and public.is_active_user()) or public.is_sys_admin());
create policy admin_achievements on public.achievements for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy achievements_self_or_shared on public.user_achievements for select using ((public.is_active_user() and (user_id = auth.uid() or public.shares_group(user_id))) or public.is_sys_admin());
create policy own_insight on public.insight_ledger for select using ((user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());
create policy unlocks_self_or_shared on public.pack_unlocks for select using ((public.is_active_user() and (user_id = auth.uid() or public.shares_group(user_id))) or public.is_sys_admin());
create policy group_activity on public.activity_events for select using (public.is_group_member(group_id) or public.is_sys_admin());
create policy own_reports_insert on public.question_reports for insert with check (reporter_user_id = auth.uid() and public.is_active_user());
create policy own_reports_read on public.question_reports for select using ((reporter_user_id = auth.uid() and public.is_active_user()) or public.is_sys_admin());
create policy admin_reports on public.question_reports for all using (public.is_sys_admin()) with check (public.is_sys_admin());
create policy admin_audit on public.admin_audit_log for select using (public.is_sys_admin());

create policy avatars_read on storage.objects for select to authenticated using (bucket_id = 'avatars' and public.is_active_user());
create policy avatar_owner_write on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and public.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and public.is_active_user() and (storage.foldername(name))[1] = auth.uid()::text);
create policy question_media_read on storage.objects for select to authenticated using (bucket_id = 'question-media' and public.is_active_user());
create policy question_media_admin on storage.objects for all to authenticated
  using (bucket_id = 'question-media' and public.is_sys_admin())
  with check (bucket_id = 'question-media' and public.is_sys_admin());

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke all on function public.is_active_user(uuid) from public;
revoke all on function public.is_sys_admin(uuid) from public;
revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_admin(uuid, uuid) from public;
revoke all on function public.shares_group(uuid, uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated, service_role;
grant execute on function public.is_sys_admin(uuid) to authenticated, service_role;
grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated, service_role;
grant execute on function public.shares_group(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_group_with_admin(text, text) to authenticated;
grant execute on function public.unlock_pack(uuid, text) to authenticated;
revoke all on function public.redeem_invite_for_user(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_invite_for_user(text, uuid) to service_role;
revoke all on function public.finalize_attempt_v1(uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,integer,numeric,integer,jsonb,uuid,numeric,numeric,integer,integer,timestamptz,text) from public, anon, authenticated;
grant execute on function public.finalize_attempt_v1(uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,integer,numeric,integer,jsonb,uuid,numeric,numeric,integer,integer,timestamptz,text) to service_role;
revoke all on function public.award_achievement_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.award_achievement_v1(uuid,text) to service_role;
revoke all on function public.import_question_batch_v1(jsonb,uuid) from public, anon, authenticated;
grant execute on function public.import_question_batch_v1(jsonb,uuid) to service_role;

revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update(display_name, avatar_path, age_confirmed, onboarding_completed, updated_at) on public.profiles to authenticated;
