-- Production's original seed questions received editorial fingerprints before
-- their normalized taxonomy was finalized. Recompute only the fingerprint
-- metadata from each current published seed version's stored content. Stable
-- editorial keys, question/version identities, content, reviews, attempts,
-- scores, and progression remain unchanged.
create or replace function public.refresh_seed_editorial_fingerprints_v1()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  with seed_fingerprints as (
    select
      qv.id version_id,
      md5(
        jsonb_build_object(
          'topic', t.slug,
          'prompt', qv.prompt,
          'canonicalAnswer', qv.canonical_answer,
          'answerMode', qv.answer_mode,
          'aliases', coalesce((
            select jsonb_agg(aa.answer order by aa.normalized_answer, aa.answer)
            from public.answer_aliases aa
            where aa.question_version_id = qv.id
          ), '[]'::jsonb),
          'distractors', coalesce((
            select jsonb_agg(d.answer order by d.sort_order, d.answer)
            from public.distractors d
            where d.question_version_id = qv.id
          ), '[]'::jsonb),
          'explanation', qv.explanation,
          'details', qv.details,
          'difficulty', qv.difficulty,
          'timeLimitSeconds', qv.time_limit_seconds,
          'removeLeadingArticles', qv.remove_leading_articles,
          'expiresAt', qv.expires_at,
          'packs', coalesce((
            select jsonb_agg(p.slug order by p.slug)
            from public.pack_questions pq
            join public.packs p on p.id = pq.pack_id
            where pq.question_id = qv.question_id
          ), '[]'::jsonb),
          'subtopics', coalesce((
            select jsonb_agg(s.slug order by s.slug)
            from public.question_subtopics qs
            join public.subtopics s on s.id = qs.subtopic_id
            where qs.question_id = qv.question_id
          ), '[]'::jsonb),
          'citations', coalesce((
            select jsonb_agg(
              jsonb_build_object('label', qc.label, 'url', qc.url)
              order by qc.sort_order, qc.label, qc.url
            )
            from public.question_citations qc
            where qc.question_version_id = qv.id
          ), '[]'::jsonb)
        )::text
      ) expected_hash
    from public.questions q
    join public.question_versions qv
      on qv.question_id = q.id and qv.status = 'published'
    join public.topics t on t.id = qv.topic_id
    where q.catalog_key is null
      and q.retired_at is null
  )
  update public.question_versions qv
  set editorial_content_hash = sf.expected_hash
  from seed_fingerprints sf
  where qv.id = sf.version_id
    and qv.editorial_content_hash is distinct from sf.expected_hash;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.refresh_seed_editorial_fingerprints_v1()
  from public, anon, authenticated;
grant execute on function public.refresh_seed_editorial_fingerprints_v1()
  to service_role;

select public.refresh_seed_editorial_fingerprints_v1();
