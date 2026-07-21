# July 18 duplicate and production-review pass

Source: `mindspan-question-quality-2026-07-18 (2).json`, exported from
production at `2026-07-18T03:22:59.606Z`.

## Outcome

- Merged 66 approvals from the export into the portable approval ledger; the
  ledger now contains 116 question-version fingerprints.
- Reconciled all 18 exported action items.
- Audited all 1,500 current database questions, including the 40 seeded
  questions that are not stored in generated catalog JSON.
- Removed all three exact duplicate prompt groups and 23 additional questions
  that tested substantially the same fact as another question.
- Changed 39 question records in total: 36 generated catalog questions, two
  immutable seeded question versions, and reviewer-only tags on one additional
  seeded question.
- Preserved stable identity for the nine same-fact corrections. The 27 full
  generated replacements received distinct durable identities, so their
  predecessors retain historical attempts, feedback, points, and reviews while
  the new questions begin with fresh repeat state.

## Production action items

| Question or issue | Action | Reason |
| --- | --- | --- |
| Dalí works | Replaced with a Pointillism question | It substantially overlapped the seeded *Persistence of Memory* question. |
| First SCP Foundation entry | Replaced with a *To Kill a Mockingbird* question | The original was highly obscure and weak starter-pack material. |
| Mycroft Holmes | Added `Mycroft`; raised to difficulty 2 | A last name is sufficient in context and the original rating was too low. |
| Sir Handel / Falcon | Replaced with an *A Wrinkle in Time* question | The original was obscure, grammatically faulty, and poor starter-pack coverage. |
| Dr. Seuss | Added `Seuss` and the author's birth name | The common short form should be accepted. |
| Shakespeare play count | Raised to difficulty 2 | The count is not universal everyday knowledge. |
| Kobicha / purple | Replaced with an Impressionism question | The negative required-choice color lookup was obscure and poorly classified. |
| Richard Bachman | Added `Bachman`; raised to difficulty 2 | The surname is unambiguous in context and the question was underrated. |
| David Tennant's *Hamlet* | Raised to difficulty 3 | The production-specific clue requires more specialized knowledge. |
| *The Persistence of Memory* | Added Artists and Surrealism reviewer tags | The question itself was sound; richer reviewer classification was sufficient. |
| *Paradise Lost* | Lowered to difficulty 3 through a new immutable seed version | The original five-point scale placement was too high. |
| Brendon Urie | Added `Urie` | The surname is sufficient in context. |
| Flying buttress | Reworded to make the Gothic-architecture context explicit; added Gothic Architecture and Structural Engineering tags | Architecture remains appropriate under Arts & Literature when the question tests a named architectural feature. |
| Vincent van Gogh | Added `Van Gogh` and the full name | Common short and full forms should be accepted. |
| Mona Lisa | Replaced with an Auguste Rodin question | It exactly duplicated a seeded question; the first replacement was also caught as overlapping two Michelangelo questions and was corrected before completion. |
| Herman Melville | Added `Melville`; lowered to difficulty 2 | The author is common literary knowledge and the surname is unambiguous. |
| Ian Fleming | Added `Fleming`; raised to difficulty 2 | The association is interesting but not one-star recall. |
| “World's best-selling book” | Replaced with a Discworld question | The original claim depended on inconsistent exclusions and was not defensible as written. |

## Duplicate replacements

The retained side was the stronger, more pack-appropriate, or seeded version.
The retired side keeps its historical identity and records; its replacement
received a distinct catalog and gameplay identity.

| Duplicated fact | Replacement subject |
| --- | --- |
| Mona Lisa painter | Auguste Rodin and *The Thinker* |
| Machu Picchu builders | Haitian independence |
| Peace of Westphalia, duplicated twice | Ottoman devshirme; Nuremberg Trials |
| Cuneiform | The Sumerian city of Ur |
| Espresso preparation | Japanese bowing custom |
| George Eliot as Mary Ann Evans | Octavia Butler's *Kindred* |
| Tolstoy / *War and Peace* | Dostoevsky's *The Brothers Karamazov* |
| Blue whale size record | Thermometer |
| Eleven soccer players | Hexagon sides |
| Cahokia | Mansa Musa |
| Dalí / *The Persistence of Memory* | Pointillism |
| Magna Carta in 1215 | English Bill of Rights |
| Cerebellum function | Medulla oblongata function |
| Dendrochronology | Palynology |
| *Dr. No* as first Bond film | Sean Connery as Eon's first Bond |
| Eris and the golden apple | Judgment of Paris |
| League of Nations before the UN | Helsinki Accords |
| MGMT identification | Georgia O'Keeffe |
| Nile and Egyptian agriculture | Papyrus manufacture |
| Rosetta Stone and decipherment | Howard Carter |
| Zeus as king of the gods | Athena's birth myth |
| Sushi as vinegared rice | Tempura |

## Deliberately retained similarities

The audit does not treat every repeated answer as duplication. It retained
questions that share an answer but test distinct facts, such as four chambers
in a human heart versus four chambers in a crocodilian heart. It also reports
template-heavy families separately; repeated country, sport, river-mouth, and
moon-orbit forms are catalog-variety issues, not automatically same-fact
duplicates.

## Verification

- `npm run catalog:validate` — 1,460 generated questions passed.
- `npm run catalog:load` — final catalog content loaded locally.
- `npm run db:test:replacement` — 27 full replacements use distinct question
  IDs, retain historical points and predecessor repeat state, and begin with no
  repeat state of their own.
- `npm run catalog:audit:duplicates` — 1,500 current questions, zero exact
  duplicate prompt groups.
- Remaining high-scoring pairs were reviewed as distinct facts or repetitive
  templates rather than semantic duplicates.
