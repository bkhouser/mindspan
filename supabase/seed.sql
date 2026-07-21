insert into public.topics (slug, name, description, sort_order) values
  ('science-nature', 'Science & Nature', 'Physics, chemistry, biology, astronomy, and the natural world.', 1),
  ('history', 'History', 'People, events, civilizations, and turning points across time.', 2),
  ('geography', 'Geography', 'Countries, capitals, landscapes, borders, and places.', 3),
  ('sports', 'Sports', 'Rules, records, athletes, teams, and competitions.', 4),
  ('arts-literature', 'Arts & Literature', 'Visual art, architecture, books, poetry, and drama.', 5),
  ('film-television', 'Film & Television', 'Movies, series, performers, creators, and screen history.', 6),
  ('music', 'Music', 'Artists, instruments, theory, recordings, and musical history.', 7),
  ('lifestyle-culture', 'Lifestyle & Culture', 'Food, games, customs, language, and everyday culture.', 8)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.packs (topic_id, slug, name, description, price_insight, is_starter, enabled)
select id, slug || '-starter', name || ' Starter', 'A broad foundation across five difficulty levels.', 0, true, true from public.topics
on conflict (slug) do update set enabled = true;

insert into public.packs (topic_id, slug, name, description, price_insight, is_starter, enabled) values
  ((select id from public.topics where slug = 'science-nature'), 'space-and-beyond', 'Space & Beyond', 'Astronomy, spaceflight, and our place in the cosmos.', 100, false, true),
  ((select id from public.topics where slug = 'history'), 'world-turning-points', 'World Turning Points', 'Events that reshaped nations and societies.', 100, false, true),
  ((select id from public.topics where slug = 'arts-literature'), 'masterworks', 'Masterworks', 'Landmark works and the people behind them.', 100, false, true),
  ((select id from public.topics where slug = 'music'), 'sound-and-song', 'Sound & Song', 'Genres, instruments, recordings, and performance.', 100, false, true)
on conflict (slug) do update set enabled = true, price_insight = excluded.price_insight;

