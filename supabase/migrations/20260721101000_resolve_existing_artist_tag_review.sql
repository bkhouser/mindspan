-- The requested Artists detail tag was already present on this exact reviewed
-- version. Resolve that single note without publishing a no-op question copy.
insert into public.question_editorial_reviews(
  question_version_id,
  reviewed_by,
  verdict,
  notes,
  review_origin,
  created_at,
  updated_at
)
select
  qv.id,
  null,
  'approved',
  'Confirmed the existing reviewer-only Artists detail tag; no question revision was needed.',
  'catalog',
  now(),
  now()
from public.question_versions qv
where qv.status = 'published'
  and qv.editorial_key = 'seed.arts-literature.ed546f52e29186c34fd12ac5adcd0a3d'
  and qv.editorial_content_hash = 'd5f4987933d30e379b4a904065c2f6dd'
on conflict (question_version_id) do update
set reviewed_by = excluded.reviewed_by,
    verdict = excluded.verdict,
    notes = excluded.notes,
    review_origin = excluded.review_origin,
    updated_at = excluded.updated_at;
