alter table public.question_feedback
  drop constraint if exists question_feedback_reason_values_check;

alter table public.question_feedback
  add constraint question_feedback_reason_values_check
  check (
    reasons <@ array[
      'incorrect_answer',
      'should_have_been_accepted',
      'wrong_topic',
      'answer_given_away',
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
