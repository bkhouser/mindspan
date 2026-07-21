# Completed question-review pass, round 2 — 2026-07-21

## Intake and preservation

Source: `mindspan-question-quality-2026-07-21 (1).json`

The export contained 14 action items, all marked **Needs Revision**, and 855
exact-version approvals. It contained no player feedback and no formal question
reports. The approvals were merged into the portable source-controlled ledger
before editing, increasing that ledger to 912 unique question-version
fingerprints. Any approved version whose content did not change therefore keeps
its approval across environments.

The reviewer notes saying **2 stars** or **3 stars** were treated as difficulty
corrections. Each exactly matched a question whose current difficulty differed
from the requested value, so none of those notes was misinterpreted as a
request to replace the question.

## Actions

| Pack | Question | Action and reason |
| --- | --- | --- |
| Geography Starter | Cape Agulhas | Lowered difficulty from 3 to 2, matching the reviewer assessment. |
| Arts & Literature Starter | *The Silence of the Lambs* | Lowered difficulty from 3 to 2. |
| Lifestyle & Culture Starter | Odometer | Added **miles** as an accepted response. |
| Science & Nature Starter | Avogadro's number | Removed the approximate numeric forms because the prompt already supplies the number and asks for the constant's name. |
| History Starter | Battle of Hattin | Replaced the tautological explanation with the battle's combatants, location, date, strategic consequence, and a substantive source. |
| Music Starter | *Rhapsody in Blue* | Lowered difficulty from 3 to 2. |
| Lifestyle & Culture Starter | Go liberty | Lowered the hand-seeded question from difficulty 4 to 3 through an immutable database version. |
| Lifestyle & Culture Starter | Papa John's founder | Raised difficulty from 2 to 3. |
| History Starter | Martin Luther | Added **Luther** as an accepted answer. |
| Lifestyle & Culture Starter | Ray Kroc | Added **milkshake machine** as an accepted answer. |
| Film & Television Starter | Dirty Harry | Lowered difficulty from 3 to 2. |
| Film & Television Starter | *Balto* | Made the three-name answer a required-choice question, avoiding an unreasonable typed-response burden. |
| Arts & Literature Starter | *Jurassic Park* tour vehicles | Added **Toyota Land Cruiser** and **Land Cruiser** as accepted answers. |
| Arts & Literature Starter | Arthur Conan Doyle | Reworded the prompt to ask directly for the Scottish-born creator of Sherlock Holmes. |

## Identity and data handling

All 14 edits continue to test the same underlying fact, so every question keeps
its durable identity. Existing attempts, points, feedback, and repeat history
remain attached. Generated questions receive ordinary immutable catalog
versions when loaded. The hand-seeded Go question receives a new immutable
version from migration `20260721110000_seed_completed_review_round_2.sql`; the
fresh-database seed was updated to the same difficulty.

The catalog loader now applies amendment files as ordered layers. This is
necessary for a second review pass to amend the result of an earlier amendment
without rewriting historical review files. Validation still rejects any layer
whose target is not the effective question identity at that point in the
sequence.

## Verification

- `npm run catalog:validate`: 1,460 generated questions passed.
- Focused catalog and taxonomy suite: 17 tests passed.
- Local migration applied successfully. The Go question is now published as
  version 3 at difficulty 3; versions 1 and 2 remain retired and intact.
- First catalog load: 13 updated and 1,447 unchanged. Second load: 0 inserted,
  0 updated, and all 1,460 generated questions skipped.
- Portable approval ledger: 912 fingerprints; no stale approval was applied to
  newly revised content.
- Duplicate audit: 0 exact duplicate groups. The only three non-template
  semantic candidates remain the known false positives involving Washington,
  four-chambered hearts, and Switzerland.
- Replacement-identity and taxonomy-mastery database checks passed.
- `npm run catalog:verify`: 1,500 questions across 22 packs, one primary
  subtopic per question, and 2,162 reviewer detail-tag links.
- `npm run db:verify`: 2,332 immutable question versions; all eight topics, 22
  packs, 24 achievements, and both private storage buckets verified.
- Full automated suite: 116 tests passed. ESLint, TypeScript, whitespace checks,
  and the Next.js production/standalone build also passed.
