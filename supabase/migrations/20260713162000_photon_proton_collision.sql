update public.distractors d
set answer = 'Proton'
from public.question_versions qv
where d.question_version_id = qv.id
  and qv.prompt = 'What elementary particle carries the electromagnetic force?'
  and d.answer = 'Muon';
