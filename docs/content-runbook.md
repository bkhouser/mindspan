# Content curation runbook

Every published question needs a canonical answer, aliases (including the canonical form), exactly three plausible distractors, a concise explanation, deeper context, topic, difficulty 1–5, time limit 15–90 seconds, and at least one HTTPS source. Time-sensitive facts also need `verifiedAt` and should include `expiresAt`.

Bulk JSON uses this shape:

```json
{
  "topicSlug": "science-nature",
  "packSlugs": ["science-nature-starter"],
  "prompt": "Question text",
  "canonicalAnswer": "Answer",
  "aliases": ["Accepted alternative"],
  "distractors": ["Wrong A", "Wrong B", "Wrong C"],
  "explanation": "Why the answer is correct.",
  "details": "Extra context that helps retention.",
  "difficulty": 3,
  "timeLimitSeconds": 30,
  "removeLeadingArticles": true,
  "source": { "label": "Authoritative source", "url": "https://example.org/source" },
  "expiresAt": null
}
```

Submit `{ "dryRun": true, "questions": [...] }` to `/api/admin/questions/import` while signed in as a system admin. Correct validation or duplicate warnings before creating review records.

For media, record creator, source URL, license, alt text, MIME type, byte size, and audio/video duration before upload. Accept only original, public-domain, or appropriately licensed assets. Media questions also need a transcript or equivalent post-answer text. Review the prompt without relying solely on color, sound, or fine visual detail.

Editorial acceptance requires fact verification against the cited source, alias collision review, distractor plausibility, difficulty calibration, expiry choice, accessibility review, and a second person's approval before publication. Aim for 100 questions in each starter pack and 50 in each standard expansion pack. Starter packs should average approximately 3.0/5 difficulty, with 2.8–3.2 as the working acceptance band. Advanced expansion packs may intentionally average 4.0 or higher, but their names and descriptions must make that challenge clear. Maintain broad subtopic coverage within every pack and include at least 12 image, 4 audio, and 4 video questions across the initial catalog.