insert into public.packs (topic_id, slug, name, description, price_insight, is_starter, enabled) values
  (null, 'easy-does-it', 'Easy Does It', 'A welcoming mixed-topic collection of familiar facts and confidence-building questions.', 0, true, true),
  (null, 'trivia-101', 'Trivia 101', 'Another approachable mixed-topic collection for warming up and widening your base.', 100, false, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_insight = excluded.price_insight,
  is_starter = excluded.is_starter,
  enabled = true;

insert into public.achievements (slug, name, description, evaluator_key, insight_reward) values
  ('onboarded', 'Mind Mapper', 'Complete onboarding and choose your interests.', 'onboarding_complete', 25),
  ('ten-answers', 'Getting Warmed Up', 'Answer 10 questions.', 'attempts_10', 25),
  ('five-topics', 'Curious Mind', 'Attempt questions in five different topics.', 'topics_5', 50),
  ('topic-tier', 'Building Expertise', 'Reach Proficient in any topic.', 'tier_proficient', 50),
  ('hard-ten', 'Deep Cuts', 'Correctly answer 10 difficulty-four-or-five questions.', 'hard_correct_10', 50),
  ('broad-five', 'Wide Mindspan', 'Become ranked in five topics.', 'ranked_topics_5', 100)
on conflict (slug) do update set name = excluded.name, description = excluded.description, insight_reward = excluded.insight_reward, enabled = true;

insert into public.achievements (slug, name, description, evaluator_key, insight_reward) values
  ('twenty-five-answers', 'Finding a Rhythm', 'Answer 25 questions.', 'attempts_25', 25),
  ('fifty-answers', 'Trivia Regular', 'Answer 50 questions.', 'attempts_50', 50),
  ('one-hundred-answers', 'Century Club', 'Answer 100 questions.', 'attempts_100', 75),
  ('two-fifty-answers', 'Knowledge Builder', 'Answer 250 questions.', 'attempts_250', 100),
  ('five-hundred-answers', 'Mindspan Marathon', 'Answer 500 questions.', 'attempts_500', 150),
  ('one-thousand-answers', 'Grand Archive', 'Answer 1,000 questions.', 'attempts_1000', 250),
  ('three-login-days', 'Back for More', 'Visit Mindspan on 3 different days.', 'login_days_3', 15),
  ('seven-login-days', 'Week of Wonder', 'Visit Mindspan on 7 different days.', 'login_days_7', 25),
  ('thirty-login-days', 'Familiar Face', 'Visit Mindspan on 30 different days.', 'login_days_30', 75),
  ('one-hundred-login-days', 'Mindspan Habit', 'Visit Mindspan on 100 different days.', 'login_days_100', 150),
  ('science-nature-proficient', 'Science Sleuth', 'Reach Proficient in Science & Nature.', 'topic_proficient:science-nature', 50),
  ('history-proficient', 'History Buff', 'Reach Proficient in History.', 'topic_proficient:history', 50),
  ('geography-proficient', 'Atlas Mind', 'Reach Proficient in Geography.', 'topic_proficient:geography', 50),
  ('sports-proficient', 'Sports Savant', 'Reach Proficient in Sports.', 'topic_proficient:sports', 50),
  ('arts-literature-proficient', 'Culture Curator', 'Reach Proficient in Arts & Literature.', 'topic_proficient:arts-literature', 50),
  ('film-television-proficient', 'Screen Scholar', 'Reach Proficient in Film & Television.', 'topic_proficient:film-television', 50),
  ('music-proficient', 'Music Maven', 'Reach Proficient in Music.', 'topic_proficient:music', 50),
  ('lifestyle-culture-proficient', 'Culture Connoisseur', 'Reach Proficient in Lifestyle & Culture.', 'topic_proficient:lifestyle-culture', 50)
on conflict (slug) do update set name = excluded.name, description = excluded.description, evaluator_key = excluded.evaluator_key, insight_reward = excluded.insight_reward, enabled = true;

do $seed$
begin
drop table if exists public.mindspan_seed_questions;
create table public.mindspan_seed_questions (
  question_id uuid default gen_random_uuid(), version_id uuid default gen_random_uuid(), topic_slug text,
  prompt text, answer text, aliases text[], distractors text[], explanation text, details text,
  difficulty smallint, source_label text, source_url text
);

insert into public.mindspan_seed_questions(topic_slug, prompt, answer, aliases, distractors, explanation, details, difficulty, source_label, source_url) values
('science-nature','What chemical symbol represents gold?','Au',array['gold','Au'],array['Ag','Fe','Gd'],'Gold uses the chemical symbol Au.','The symbol comes from the Latin word aurum, meaning gold.',1,'Royal Society of Chemistry','https://www.rsc.org/periodic-table/element/79/gold'),
('science-nature','What is the largest planet in our solar system?','Jupiter',array['Jupiter'],array['Saturn','Neptune','Earth'],'Jupiter is the solar system’s largest planet.','Its mass is more than twice that of all the other planets combined.',2,'NASA Solar System Exploration','https://science.nasa.gov/jupiter/'),
('science-nature','What process lets plants convert light energy into chemical energy?','Photosynthesis',array['Photosynthesis'],array['Respiration','Fermentation','Transpiration'],'Photosynthesis captures light energy and stores it in energy-rich organic molecules.','In plants, chlorophyll in chloroplasts absorbs light. The light-dependent reactions produce chemical energy and release oxygen from water; the Calvin cycle uses that energy to incorporate carbon dioxide into sugars.',2,'OpenStax Biology 2e','https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis'),
('science-nature','What elementary particle carries the electromagnetic force?','Photon',array['Photon','Photons'],array['Gluon','Neutrino','Proton'],'The photon is the force carrier of electromagnetism.','In quantum electrodynamics, electromagnetic interactions are described through photons.',4,'CERN','https://home.cern/science/physics/photon'),
('science-nature','Which element has atomic number 74?','Tungsten',array['Tungsten','W','Wolfram'],array['Tantalum','Rhenium','Osmium'],'Tungsten has atomic number 74 and symbol W.','Its symbol derives from wolfram, a name still used for the element in several languages.',5,'Royal Society of Chemistry','https://www.rsc.org/periodic-table/element/74/tungsten'),

('history','Who was the first president of the United States?','George Washington',array['George Washington','Washington'],array['John Adams','Thomas Jefferson','James Madison'],'George Washington served as the first U.S. president.','He held office from 1789 to 1797 after presiding over the Constitutional Convention.',1,'White House Historical Association','https://www.whitehousehistory.org/bios/george-washington'),
('history','Which civilization built Machu Picchu?','The Inca',array['Inca','The Inca','Incan Empire','Inca Empire'],array['Maya','Aztec','Olmec'],'Machu Picchu was built by the Inca civilization.','The fifteenth-century site stands high in the Andes of modern Peru.',2,'UNESCO World Heritage Centre','https://whc.unesco.org/en/list/274/'),
('history','In what year was Magna Carta first sealed?','1215',array['1215'],array['1066','1314','1492'],'King John sealed Magna Carta in 1215.','The charter was sealed at Runnymede and became an enduring symbol of limits on government power.',3,'UK Parliament','https://www.parliament.uk/magnacarta/'),
('history','What collective name is given to the 1648 treaties that ended the Thirty Years’ War?','Peace of Westphalia',array['Peace of Westphalia','Treaties of Westphalia','Westphalian Peace'],array['Peace of Augsburg','Treaty of Utrecht','Congress of Vienna'],'The Peace of Westphalia ended the Thirty Years’ War.','The agreements were negotiated in Münster and Osnabrück and also concluded the Eighty Years’ War.',4,'Encyclopaedia Britannica','https://www.britannica.com/event/Peace-of-Westphalia'),
('history','Which Byzantine emperor ordered the compilation now called the Corpus Juris Civilis?','Justinian I',array['Justinian','Justinian I','Emperor Justinian'],array['Constantine I','Theodosius I','Basil II'],'Emperor Justinian I sponsored the Corpus Juris Civilis.','The sixth-century compilation became enormously influential in later civil-law traditions.',5,'Encyclopaedia Britannica','https://www.britannica.com/topic/Code-of-Justinian'),

('geography','What is the capital of Japan?','Tokyo',array['Tokyo'],array['Kyoto','Osaka','Sapporo'],'Tokyo is Japan’s capital.','The Tokyo metropolitan area is also one of the world’s largest urban concentrations.',1,'Japan National Tourism Organization','https://www.japan.travel/en/destinations/kanto/tokyo/'),
('geography','Which continent contains the South Pole?','Antarctica',array['Antarctica'],array['Australia','South America','Asia'],'The geographic South Pole lies in Antarctica.','Antarctica is almost entirely covered by an ice sheet.',1,'National Science Foundation','https://www.nsf.gov/geo/opp/antarct/'),
('geography','Which country is completely surrounded by South Africa?','Lesotho',array['Lesotho','Kingdom of Lesotho'],array['Eswatini','Botswana','Namibia'],'Lesotho is an enclave entirely surrounded by South Africa.','Its mountainous terrain has earned it the nickname Kingdom in the Sky.',3,'Encyclopaedia Britannica','https://www.britannica.com/place/Lesotho'),
('geography','What strait separates southern Spain from northern Morocco?','Strait of Gibraltar',array['Strait of Gibraltar','Gibraltar Strait','Gibraltar'],array['Bosporus','Strait of Messina','Dardanelles'],'The Strait of Gibraltar separates Europe from Africa.','It connects the Atlantic Ocean with the Mediterranean Sea.',4,'Encyclopaedia Britannica','https://www.britannica.com/place/Strait-of-Gibraltar'),
('geography','What is the world’s largest island that is not considered a continent?','Greenland',array['Greenland'],array['New Guinea','Borneo','Madagascar'],'Greenland is the world’s largest noncontinental island.','Although geographically part of North America, Greenland is an autonomous territory within the Kingdom of Denmark.',2,'Encyclopaedia Britannica','https://www.britannica.com/place/Greenland'),

('sports','How many players from one team are normally on the field in soccer?','11',array['11','Eleven'],array['9','10','12'],'Each soccer team normally fields eleven players, including its goalkeeper.','A match is played by two teams of no more than eleven players each. One must be the goalkeeper, and a team generally cannot start or continue with fewer than seven players.',1,'IFAB Laws of the Game','https://www.theifab.com/laws/latest/the-players/'),
('sports','Which tennis Grand Slam tournament is played on clay courts?','French Open',array['French Open','Roland Garros'],array['Wimbledon','US Open','Australian Open'],'The French Open is played on clay at Roland-Garros.','It is the only Grand Slam tournament contested on clay.',2,'Roland-Garros','https://www.rolandgarros.com/en-us/'),
('sports','Who scored 100 points in a single NBA game in 1962?','Wilt Chamberlain',array['Wilt Chamberlain','Chamberlain'],array['Bill Russell','Kareem Abdul-Jabbar','Elgin Baylor'],'Wilt Chamberlain scored 100 points on March 2, 1962.','He achieved the record for the Philadelphia Warriors against the New York Knicks.',3,'NBA','https://www.nba.com/news/history-wilt-chamberlain-100-point-game'),
('sports','In cricket, how many stumps make up one wicket?','3',array['3','Three'],array['2','4','5'],'A cricket wicket consists of three upright stumps topped by two bails.','The two wickets stand opposite one another at the ends of the pitch. Under Law 8, each is formed from three wooden stumps with two bails resting in grooves across their tops.',3,'Marylebone Cricket Club','https://www.lords.org/mcc/the-laws-of-cricket/the-wickets'),
('sports','Which trophy is awarded to the National Hockey League playoff champion?','Stanley Cup',array['Stanley Cup','The Stanley Cup'],array['Calder Cup','Grey Cup','Memorial Cup'],'The NHL playoff champion is awarded the Stanley Cup.','Lord Stanley of Preston donated the trophy in 1892, before the NHL existed. It became the NHL championship trophy after the league formed and is famous for bearing the engraved names of champions.',2,'Hockey Hall of Fame','https://www.hhof.com/thecollection/stanleycup.html'),

('arts-literature','Who painted the Mona Lisa?','Leonardo da Vinci',array['Leonardo da Vinci','Leonardo','Da Vinci'],array['Michelangelo','Raphael','Titian'],'Leonardo da Vinci painted the Mona Lisa.','The portrait is held by the Louvre in Paris.',1,'Musée du Louvre','https://www.louvre.fr/en/explore/the-palace/from-the-mona-lisa-to-the-wedding-feast-at-cana'),
('arts-literature','Who wrote the novel Nineteen Eighty-Four?','George Orwell',array['George Orwell','Orwell','Eric Arthur Blair'],array['Aldous Huxley','Ray Bradbury','H. G. Wells'],'George Orwell wrote Nineteen Eighty-Four.','Published in 1949, the novel introduced terms such as Big Brother and doublethink.',2,'The Orwell Foundation','https://www.orwellfoundation.com/the-orwell-foundation/orwell/books-by-orwell/nineteen-eighty-four/'),
('arts-literature','Which artist painted The Persistence of Memory?','Salvador Dalí',array['Salvador Dali','Salvador Dalí','Dali','Dalí'],array['Joan Miró','René Magritte','Pablo Picasso'],'Salvador Dalí painted The Persistence of Memory.','The 1931 Surrealist work is famous for its soft, melting watches.',3,'Museum of Modern Art','https://www.moma.org/collection/works/79018'),
('arts-literature','Who wrote the epic poem Paradise Lost?','John Milton',array['John Milton','Milton'],array['John Dryden','Alexander Pope','William Blake'],'John Milton wrote Paradise Lost.','The poem was first published in 1667 and is largely composed in blank verse.',3,'Poetry Foundation','https://www.poetryfoundation.org/poets/john-milton'),
('arts-literature','Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?','Flying buttress',array['Flying buttress','A flying buttress'],array['Corbel','Pediment','Voussoir'],'A flying buttress carries lateral force outward through an exterior arch to a separate support.','The technique enabled Gothic churches to use taller walls, larger windows, and extensive stained glass without sacrificing structural stability.',4,'Encyclopaedia Britannica','https://www.britannica.com/technology/flying-buttress'),

('film-television','Who directed the 1975 film Jaws?','Steven Spielberg',array['Steven Spielberg','Spielberg'],array['George Lucas','Francis Ford Coppola','Brian De Palma'],'Steven Spielberg directed Jaws.','The film’s enormous commercial success helped establish the modern summer blockbuster.',1,'American Film Institute','https://www.afi.com/afi-movie-club-jaws/'),
('film-television','Wakanda is the home country of which Marvel hero?','Black Panther',array['Black Panther','T Challa','T’Challa'],array['Doctor Strange','Thor','Ant-Man'],'Wakanda is the home of Black Panther, also known as T’Challa.','The fictional African nation is technologically advanced because of its vibranium resources.',2,'Marvel','https://www.marvel.com/characters/black-panther-t-challa'),
('film-television','Which 1927 film is widely credited with popularizing synchronized dialogue in feature films?','The Jazz Singer',array['The Jazz Singer','Jazz Singer'],array['Metropolis','Sunrise','Wings'],'The Jazz Singer helped usher in the era of talking pictures.','It was not the first film with synchronized sound, but its spoken sequences transformed the industry.',3,'Library of Congress','https://www.loc.gov/static/programs/national-film-preservation-board/documents/jazz_singer.pdf'),
('film-television','Who directed the 1954 film Seven Samurai?','Akira Kurosawa',array['Akira Kurosawa','Kurosawa'],array['Yasujirō Ozu','Kenji Mizoguchi','Masaki Kobayashi'],'Akira Kurosawa directed Seven Samurai.','Its story structure influenced later ensemble action films, including The Magnificent Seven.',3,'The Criterion Collection','https://www.criterion.com/films/165-seven-samurai'),
('film-television','Which cinematographer shot Blade Runner 2049 and 1917?','Roger Deakins',array['Roger Deakins','Deakins'],array['Emmanuel Lubezki','Vittorio Storaro','Janusz Kamiński'],'Roger Deakins was cinematographer on both films.','He won Academy Awards for Blade Runner 2049 and 1917 after numerous earlier nominations.',5,'Academy of Motion Picture Arts and Sciences','https://www.oscars.org/oscars/ceremonies/2020'),

('music','How many strings does a standard violin have?','4',array['4','Four'],array['5','6','8'],'A standard violin has four strings.','From lowest to highest, they are normally tuned G, D, A, and E.',1,'Encyclopaedia Britannica','https://www.britannica.com/art/violin'),
('music','Which band recorded Bohemian Rhapsody?','Queen',array['Queen'],array['The Who','Led Zeppelin','Pink Floyd'],'Queen recorded Bohemian Rhapsody.','Freddie Mercury wrote the song, which appeared on the 1975 album A Night at the Opera.',2,'Queen Official','https://www.queenonline.com/features/bohemian-rhapsody-40-years-on'),
('music','How many numbered symphonies did Ludwig van Beethoven complete?','9',array['9','Nine'],array['7','8','10'],'Beethoven completed nine numbered symphonies.','He began sketches for a tenth, but it was never completed as a symphony.',3,'Beethoven-Haus Bonn','https://www.beethoven.de/en/work/view/597616474/Symphony+No.+9+in+D+minor%2C+Op.+125'),
('music','What term describes a recurring musical idea associated with a person, place, or concept?','Leitmotif',array['Leitmotif','Leitmotiv'],array['Ostinato','Cadenza','Recitative'],'A leitmotif is a recurring theme linked with a dramatic element.','The technique is especially associated with Richard Wagner’s music dramas, though it appears widely in film music.',4,'Encyclopaedia Britannica','https://www.britannica.com/art/leitmotif'),
('music','Who was the principal artist on the 1959 jazz album Kind of Blue?','Miles Davis',array['Miles Davis','Davis'],array['John Coltrane','Thelonious Monk','Charles Mingus'],'Trumpeter Miles Davis led the sessions for Kind of Blue.','The album featured John Coltrane, Cannonball Adderley, Bill Evans, Wynton Kelly, Paul Chambers, and Jimmy Cobb.',5,'Library of Congress','https://www.loc.gov/static/programs/national-recording-preservation-board/documents/KindOfBlue.pdf'),

('lifestyle-culture','What grain is traditionally used to make risotto?','Rice',array['Rice','Arborio rice','Carnaroli rice'],array['Barley','Couscous','Bulgur'],'Risotto is traditionally made with short- or medium-grain rice.','Italian varieties such as Arborio and Carnaroli release starch while cooking, producing a creamy texture.',1,'Encyclopaedia Britannica','https://www.britannica.com/topic/risotto'),
('lifestyle-culture','On which color square does the queen begin a game of chess?','Her own color',array['Her own color','Same color','A matching color'],array['The opposite color','Always white','Always black'],'Each queen begins on a square matching her color.','The mnemonic is “queen on her own color”: White on a light square and Black on a dark square.',2,'FIDE Laws of Chess','https://handbook.fide.com/chapter/E012023'),
('lifestyle-culture','What does the Japanese word sushi primarily refer to?','Vinegared rice',array['Vinegared rice','Seasoned rice','Sour rice'],array['Raw fish','Seaweed','Soy sauce'],'Sushi refers primarily to prepared vinegared rice.','Raw fish may accompany sushi, but it is not required; sashimi is sliced raw seafood served without sushi rice.',3,'Japan Ministry of Agriculture, Forestry and Fisheries','https://www.maff.go.jp/e/policies/market/k_ryouri/search_menu/'),
('lifestyle-culture','Which microorganisms drive the fermentation of traditional sauerkraut?','Lactic acid bacteria',array['Lactic acid bacteria','Lactobacillus','LAB'],array['Yeast only','Acetic acid bacteria','Molds'],'Lactic acid bacteria ferment the sugars in cabbage.','The resulting acids preserve the cabbage and create sauerkraut’s characteristic flavor.',4,'National Center for Home Food Preservation','https://nchfp.uga.edu/how/ferment/recipes/sauerkraut/'),
('lifestyle-culture','In the board game Go, what term describes a single empty point inside a surrounded group?','Liberty',array['Liberty','A liberty'],array['Ko','Atari','Eye'],'An empty adjacent point available to a stone or connected group is a liberty.','A group with no liberties is captured; a group with one liberty is in atari.',3,'American Go Association','https://www.usgo.org/brief-history-go');

insert into public.questions(id) select question_id from public.mindspan_seed_questions on conflict do nothing;

insert into public.question_versions(
  id, question_id, topic_id, version_number, status, prompt, canonical_answer, explanation, details,
  difficulty, time_limit_seconds, remove_leading_articles, verified_at, published_at
)
select s.version_id, s.question_id, t.id, 1, 'published', s.prompt, s.answer, s.explanation, s.details,
  s.difficulty, 30, true, now(), now()
from public.mindspan_seed_questions s join public.topics t on t.slug = s.topic_slug;

-- Editorial review lowered this seeded question from five stars to four.
update public.question_versions
set difficulty = 4
where prompt = 'Which cinematographer shot Blade Runner 2049 and 1917?';

insert into public.answer_aliases(question_version_id, answer, normalized_answer)
select s.version_id, alias, lower(regexp_replace(alias, '[^[:alnum:] ]', '', 'g'))
from public.mindspan_seed_questions s cross join lateral unnest(s.aliases) alias;

insert into public.distractors(question_version_id, answer, sort_order)
select s.version_id, d.answer, d.ordinality::smallint
from public.mindspan_seed_questions s cross join lateral unnest(s.distractors) with ordinality as d(answer, ordinality);

insert into public.question_citations(question_version_id, label, url)
select version_id, source_label, source_url from public.mindspan_seed_questions;

insert into public.pack_questions(pack_id, question_id, sort_order)
select p.id, s.question_id, row_number() over (partition by p.id order by s.difficulty, s.prompt)
from public.mindspan_seed_questions s
join public.topics t on t.slug = s.topic_slug
join public.packs p on p.topic_id = t.id and p.is_starter = true;

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
  ('How many players from one team are normally on the field in soccer?', 'Soccer'),
  ('Which tennis Grand Slam tournament is played on clay courts?', 'Tennis'),
  ('Who scored 100 points in a single NBA game in 1962?', 'Basketball'),
  ('In cricket, how many stumps make up one wicket?', 'Cricket'),
  ('Which trophy is awarded to the National Hockey League playoff champion?', 'Ice Hockey'),
  ('Who painted the Mona Lisa?', 'Renaissance Art'),
  ('Who wrote the novel Nineteen Eighty-Four?', 'Fiction'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Who wrote the epic poem Paradise Lost?', 'Poetry'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Architecture'),
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
  ('How many players from one team are normally on the field in soccer?', 'Soccer'),
  ('Which tennis Grand Slam tournament is played on clay courts?', 'Tennis'),
  ('Who scored 100 points in a single NBA game in 1962?', 'Basketball'),
  ('In cricket, how many stumps make up one wicket?', 'Cricket'),
  ('Which trophy is awarded to the National Hockey League playoff champion?', 'Ice Hockey'),
  ('Who painted the Mona Lisa?', 'Renaissance Art'),
  ('Who wrote the novel Nineteen Eighty-Four?', 'Fiction'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Who wrote the epic poem Paradise Lost?', 'Poetry'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Architecture'),
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

with requested(prompt, tag_name) as (values
  ('Which artist painted The Persistence of Memory?', 'Artists'),
  ('Which artist painted The Persistence of Memory?', 'Surrealism'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Gothic Architecture'),
  ('Which Gothic architectural feature uses an exterior arch to transfer a wall’s lateral thrust to a separate pier?', 'Structural Engineering')
), resolved as (
  select distinct
    qv.question_id,
    qv.topic_id,
    requested.tag_name,
    trim(both '-' from regexp_replace(lower(requested.tag_name), '[^a-z0-9]+', '-', 'g')) as tag_slug
  from requested
  join public.question_versions qv on qv.prompt = requested.prompt
), inserted_tags as (
  insert into public.detail_tags(topic_id, slug, name)
  select distinct topic_id, tag_slug, tag_name
  from resolved
  on conflict(topic_id, slug) do update set name = excluded.name
  returning id
)
insert into public.question_detail_tags(question_id, detail_tag_id)
select resolved.question_id, detail_tags.id
from resolved
join public.detail_tags
  on detail_tags.topic_id = resolved.topic_id
  and detail_tags.slug = resolved.tag_slug
on conflict do nothing;

drop table public.mindspan_seed_questions;
end
$seed$;
