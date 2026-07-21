# Content curation runbook

Every published question needs a canonical answer, aliases (including the canonical form), exactly three plausible distractors, a concise explanation, deeper context, topic, difficulty 1–5, time limit 15–90 seconds, and at least one HTTPS source. Time-sensitive facts also need `verifiedAt` and should include `expiresAt`.

Bulk JSON uses this shape:

```json
{
  "topicSlug": "science-nature",
  "packSlugs": ["science-nature-starter"],
  "subtopics": ["Zoology"],
  "detailTags": ["Marine Biology", "Mammals"],
  "prompt": "Question text",
  "answerMode": "recall",
  "canonicalAnswer": "Answer",
  "aliases": ["Accepted alternative"],
  "distractors": ["Wrong A", "Wrong B", "Wrong C"],
  "explanation": "Why the answer is correct.",
  "details": "Extra context that helps retention.",
  "difficulty": 3,
  "timeLimitSeconds": 30,
  "removeLeadingArticles": true,
  "source": {
    "label": "Authoritative source",
    "url": "https://example.org/source"
  },
  "expiresAt": null
}
```

Every question has exactly one canonical subtopic area. That stable area drives
subtopic mastery and player-facing progress. A question may also have zero or
more detail tags for finer editorial search and future learning features.
Detail tags are reviewer-only: they appear in Question Quality, Question Index,
and Question Quality exports, but are not returned by play, profile, group,
leaderboard, or ordinary-player review interfaces. Do not use a broad catch-all
such as `General Knowledge` for either field.

Use `answerMode: "required_choice"` only when the wording or logic depends on
the listed alternatives. Required-choice questions display all four answers
immediately and always begin at 50% of normal point value. They are distinct
from a player voluntarily selecting **Show choices**, so they do not increase
the player's assisted-answer rate. Prefer `recall` when the prompt can stand on
its own.

Submit `{ "dryRun": true, "questions": [...] }` to `/api/admin/questions/import` while signed in as a system admin. Correct validation or duplicate warnings before creating review records.

For media, record creator, source URL, license, alt text, MIME type, byte size, and audio/video duration before upload. Accept only original, public-domain, or appropriately licensed assets. Media questions also need a transcript or equivalent post-answer text. Review the prompt without relying solely on color, sound, or fine visual detail.

Editorial acceptance requires fact verification against the cited source, alias collision review, distractor plausibility, difficulty calibration, expiry choice, accessibility review, and a second person's approval before publication. Aim for 100 questions in each starter pack and 50 in each standard expansion pack. Starter packs should average approximately 3.0/5 difficulty, with 2.8–3.2 as the working acceptance band. Advanced expansion packs may intentionally average 4.0 or higher, but their names and descriptions must make that challenge clear. Maintain broad subtopic coverage within every pack and include at least 12 image, 4 audio, and 4 video questions across the initial catalog.

## Versioned beta catalog

Editorial corrections and richer answer copy live in
`content/catalog/enrichments` as maps keyed by `catalogKey`. The loader overlays
these fields before validation and database synchronization, keeping generated
question files reproducible. Use an enrichment to correct prompts, accepted
answers, aliases, explanations, or details instead of editing generated files.

Post-playtest replacements and recalibration live in `content/catalog/revisions`.
Revisions are applied after enrichments so a replacement can supersede the
original authored copy without losing the history of either editorial pass.

When a later review targets the current published form of a question that may
already be a replacement, put the narrowly scoped follow-up in
`content/catalog/amendments`, keyed by the current effective `catalogKey`.
Amendments run after revisions and let a review pass adjust the current question
without moving or duplicating older revision records. An amendment that changes
to a genuinely different fact must still supply a fresh
`replacementCatalogKey`; ordinary corrections omit it and retain identity.

An explanation should directly connect the answer to the prompt. Details should
add context—a mechanism, distinction, date, consequence, or related fact—rather
than merely restating the answer. Validation rejects known placeholder answer
copy.

