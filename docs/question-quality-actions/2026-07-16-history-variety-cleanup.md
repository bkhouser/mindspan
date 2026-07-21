# History Starter variety cleanup

Date: 2026-07-16

## Reason

The History Starter pack still contained two large mechanically generated
families: 19 prompts asking for the capital of an often-obscure historical state
and 19 prompts asking which country a monarch was associated with. Together,
they made nearly 40 percent of the generated starter catalog feel repetitive
even after earlier battle-location and exact-year reductions.

## Actions

| Question family | Found | Action |
| --- | ---: | --- |
| Historical-state capital | 19 | Replaced all 19 |
| Monarch-country association | 19 | Replaced all 19 |
| **Total reviewed** | **38** | **38 replaced** |

The replacements broaden coverage across:

- ancient Mesopotamia, Persia, India, Rome, and the Mediterranean;
- the Aztec, Inca, Mississippian, and Norte Chico civilizations;
- African kingdoms, Indian Ocean trade, and Great Zimbabwe;
- Mongol, Ottoman, Safavid, Mughal, Chinese, and Japanese history;
- medicine, labor, economic systems, constitutional government, and diplomacy;
- imperialism, anti-colonial resistance, decolonization, and the Cold War.

## Safeguards

- No question was removed without a replacement.
- History Starter remains at 100 questions: 95 generated catalog questions and
  5 original seed questions.
- The pack's existing difficulty distribution was preserved exactly.
- The repetitive monarch-country form was eliminated. Only two capital
  questions remain in the generated catalog, both concerning historically
  significant major civilizations: Constantinople and Tenochtitlan.
- Catalog keys were retained so production deployment will create immutable new
  versions while preserving attempts, feedback, and review history attached to
  each underlying question.
