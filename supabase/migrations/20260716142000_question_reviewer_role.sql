alter type public.user_role
  add value if not exists 'question_reviewer' before 'sys_admin';
