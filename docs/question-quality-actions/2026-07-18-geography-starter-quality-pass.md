# Geography Starter quality pass

Date: 2026-07-18

## Reason

Geography Starter was dominated by a few mechanically generated question
families and offered little educational value after an answer. Among its 95
catalog-managed questions, the audit found 19 capital lookups, 16 river-mouth
lookups, 15 generic landmark-country prompts, a concentration of obscure Swiss
peaks, 90 Wikidata-only sources, and many explanations that merely restated the
answer.

## Actions

| Catalog-managed questions | Count | Action |
| --- | ---: | --- |
| Already substantively revised | 17 | Retained |
| Repetitive or weak questions | 78 | Replaced with new question identities |
| **Total audited** | **95** | **Every catalog question assessed** |

The five original seed questions were also checked and retained, leaving the
pack at 100 questions. The 78 replacements preserve the retired questions'
difficulty levels exactly while broadening coverage across:

- maps, hemispheres, navigation, and major world regions;
- countries, borders, capitals, enclaves, and political geography;
- rivers, lakes, oceans, straits, islands, and coastlines;
- mountains, deserts, plateaus, deltas, wetlands, and other landforms;
- climate, biomes, environmental change, and human geography;
- globally significant landmarks and World Heritage sites.

Each replacement has a concise explanatory answer plus fuller context intended
to teach a useful connection rather than repeat the canonical answer. Sources
were upgraded primarily to Encyclopaedia Britannica and UNESCO, with relevant
government and scientific sources where appropriate.

## Result

- The generated catalog now spans 12 primary geography subtopics.
- Exact capital lookups fell from 19 to 4.
- Exact river-mouth lookups fell from 16 to 3.
- Generic landmark-country prompts fell from 15 to 1.
- Wikidata-only sourcing fell from 90 questions to 12 retained questions.
- The generated difficulty distribution remains 16 / 20 / 24 / 21 / 14.
- The starter pack remains 100 questions: 95 catalog questions plus 5 seeds.

## Safeguards

- New facts use distinct replacement catalog identities, so attempts, points,
  and feedback on the retired facts remain historically accurate instead of
  being silently transferred to unrelated questions.
- Catalog validation now caps the repetitive Geography Starter templates at
  their reduced levels.
- Replacement explanations must contain at least 40 characters and detailed
  context at least 100 characters.
- The normal validate, load, verify, idempotency, taxonomy, replacement, and
  duplicate-audit checks are required before release.