The checked-in beta catalog lives in `content/catalog/questions` with exact targets in `content/catalog/manifest.json`. Validate it with `npm run catalog:validate`, publish it idempotently with `npm run catalog:load`, and verify database totals with `npm run catalog:verify`. A correction that continues testing the same fact keeps its `catalogKey` and creates a new immutable version. Do not change identity merely to correct wording, aliases, difficulty, explanation, classification, or an answer formulation.

When a revision replaces the old fact with a genuinely different question, set
`replacementCatalogKey` to a new durable key in the revision record. The loader
publishes a new question identity and records the old key as its predecessor.
The predecessor is retired and removed from active packs, but its attempts,
feedback, mastery evidence, and earned points remain historical. The successor
has a different `question_id`, so it begins with no inherited repeat count and
full novel-question value. Never use `replacementCatalogKey` for a correction
to the same underlying fact.

### Person-name aliases

When the canonical answer is a well-known person's full name, accept the
surname alone unless it would be genuinely ambiguous or misleading. Record
catalog-wide surname decisions in `content/catalog/person-surname-aliases.json`;
use an ordinary authored alias when a culture's naming convention, a compound
surname, a regnal name, or a stage name requires more specific handling. Do not
infer surnames merely from a capitalized multiword answer because titles,
organizations, works, and geographic names can look like personal names.

Catalog loading also enforces one primary subtopic per published question,
synchronizes reviewer detail tags, removes unused taxonomy labels, and rebuilds
subtopic mastery from preserved attempts after a taxonomy change.

After loading locally, run `npm run catalog:audit:duplicates`. The audit checks
all current database questions, including seeded questions, fails when exact
duplicate prompts remain, and lists same-answer semantic candidates for human
review. Use `-- --cross-pack` to focus the report on overlaps between packs.
Similar templates and shared answers are candidates, not automatic removals:
confirm that two prompts test the same underlying fact before replacing one.

Generated source records accelerate beta playtesting but are not a substitute for editorial approval. Treat in-game feedback and legacy reports as a review queue, verify corrections against an authoritative source, and retire genuinely ambiguous or incorrect questions instead of silently changing their historical attempts.

Editorial approval is portable only when it is captured in
`content/catalog/editorial-approvals.json`. The ledger records a stable question
identity plus a fingerprint of the exact approved content. Run
`npm run catalog:reviews:capture` after reviewing locally. When review occurred
in production, download the Question Quality action-items export and merge its
approval ledger with
`npm run catalog:reviews:capture -- <path-to-production-export.json>`. Catalog
loading applies those approvals only when the destination's published content
has the same fingerprint. Any prompt, answer, alias, distractor, explanation,
classification, difficulty, timing, pack, or source revision changes the
fingerprint and leaves the replacement version unreviewed.

## Player feedback and editorial review

Players can leave a lightweight thumbs-up or thumbs-down reaction after an
answer. A thumbs-down may include structured reasons and a short comment. The
same control is available later on the player's Review page, so an initial
reaction can be added or changed without interrupting play.

System administrators review these signals at **Admin > Question quality**.
The screen provides a pack-by-pack progress summary and focused queues for
unreviewed, newly player-flagged, and needs-revision questions. **All** retains
access to approved and rejected review history without separate filters.
Editorial decisions apply to the exact immutable question version;
a revised published version returns to the unreviewed queue. Saving any
editorial decision also acknowledges the player feedback currently displayed,
while a later thumbs-down flags the question again.

Use **Export action items** to download a privacy-limited JSON snapshot for an
offline editorial or Codex pass. It contains only questions marked **Needs
revision** or carrying unresolved player flags, including flags received after
an earlier review. For those questions it includes the published content,
catalog key, aggregate answer context, player reasons and comments, formal
reports, the relevant submitted answer, and the system administrator's verdict
and notes. It omits player names, email addresses, and production credentials.

For a Codex-assisted update, attach that JSON file in the Mindspan task (or
place it in the working directory and provide its path). Codex can map each
`catalogKey` back to the checked-in catalog, propose or apply the requested
changes, then run catalog validation. Loading an approved correction creates a
new immutable question version while preserving historical attempts and the
original review record.
