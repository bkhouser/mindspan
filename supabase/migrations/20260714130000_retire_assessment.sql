-- Retire the optional assessment without deleting historical runs, responses,
-- attempts, earned achievements, Insight awards, or mastery.
update public.achievements
set enabled = false
where slug = 'assessment-complete';

-- Anyone who was partway through the retired flow should enter the normal app
-- with all answers and mastery retained.
update public.profiles as profile
set onboarding_completed = true,
    updated_at = now()
where profile.onboarding_completed = false
  and exists (
    select 1
    from public.assessment_runs as run
    where run.user_id = profile.id
      and run.status = 'active'
  );

-- Disabled achievements are normally hidden. Preserve a legacy earned award in
-- its owner's achievement history without exposing other retired definitions.
drop policy if exists authenticated_achievements on public.achievements;
create policy authenticated_achievements
  on public.achievements
  for select
  to authenticated
  using (
    (
      public.is_active_user()
      and (
        enabled
        or exists (
          select 1
          from public.user_achievements as award
          where award.achievement_id = achievements.id
            and award.user_id = auth.uid()
        )
      )
    )
    or public.is_sys_admin()
  );
