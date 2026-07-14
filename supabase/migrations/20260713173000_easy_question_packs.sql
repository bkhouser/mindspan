insert into public.packs (
  topic_id,
  slug,
  name,
  description,
  price_insight,
  is_starter,
  enabled
) values
  (
    null,
    'easy-does-it',
    'Easy Does It',
    'A welcoming mixed-topic collection of familiar facts and confidence-building questions.',
    0,
    true,
    true
  ),
  (
    null,
    'trivia-101',
    'Trivia 101',
    'Another approachable mixed-topic collection for warming up and widening your base.',
    100,
    false,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_insight = excluded.price_insight,
  is_starter = excluded.is_starter,
  enabled = excluded.enabled;

insert into public.pack_unlocks (user_id, pack_id, cost_insight)
select profiles.id, packs.id, 0
from public.profiles
cross join public.packs
where packs.slug = 'easy-does-it'
on conflict (user_id, pack_id) do nothing;
