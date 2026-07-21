# Science & Nature Starter quality pass — 2026-07-20

## Scope and editorial policy

This pass audited all 100 active Science & Nature Starter questions after the
pack was reported as overrepresented by obscure element, periodic-table, and
constellation trivia. The audit found that earlier cleanup had improved many
individual questions, but the pack still contained repeated database-derived
templates: obscure moon-parent lookups, biographical field labels, narrow
medical-specialty matches, and more element-symbol recall than the starter pack
needed.

- The starting review state was 32 **Approved**, 14 **Needs revision**, one
  **Rejected**, and 53 unreviewed.
- All 32 approved questions were retained byte-for-byte. In particular, the two
  approved medical-specialty questions and the previously approved conceptual
  science questions remain approved.
- Thirty-eight weak questions were replaced with different facts under new
  durable question identities: 14 obscure moon-parent lookups, 11 weak
  scientist-field lookups, 10 narrow medical-specialty matches, and three extra
  element-symbol drills.
- The SQL-seeded photosynthesis question retained its identity but received an
  immutable version with a stronger explanation, deeper context, and an
  OpenStax citation. Historical attempts remain attached to the version that
  was actually presented.
- Two worthwhile catalog questions retained their identities while receiving
  the requested targeted corrections: **Doppler** is now accepted as an alias,
  and the stomata question is rated difficulty 2 rather than difficulty 1.

## Resulting coverage

The complete 100-question pack now spans 15 subtopics:

| Subtopic | Questions |
|---|---:|
| Chemistry | 21 |
| Astronomy & Space | 14 |
| Physics | 9 |
| Earth Science | 9 |
| Medicine & Health | 7 |
| Biology | 6 |
| Human Anatomy & Physiology | 6 |
| Botany | 5 |
| Zoology | 5 |
| Ecology & Environment | 4 |
| Technology & Engineering | 4 |
| Scientific Discovery | 3 |
| Weather & Climate | 3 |
| Computing | 2 |
| Mathematics | 2 |

Chemistry remains the largest area because the retained questions primarily
test useful concepts—bonding, ions, isotopes, solutions, equilibrium, reaction
energy, and atomic structure—rather than obscure element names. Direct symbol
or atomic-number recall is now limited to a small group of familiar or
distinctive examples.

The full-pack difficulty distribution is 14 / 21 / 28 / 21 / 16 across
difficulties 1–5, for an average difficulty of 3.04. The one-question shift
from difficulty 1 to 2 applies the reviewer's correction to the stomata item.

## Replacement themes

| Difficulty | New coverage |
|---|---|
| 1 | Mammalian hair, skin, hail, genes, plant roots, and gravity |
| 2 | Turtle anatomy, the gallbladder, ecosystem producers, igneous rock, levers, light and sound, antibiotics, and chromosome structure |
| 3 | Ohm's law, octopus circulation, auxin and phototropism, breathing mechanics, carrying capacity, cumulonimbus clouds, control groups, and processor architecture |
| 4 | Electromagnetic induction, angular momentum, mineral hardness, biomagnification, kidney function, herd immunity, meiosis, standard deviation, and transistors |
| 5 | Quantum uncertainty, countercurrent exchange, double-blind studies, Photo 51, Euler's polyhedron formula, binary-search complexity, and adiabatic cooling |

The exact prior-to-replacement mappings are retained in
`content/catalog/revisions/science-quality-pass-d1-2026-07-20.json` through
`science-quality-pass-d5-2026-07-20.json`.

## Duplicate and source review

The first replacement draft exposed eight same-fact overlaps with the hidden
expansion packs, including mammalian milk, tadpoles, heart chambers, xylem,
alveoli, keystone species, binary digits, and thermometers. Those questions
were replaced before loading, so the pass adds no Science & Nature duplicate
candidate to the final catalog.

Every new question has a substantive explanation, expandable context, and a
direct institutional or educational citation. Sources include OpenStax, NIH,
CDC, NIST, USGS, the National Weather Service, the National Park Service,
Smithsonian, WHO, King's College London, and the Computer History Museum.

## Verification

- Catalog validation passed for 1,460 generated questions; Science & Nature
  Starter remains 100 questions including its five seed questions.
- The catalog-wide duplicate audit found zero exact duplicates across all 1,500
  active questions and no new Science & Nature non-template semantic candidate.
- Local catalog load inserted 38 new replacement identities. A follow-up load
  updated the two same-fact reviewer corrections; the final repeat load was
  fully idempotent: 0 inserted, 0 updated, and 1,460 skipped.
- Editorial state after loading is 32 approved and 68 unreviewed. Every
  unchanged approval remains active; revised content and genuinely new facts
  correctly return to the review queue.
- Replacement-identity verification passed for 281 catalog-wide replacements,
  preserving historical points and repeat state while starting replacement
  facts cleanly.
- Catalog, taxonomy, local database, breadth, explanation-depth, and source
  regression checks passed.
