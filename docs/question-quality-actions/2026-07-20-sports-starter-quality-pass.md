# Sports Starter quality pass — 2026-07-20

## Scope and editorial policy

This pass audited all 100 active Sports Starter questions after the pack was
reported as repetitive, boring, and weakly explained. Eighty-seven of the 95
catalog-managed questions came from Wikidata and the pack was dominated by
variations on athlete country, athlete sport, team sport, team venue, and
competition sport.

- Six questions were approved, six were marked **Needs revision**, and 88 were
  unreviewed when the pass began.
- Five approved questions were preserved without a content change. The sixth
  approved question was revised only to apply Mindspan's established American
  terminology, changing “association football” to “soccer”; as changed content,
  its new version correctly returns to the unreviewed queue.
- Eighty-three weak questions were replaced with different facts under new
  durable question identities. Historical attempts and points remain attached
  to the retired questions, while the replacements start with fresh repeat
  value and review state.
- Nine worthwhile catalog questions retained their facts but received stronger
  wording, context, classification, or sourcing under the same identities.
- Three SQL-seeded questions received immutable revisions: soccer terminology,
  a more suitable three-star cricket-stumps question, and a more suitable
  two-star Stanley Cup question. Their prior attempt versions remain intact.

## Resulting coverage

The complete 100-question pack now covers 16 subtopics. Athletics, basketball,
and cricket/rugby each contain nine questions; baseball, football, hockey,
Olympic/international sport, and winter sports each contain seven to nine;
motor sports, soccer, tennis/racket sports, combat sports, rules/equipment,
cycling, aquatic sports, and golf round out the set. No subtopic has more than
nine questions.

The final difficulty distribution is 19 / 23 / 25 / 19 / 14 across difficulties
1–5, for an average of 2.86. The catalog-generated distribution remains exactly
18 / 21 / 23 / 19 / 14; the modest full-pack shift comes from correcting the two
overrated seeded questions.

## Replacement themes

| Difficulty | New or substantially improved coverage |
|---|---|
| 1 | Baseball strikes and bases, basketball fundamentals, football scoring and positions, racing flags, soccer cards and goalkeeping, tennis scoring, golf scoring, hockey equipment, Olympic rings, boxing equipment, chess movement, swimming strokes, cycling, and volleyball |
| 2 | Shot clocks, home runs, cycling jerseys, football field structure, baseball roles, hockey terminology, tennis and golf scoring, cricket overs, soccer penalties, rugby scoring, badminton, Olympic scheduling, fencing disciplines, and alpine slalom |
| 3 | Double plays, water polo, decathlon, triple-doubles, boxing counts, rugby and cricket laws, cyclo-cross, motorsport grids and races, Olympic and Paralympic symbols, ERA, handball, chess stalemate, icing, hat tricks, and curling |
| 4 | Perfect games, Olympic discus, steeplechase, the Fosbury Flop, race walking, basketball timing, judo, wrestling, The Ashes, the Indianapolis 500, Olympic history, heptathlon, championship trophies, rugby scrums, the Original Six, tennis Grand Slams, skeleton, and alpine combined |
| 5 | Swimming medleys, goaltending, Jesse Owens, cricket's DLS method, the Immaculate Reception, regenerative braking, the first Winter Games, equestrian eventing, Ironman distances, lacrosse origins, volleyball liberos, and the Panenka penalty |

The exact prior-to-replacement mappings are retained in the five source files
`content/catalog/revisions/sports-quality-pass-d1-2026-07-20.json` through
`sports-quality-pass-d5-2026-07-20.json`.

## Targeted same-fact corrections

The nine catalog questions retained under their existing identities cover the
10-foot basketball rim, checkered flag, chess knight, seven-player water polo,
cyclo-cross, the Soviet KLM hockey line, the Isle of Man TT, Speedway Grand
Prix motorcycles, and seven-player team handball. These were useful facts whose
presentation, explanation, taxonomy, or citation needed improvement rather than
replacement.

The three seeded revisions preserve the soccer team-size, cricket-stumps, and
Stanley Cup facts while correcting terminology, difficulty, and explanatory
depth.

## Verification

- Catalog validation passed for 1,460 generated questions; Sports Starter
  remains 100 questions including its five seed questions.
- Duplicate audit found zero exact duplicates across all 1,500 active questions
  and no Sports Starter non-template semantic candidate introduced by this pass.
- Citation audit checked 78 unique sources. All 20 links that returned 404 were
  replaced with current official or institutional sources; the three remaining
  bot-blocked official pages were independently confirmed as current.
- Local load inserted 83 replacement identities, updated 9 same-fact catalog
  questions, and skipped 1,368 unchanged questions. The second load was fully
  idempotent: 0 inserted, 0 updated, and 1,460 skipped.
- Editorial state after loading is 5 approved and 95 unreviewed. Every unchanged
  approval remains active; all revised content is intentionally ready for a new
  review.
- Replacement-identity verification passed for 243 catalog-wide replacements,
  preserving historical points and repeat state while starting new facts cleanly.
- Taxonomy, local database, catalog breadth, explanation depth, and source
  regression checks passed.
