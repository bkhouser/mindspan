# Completed question-review pass — 2026-07-21

## Intake and preservation

The completed Question Quality export contained 130 action items, all marked
**Needs Revision**, and no unresolved player-feedback reports or formal problem
reports. It also carried 762 exact content approvals. Those approvals were
merged into the portable source-controlled ledger before any editing, so
unchanged approved versions remain approved in development and production.
In the final local catalog, 593 of those exported fingerprints still describe
the current published version and all 593 are approved; the other fingerprints
remain safely historical because their questions were revised in this or an
earlier quality pass.

The action items covered nine packs:

| Pack | Action items |
|---|---:|
| Film & Television Starter | 26 |
| Lifestyle & Culture Starter | 20 |
| Trivia 101 | 19 |
| Arts & Literature Starter | 13 |
| History Starter | 13 |
| Science & Nature Starter | 12 |
| Geography Starter | 11 |
| Sports Starter | 9 |
| Music Starter | 7 |

## Decisions

- 112 catalog questions keep their durable identity because the requested work
  changes difficulty, aliases, wording, explanations, distractors, or another
  presentation detail while continuing to test the same fact.
- Ten weak questions test substantially different facts after this pass. They
  therefore receive new durable identities so old attempts, feedback, points,
  and repeat history stay attached to the question that was actually shown.
- Seven hand-seeded questions receive immutable versions for six difficulty
  corrections and the new **Gibraltar** alias. Their historical attempts remain
  attached to the previous versions.
- The Persistence of Memory question already had the requested reviewer-only
  **Artists** detail tag. Its exact version is resolved as approved rather than
  publishing a meaningless copy.

### Full replacements

| Removed prompt theme | Replacement | Why |
|---|---|---|
| A specific *Star Trek: Voyager* episode | Dorothy's Yellow Brick Road | Replaces episode-level recall with an enduring film landmark appropriate for Trivia 101. |
| A minor *Donkey Kong Country* episode character | The flux capacitor | Replaces an obscure episode detail with a recognizable science-fiction concept. |
| An unverifiable 2013 scam-loss estimate | Meaning of DIY | Removes a dated, methodology-dependent number in favor of useful everyday knowledge. |
| Exact Japanese PlayStation 3 launch date | Identifying the PlayStation 3 | Preserves the console theme while testing defining features rather than an arbitrary date. |
| A time-sensitive “fastest road car” claim | Porsche 911 manufacturer | Removes a claim that becomes obsolete and substitutes stable brand knowledge. |
| 2017 Champions League winner | Real Madrid's home stadium | Replaces a single-season result with a durable club association. |
| An awkward abstract answer about *The Silence of the Lambs* | Clarice's screaming lambs | Makes the title reference answerable through a concise concrete response. |
| Tony Soprano's racehorse | Dr. Melfi | Keeps *The Sopranos* coverage while testing a central character rather than a minor subplot. |
| Detailed *Rogue One* chronology | Rey's first film | Replaces franchise timeline minutiae with a broadly recognizable film association. |
| LS7 engine displacement | Tachometer function | Replaces specialist engine trivia with useful automotive vocabulary. |

### Corrections and judgment calls

- Repaired two corrupted imported records: the water-polo answer is now **7**
  with numeric distractors, and the regulation basketball-rim answer is now
  **10 feet** with measurement-aware aliases and plausible distractors.
- Reworded the Original Six and Gandhi questions so their prompts no longer
  reveal their own answers.
- Converted the centaur, *Username: Evie*, and Arthur Conan Doyle questions
  from forced choice to normal typed recall.
- Reframed the Avogadro question around the named constant while continuing to
  accept its approximate numerical value.
- Clarified the distinction between hail and sleet, the definition of the
  ecliptic, the action of antibiotics, Euler's polyhedron formula, and several
  film prompts whose original wording was ambiguous.
- Accepted **music director** and **orchestra director** for the conductor
  question, but not bare **director**, which is too broad outside that phrase.
- Added requested surnames, abbreviations, shortened titles, numeric wording,
  and reasonable partial location answers. Removed **high fashion** from haute
  couture because the broader phrase does not necessarily mean custom-fitted
  couture.
- Difficulty changes follow the human review rather than trying to preserve the
  former pack distribution. The manifest now records the reviewed distribution
  so future validation protects the new baseline.

The 122 generated-catalog decisions are recorded as current-key amendments in
`content/catalog/amendments/completed-review-2026-07-21-a.json` through
`completed-review-2026-07-21-d.json`. This keeps earlier replacement history
readable while giving each later review pass one authoritative overlay.

### Confirmed cross-pack duplicates

The semantic audit identified four pairs that unquestionably tested the same
fact. The more appropriately placed version was retained and the other received
a fresh replacement identity:

| Retained | Replaced with |
|---|---|
| Free-throw value in Easy Does It | Traveling in Sports Starter |
| Olympic-ring count in Easy Does It | The Olympic torch in Sports Starter |
| Red-card meaning in Sports Starter | Clue in Trivia 101 |
| *Rhapsody in Blue* composer in Music Starter | *Appalachian Spring* composer in Sound & Song |

These four decisions live in
`completed-review-2026-07-21-e-cross-pack.json`. The three semantic candidates
left by the final audit share answer text but test different facts: Washington
the person versus Washington, D.C.; normal human versus crocodilian heart
anatomy; and an organization's headquarters versus a mountain's country.

## Source and duplicate checks

The ten replacements use direct or authoritative references including the
Library of Congress, AFI Catalog, PlayStation, Porsche, Real Madrid, Star Wars,
IEEE, Merriam-Webster, and the relevant publisher or network record. The
catalog still contains 1,500 active questions across 22 packs and has no exact
duplicate group or confirmed same-fact cross-pack duplicate.

## Verification

- `npm run catalog:validate`: 1,460 generated questions passed.
- Focused catalog and taxonomy tests: 17 passed.
- Review-export load: 10 inserted replacements, 112 updated questions, 1,338
  unchanged questions. The duplicate cleanup then adds four replacement
  identities without changing the 1,500-question total.
- The two final source-link adjustments updated exactly two versions; the
  subsequent load was fully idempotent at 0 inserted, 0 updated, and 1,460
  skipped.
- `npm run catalog:verify`: 1,500 active questions across 22 packs, one primary
  subtopic per question, 2,162 reviewer detail-tag links, complete editorial
  fingerprints, and private pack availability preserved.
- Cross-pack duplicate audit: zero exact duplicate groups.
- Replacement-identity verification passed for 292 current catalog-wide
  replacement mappings. This pass publishes fourteen fresh identities; three
  of the four duplicate cleanups replace questions that were already themselves
  replacements, so those chains do not increase the current mapping count.
- Seed verification confirmed the seven new immutable versions and the resolved
  Artists-tag review; database and taxonomy integration checks passed.
- Full automated suite: 116 tests passed. ESLint, TypeScript, whitespace checks,
  and the Next.js production/standalone build also passed.
