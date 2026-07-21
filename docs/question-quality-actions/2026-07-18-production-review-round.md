# Production Question Quality review — July 18

Date: 2026-07-18

Source: `mindspan-question-quality-2026-07-18.json`

## Outcome

| Classification | Count | Result |
| --- | ---: | --- |
| Already resolved by current dev cleanup | 21 | Existing replacement retained |
| Weak or unstable question replaced now | 22 | New question under the same catalog key |
| Targeted correction made now | 11 | Wording, aliases, choices, classification, or difficulty updated |
| Approved seed question retained | 1 | No content change |
| **Total reconciled** | **55** | **Every exported item accounted for** |

The replacements preserve each underlying catalog key so attempts, feedback,
and review history remain attached when the catalog creates an immutable new
version. Production data was not accessed or changed during this work.

## Major revision themes

- Replaced generated questions that treated politics, international relations,
  or digital humanities as unexplained science classifications.
- Replaced obscure athlete-nationality and club-venue lookups with durable
  sports rules, equipment, and recognizable events.
- Replaced fragile or uninteresting chart totals, album counts, box-office
  amounts, and niche television trivia with facts that remain useful over time.
- Removed answer-normalization commentary from explanations; explanations now
  focus exclusively on the underlying subject.
- Added missing surname aliases for Steinbeck and Tarantino after production
  players reported that correct shortened answers were rejected.
- Corrected misleading distractors, spelling, grammar, answer mode, difficulty,
  and subtopic placement where a full replacement was unnecessary.
- Updated the manifest's per-pack difficulty counts to match the reviewed
  questions rather than assigning misleading ratings merely to preserve the old
  distribution. Starter-pack averages remain close to 3/5.

## New replacements

| Original catalog key | Replacement focus | Reason |
| --- | --- | --- |
| `science-nature-starter.disease-specialty.collapse` | Cerebellum and motor control | “Collapse” was undefined and not a useful specialty prompt |
| `science-nature-starter.scientist-field.ole-w-ver` | Alfred Wegener and continental drift | International relations did not belong in this science template |
| `science-nature-starter.scientist-field.nikolai-grube` | Dendrochronology | Replaces an unexplained digital-humanities classification |
| `sports-starter.athlete-country.heidi-schuller` | Biathlon | Durable knowledge instead of obscure nationality lookup |
| `science-nature-starter.scientist-field.lise-thiry` | Jonas Salk and polio vaccine | Politics was not a useful science-field answer |
| `science-nature-starter.scientist-field.hans-winkler` | Origin of the term genome | Retains a meaningful connection to Winkler |
| `music-starter.opentdb.b89a873823beb75a` | Beatles albums | Removes awkward, changing RIAA ranking language |
| `music-starter.opentdb.f94e997cd0fbd58d` | Adele songs | Replaces an excessively obscure featured-vocalist lookup |
| `sports-starter.athlete-country.ernst-jakob-henne` | Checkered flag | Replaces obscure nationality lookup |
| `sports-starter.team-venue.amatori-lodi` | Basketball hoop height | Replaces obscure venue lookup |
| `lifestyle-culture-starter.opentdb.7706d5be21915542` | Odometer function | Replaces an obscure locomotive horsepower figure |
| `sports-starter.team-venue.cn-atletic-barceloneta` | Water-polo team size | Replaces an impractical venue-name typing test |
| `film-television-starter.opentdb.1b0e88dc7e350563` | Over the Rainbow | Replaces odd production-material trivia |
| `film-television-starter.opentdb.f843ff6dc46d2841` | Homer Simpson's voice actor | Replaces an obscure negative-choice question |
| `sports-starter.athlete-country.egon-muller` | Isle of Man TT | Replaces obscure nationality lookup |
| `lifestyle-culture-starter.opentdb.88de431a8f448112` | Kintsugi | Removes a time-sensitive video-game difficulty opinion |
| `science-nature-starter.scientist-field.barys-kit` | Apogee | Replaces a weak field-of-work template |
| `sports-starter.team-sport.koi` | Knight movement in chess | Removes a changing esports-team classification |
| `music-starter.opentdb.15d0d9b52623403e` | The Proclaimers | Replaces an obscure chart-position lookup |
| `film-television-starter.opentdb.e1f38f71f81ec7f6` | Doctor Who and the TARDIS | Replaces very obscure children's-TV localization trivia |
| `film-television-starter.opentdb.e24c67ac55a65352` | Avengers: Infinity War ending | Replaces awkward and difficult-to-type box-office revenue |
| `music-starter.opentdb.ad7821fa48b57e84` | Daft Punk songs | Replaces an album count perceived as uninteresting and fragile |

## Targeted corrections

| Catalog key | Action |
| --- | --- |
| `easy-does-it.opentdb.668f81343318c1cf` | Removed Mindspan rule commentary from AC/DC context |
| `easy-does-it.opentdb.39e77df462e20698` | Removed punctuation-normalization commentary from Harpers Ferry context |
| `arts-literature-starter.opentdb.e8c58e62e9aa0092` | Added `Steinbeck` alias and clarified novella wording |
| `film-television-starter.opentdb.a784f1d96925b2c5` | Clarified the Latin setup and made it required choice |
| `film-television-starter.opentdb.8505f8debceed770` | Replaced obviously incompatible choices with House leadership positions |
| `easy-does-it.opentdb.d05cd7f970e9f6f3` | Raised Justin Bieber question from difficulty 1 to 2 |
| `film-television-starter.opentdb.f8e0e8f7839fa09c` | Clarified Jason Voorhees wording and raised difficulty to 4 |
| `arts-literature-starter.opentdb.49307361a1c22b3e` | Added Young Adult and Popular Fiction subtopics and corrected a distractor title |
| `music-starter.opentdb.e25f511bd3d3a5bf` | Corrected `its`, improved accepted White Album forms, and cleaned typography |
| `film-television-starter.opentdb.0a3bc2420e7f4ee8` | Corrected Freddy Krueger's name and raised difficulty to 4 |
| `film-television-starter.opentdb.0651659780ae216b` | Added `Tarantino` alias and adjusted difficulty to 2 |

## Items already resolved in dev

The current History and Science cleanup had already replaced the exported
Harald V, Mecklenburg-Strelitz, Gustaf V, Muscat and Oman, Valencia, Warsaw,
Ernst August, Saxony, Habsburg, and Friedrich II prompts, plus the unquadhexium,
palladium, Dorado, Scutum, Eridanus, unquadunium, cerium, niobium, unpentunium,
and hyena prompts. The helium question had already been lowered to difficulty 2
and given a stronger explanation. No duplicate revision was added for these 21
items.

## Retained item

The seed question asking who directed *Seven Samurai* remains at difficulty 4.
It had an explicit approved editorial decision, and recognizing Akira Kurosawa
is appropriately challenging but useful world-cinema knowledge. Because it is a
seed question without a catalog key, it is also documented separately from the
versioned catalog revisions.

## Export evidence improvement

This production export identified two `should_have_been_accepted` reports but
did not include the actual submitted answers. The likely surname forms were
safe and independently useful aliases, so `Steinbeck` and `Tarantino` were
added. The dev export query now includes each feedback item's submitted answer,
preventing that evidence gap in future review rounds.
