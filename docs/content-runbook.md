# Content curation runbook

Every published question needs a canonical answer, aliases (including the canonical form), exactly three plausible distractors, a concise explanation, deeper context, topic, difficulty 1–5, time limit 15–90 seconds, and at least one HTTPS source. Time-sensitive facts also need `verifiedAt` and should include `expiresAt`.

Bulk JSON uses this shape:

```json
{
  "topicSlug": "science-nature",
  "packSlugs": ["science-nature-starter"],
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

An explanation should directly connect the answer to the prompt. Details should
add context—a mechanism, distinction, date, consequence, or related fact—rather
than merely restating the answer. Validation rejects known placeholder answer
copy.

The checked-in beta catalog lives in `content/catalog/questions` with exact targets in `content/catalog/manifest.json`. Validate it with `npm run catalog:validate`, publish it idempotently with `npm run catalog:load`, and verify database totals with `npm run catalog:verify`. A changed item with the same `catalogKey` creates a new immutable version; do not change a key merely to correct wording or an answer.

Generated source records accelerate beta playtesting but are not a substitute for editorial approval. Treat in-game feedback and legacy reports as a review queue, verify corrections against an authoritative source, and retire genuinely ambiguous or incorrect questions instead of silently changing their historical attempts.

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
reports, and the system administrator's verdict and notes. It omits player
names, email addresses, typed answers, and production credentials.

For a Codex-assisted update, attach that JSON file in the Mindspan task (or
place it in the working directory and provide its path). Codex can map each
`catalogKey` back to the checked-in catalog, propose or apply the requested
changes, then run catalog validation. Loading an approved correction creates a
new immutable question version while preserving historical attempts and the
original review record.
