# Hidden expansion pack catalog

Date: 2026-07-17

## Purpose

Mindspan's catalog now includes eight additional expansion packs that can be
reviewed and refined before an administrator makes them available to players.
Every pack is globally disabled on creation; the ordinary Packs and Play pages
continue to show only enabled packs, while Question Quality and Question Index
remain able to review the hidden catalog.

## Catalog added

| Pack | Topic | Questions | Difficulty 1/2/3/4/5 |
| --- | --- | ---: | ---: |
| Body of Knowledge | Science & Nature | 50 | 5/10/20/10/5 |
| Wild World | Science & Nature | 50 | 8/12/20/8/2 |
| How It Works | Science & Nature | 50 | 5/10/20/10/5 |
| Ancient Worlds | History | 50 | 5/10/20/10/5 |
| The American Story | History | 50 | 5/10/20/10/5 |
| Myth & Legend | Arts & Literature | 50 | 8/12/18/8/4 |
| At the Table | Lifestyle & Culture | 50 | 10/15/15/8/2 |
| Bookshelf Essentials | Arts & Literature | 50 | 5/10/20/10/5 |
| **Total** |  | **400** | **51/89/153/74/33** |

## Content approach

- Each pack covers ten named subtopics with five questions apiece, preventing a
  narrow prompt family from dominating the pack.
- Questions emphasize concepts, people, stories, mechanisms, and culturally
  meaningful facts rather than bulk exact-year, abbreviation, or lookup trivia.
- Explanations state why the answer matters, and the additional context adds a
  useful connection rather than repeating the answer.
- Myths, foodways, and cultural traditions are described as varied living or
  historical traditions rather than being flattened into one universal story.
- Every question includes a cited reference, three distractors, authored answer
  aliases where useful, a difficulty rating, and a 30- or 45-second timer based
  on answer length.

## Automated safeguards

- The catalog manifest enforces exactly 50 questions and the intended
  difficulty distribution for every pack.
- Normalized canonical answers, aliases, and distractors may not collide.
- The same four-word prompt opening may appear no more than twice in a pack.
- A single subtopic may account for no more than ten questions.
- Explanations must contain at least 20 characters and additional context at
  least 40 characters.
- Whole-catalog validation rejects duplicate prompts, duplicate catalog keys,
  excessive exact-year questions, excessive battle-location questions,
  placeholder copy, catch-all General Knowledge classifications, and schema
  violations.
- Catalog generation is deterministic, and a second load must make no database
  changes.

## Availability and preservation

The migration inserts the packs with `enabled = false`. On a later migration
rerun, metadata may be refreshed but an administrator's current enabled state
is deliberately preserved. The load uses stable catalog keys and the existing
immutable question-version workflow, so later editorial revisions can retain
attempt, feedback, and review history for each underlying question.
