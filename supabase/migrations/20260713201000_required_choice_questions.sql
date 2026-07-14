alter table public.question_versions
  add column answer_mode text not null default 'recall'
  check (answer_mode in ('recall', 'required_choice'));

comment on column public.question_versions.answer_mode is
  'Recall questions begin with typed input; required-choice questions present all choices immediately at half value.';

update public.question_versions
set answer_mode = 'required_choice'
where prompt ~* '(which (of (the following|these)|one of (the following|these)))';
