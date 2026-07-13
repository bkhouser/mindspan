with labels(prompt, subtopic_name) as (values
  ('What chemical symbol represents gold?', 'Periodic Table'),
  ('What is the largest planet in our solar system?', 'Astronomy'),
  ('What process lets plants convert light energy into chemical energy?', 'Botany'),
  ('What elementary particle carries the electromagnetic force?', 'Particle Physics'),
  ('Which element has atomic number 74?', 'Periodic Table'),
  ('Who was the first president of the United States?', 'United States History'),
  ('Which civilization built Machu Picchu?', 'Inca Civilization'),
  ('In what year was Magna Carta first sealed?', 'Medieval Europe'),
  ('What collective name is given to the 1648 treaties that ended the Thirty Years’ War?', 'Early Modern Europe'),
  ('Which Byzantine emperor ordered the compilation now called the Corpus Juris Civilis?', 'Byzantine Empire'),
  ('What is the capital of Japan?', 'World Capitals'),
  ('Which continent contains the South Pole?', 'Polar Geography'),
  ('Which country is completely surrounded by South Africa?', 'African Geography'),
  ('What strait separates southern Spain from northern Morocco?', 'Straits and Waterways'),
  ('What is the world’s largest island that is not considered a continent?', 'Islands'),
  ('How many players from one team are normally on the field in association football?', 'Association Football'),
  ('Which tennis Grand Slam tournament is played on clay courts?', 'Tennis'),
  ('Who scored 100 points in a single NBA game in 1962?', 'Basketball'),
  ('In cricket, how many stumps make up one wicket?', 'Cricket'),
  ('Which trophy is awarded to the National Hockey League playoff champion?', 'Ice Hockey'),
  ('Who painted the Mona Lisa?', 'Renaissance Art'),
  ('Who wrote the novel Nineteen Eighty-Four?', 'Fiction'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Who wrote the epic poem Paradise Lost?', 'Poetry'),
  ('What architectural support transfers a roof’s lateral thrust to an exterior pier?', 'Architecture'),
  ('Who directed the 1975 film Jaws?', 'Film Directors'),
  ('Wakanda is the home country of which Marvel hero?', 'Superhero Films'),
  ('Which 1927 film is widely credited with popularizing synchronized dialogue in feature films?', 'Film History'),
  ('Who directed the 1954 film Seven Samurai?', 'World Cinema'),
  ('Which cinematographer shot Blade Runner 2049 and 1917?', 'Cinematography'),
  ('How many strings does a standard violin have?', 'String Instruments'),
  ('Which band recorded Bohemian Rhapsody?', 'Rock Music'),
  ('How many numbered symphonies did Ludwig van Beethoven complete?', 'Classical Music'),
  ('How many numbered symphonies did Ludwig van Beethoven complete?', 'Symphonies'),
  ('What term describes a recurring musical idea associated with a person, place, or concept?', 'Music Theory'),
  ('Who was the principal artist on the 1959 jazz album Kind of Blue?', 'Jazz'),
  ('What grain is traditionally used to make risotto?', 'Italian Cuisine'),
  ('On which color square does the queen begin a game of chess?', 'Board Games'),
  ('What does the Japanese word sushi primarily refer to?', 'Japanese Cuisine'),
  ('Which microorganisms drive the fermentation of traditional sauerkraut?', 'Fermentation'),
  ('In the board game Go, what term describes a single empty point inside a surrounded group?', 'Board Games')
),
resolved as (
  select qv.question_id, qv.topic_id, labels.subtopic_name,
    trim(both '-' from regexp_replace(lower(labels.subtopic_name), '[^a-z0-9]+', '-', 'g')) as subtopic_slug
  from labels join public.question_versions qv on qv.prompt = labels.prompt
)
insert into public.subtopics(topic_id, slug, name)
select distinct topic_id, subtopic_slug, subtopic_name from resolved
on conflict(topic_id, slug) do nothing;

with labels(prompt, subtopic_name) as (values
  ('What chemical symbol represents gold?', 'Periodic Table'),
  ('What is the largest planet in our solar system?', 'Astronomy'),
  ('What process lets plants convert light energy into chemical energy?', 'Botany'),
  ('What elementary particle carries the electromagnetic force?', 'Particle Physics'),
  ('Which element has atomic number 74?', 'Periodic Table'),
  ('Who was the first president of the United States?', 'United States History'),
  ('Which civilization built Machu Picchu?', 'Inca Civilization'),
  ('In what year was Magna Carta first sealed?', 'Medieval Europe'),
  ('What collective name is given to the 1648 treaties that ended the Thirty Years’ War?', 'Early Modern Europe'),
  ('Which Byzantine emperor ordered the compilation now called the Corpus Juris Civilis?', 'Byzantine Empire'),
  ('What is the capital of Japan?', 'World Capitals'),
  ('Which continent contains the South Pole?', 'Polar Geography'),
  ('Which country is completely surrounded by South Africa?', 'African Geography'),
  ('What strait separates southern Spain from northern Morocco?', 'Straits and Waterways'),
  ('What is the world’s largest island that is not considered a continent?', 'Islands'),
  ('How many players from one team are normally on the field in association football?', 'Association Football'),
  ('Which tennis Grand Slam tournament is played on clay courts?', 'Tennis'),
  ('Who scored 100 points in a single NBA game in 1962?', 'Basketball'),
  ('In cricket, how many stumps make up one wicket?', 'Cricket'),
  ('Which trophy is awarded to the National Hockey League playoff champion?', 'Ice Hockey'),
  ('Who painted the Mona Lisa?', 'Renaissance Art'),
  ('Who wrote the novel Nineteen Eighty-Four?', 'Fiction'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Who wrote the epic poem Paradise Lost?', 'Poetry'),
  ('What architectural support transfers a roof’s lateral thrust to an exterior pier?', 'Architecture'),
  ('Who directed the 1975 film Jaws?', 'Film Directors'),
  ('Wakanda is the home country of which Marvel hero?', 'Superhero Films'),
  ('Which 1927 film is widely credited with popularizing synchronized dialogue in feature films?', 'Film History'),
  ('Who directed the 1954 film Seven Samurai?', 'World Cinema'),
  ('Which cinematographer shot Blade Runner 2049 and 1917?', 'Cinematography'),
  ('How many strings does a standard violin have?', 'String Instruments'),
  ('Which band recorded Bohemian Rhapsody?', 'Rock Music'),
  ('How many numbered symphonies did Ludwig van Beethoven complete?', 'Classical Music'),
  ('How many numbered symphonies did Ludwig van Beethoven complete?', 'Symphonies'),
  ('What term describes a recurring musical idea associated with a person, place, or concept?', 'Music Theory'),
  ('Who was the principal artist on the 1959 jazz album Kind of Blue?', 'Jazz'),
  ('What grain is traditionally used to make risotto?', 'Italian Cuisine'),
  ('On which color square does the queen begin a game of chess?', 'Board Games'),
  ('What does the Japanese word sushi primarily refer to?', 'Japanese Cuisine'),
  ('Which microorganisms drive the fermentation of traditional sauerkraut?', 'Fermentation'),
  ('In the board game Go, what term describes a single empty point inside a surrounded group?', 'Board Games')
)
insert into public.question_subtopics(question_id, subtopic_id)
select distinct qv.question_id, st.id
from labels
join public.question_versions qv on qv.prompt = labels.prompt
join public.subtopics st on st.topic_id = qv.topic_id and st.slug =
  trim(both '-' from regexp_replace(lower(labels.subtopic_name), '[^a-z0-9]+', '-', 'g'))
on conflict do nothing;
