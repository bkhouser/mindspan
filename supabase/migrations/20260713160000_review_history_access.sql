-- Players may review the immutable content they previously answered even
-- after an administrator retires or supersedes that question version.
create policy own_attempt_question_versions
  on public.question_versions
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.attempts a
      where a.question_version_id = question_versions.id
        and a.user_id = auth.uid()
    )
  );

create policy own_attempt_question_citations
  on public.question_citations
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.attempts a
      where a.question_version_id = question_citations.question_version_id
        and a.user_id = auth.uid()
    )
  );
