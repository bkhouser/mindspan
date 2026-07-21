insert into public.packs (
  topic_id,
  slug,
  name,
  description,
  price_insight,
  is_starter,
  enabled
)
values
  (
    (select id from public.topics where slug = 'science-nature'),
    'body-of-knowledge',
    'Body of Knowledge',
    'Anatomy, physiology, medicine, nutrition, and the history of health.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'science-nature'),
    'wild-world',
    'Wild World',
    'Animals, plants, ecology, evolution, habitats, and conservation.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'science-nature'),
    'how-it-works',
    'How It Works',
    'Physics, engineering, inventions, machines, computing, and everyday technology.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'history'),
    'ancient-worlds',
    'Ancient Worlds',
    'Archaeology and civilizations across Africa, Asia, Europe, and the Americas.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'history'),
    'american-story',
    'The American Story',
    'Indigenous history, colonial America, government, social movements, and turning points.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'arts-literature'),
    'myth-and-legend',
    'Myth & Legend',
    'Gods, heroes, creatures, and traditional stories from cultures around the world.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'lifestyle-culture'),
    'at-the-table',
    'At the Table',
    'World cuisines, ingredients, cooking methods, drinks, and dining customs.',
    100,
    false,
    false
  ),
  (
    (select id from public.topics where slug = 'arts-literature'),
    'bookshelf-essentials',
    'Bookshelf Essentials',
    'Authors, characters, plots, poetry, genres, and influential books.',
    100,
    false,
    false
  )
on conflict (slug) do update set
  topic_id = excluded.topic_id,
  name = excluded.name,
  description = excluded.description,
  price_insight = excluded.price_insight,
  is_starter = excluded.is_starter,
  updated_at = now();
