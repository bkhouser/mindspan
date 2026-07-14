do $$
declare
  old_constraint text;
begin
  select conname
  into old_constraint
  from pg_constraint
  where conrelid = 'public.question_feedback'::regclass
    and contype = 'c'
    and position('<@' in pg_get_constraintdef(oid)) > 0
  limit 1;

  if old_constraint is not null then
    execute format(
      'alter table public.question_feedback drop constraint %I',
      old_constraint
    );
  end if;
end;
$$;

alter table public.question_feedback
  add constraint question_feedback_reason_values_check
  check (
    reasons <@ array[
      'incorrect_answer',
      'should_have_been_accepted',
      'unclear',
      'difficulty',
      'weak_explanation',
      'poor_choices',
      'typo',
      'outdated',
      'media',
      'other'
    ]::text[]
  );
