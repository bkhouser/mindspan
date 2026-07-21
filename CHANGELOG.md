# Changelog

This file tracks notable player- and administrator-visible changes to Mindspan.
Add entries under **Unreleased** as each change is completed; do not wait until
release day to reconstruct them from commit history.

## Unreleased

## 1.0.0-rc.5 - 2026-07-21

### Fixed

- Corrected chained question replacements so the durable original question is
  removed from active play even when an intermediate replacement was never
  published. Existing attempts, points, mastery, feedback, approvals, and
  immutable question history remain unchanged.
- Preserved the retired question's historical taxonomy and per-question state
  so catalog finalization retains its subtopic evidence while the replacement
  begins with full novel-question value.
- Updated the Question Quality browser test to verify the complete current
  version 2 action-item export contract. The superseded rc.2, rc.3, and rc.4
  candidates were not deployed.

## 1.0.0-rc.1 - 2026-07-20

- Completed editorial certification of the 900-question core catalog: all
  current questions in the eight starter packs, **Easy Does It**, and
  **Trivia 101** now carry portable approvals, with no remaining review action
  items or unresolved player feedback in the final export.
- Replaced 11 questions rejected during final catalog review with fresh,
  broadly useful questions spanning filmmaking, history, everyday knowledge,
  science, and sports. The replacements keep pack sizes unchanged and use new
  question identities so earlier attempts and points remain historically
  accurate.
- Question Quality action-item exports now include **Rejected** questions as
  well as questions marked **Needs revision** or carrying unresolved player
  feedback, preventing rejected items from disappearing before remediation.
- Completed the final July 21 review round by preserving 888 exported
  approvals and raising the Rey/*Force Awakens* question from difficulty 2 to
  3. No question identity or historical player record changed.
- Applied the second completed July 21 question-review pass: six difficulty
  corrections, five requested answer-alias changes, a required-choice fix,
  clearer Sherlock Holmes wording, and a substantive Battle of Hattin
  explanation. All 855 approvals carried by the export were merged into the
  portable review ledger before the content changed.
- Reconciled the completed July 21 question-review pass: 130 action items now
  include corrected difficulty ratings and answer aliases, clearer recall
  wording, repaired water-polo and basketball answers, ten fresh replacements
  for questions judged too obscure or uninteresting, and four additional
  replacements that remove confirmed cross-pack duplicates. All 762
  portable approvals in the export were retained, and the already-present
  **Artists** detail tag was confirmed without creating a no-op revision.
- Rebuilt **Science & Nature Starter** around useful scientific concepts rather
  than database trivia: 38 obscure moon, scientist-field, medical-specialty,
  and extra element-symbol lookups were replaced, and the seeded photosynthesis
  explanation was strengthened. Two remaining reviewer notes were also applied
  to the Doppler-effect and stomata questions. The 100-question pack now spans
  15 science subtopics while preserving all 32 unchanged reviewer approvals.
- Rebuilt **Sports Starter** around varied, broadly useful sports knowledge:
  83 repetitive athlete, team, venue, and country lookups were replaced, 12
  worthwhile questions received stronger wording, difficulty, sourcing, or
  explanations, and five unchanged reviewer approvals were preserved. The
  100-question pack now spans 16 balanced subtopics with no category exceeding
  nine questions.
- Rebuilt 52 weak or repetitive questions in **Music Starter** and corrected
  two additional flagged questions. The pack now balances popular recordings
  with theory, instruments, classical music, jazz, blues and R&B, country and
  folk, world music, opera, musical theatre, hip-hop, and recording history;
  its 100-question size and overall difficulty distribution are unchanged.
- Replaced the decorative small-group coverage circles with one useful heatmap
  for every group size. Equal-sized percentage cells now accompany concise
  summaries of best-covered topics, single-player strengths, and coverage gaps.
- Question reviewers can now accept a player-reported answer and award the
  points it would have earned at submission time. The correction also updates
  mastery and correct-answer counts, records an auditable one-time adjustment,
  and marks the question for an accepted-answer revision.
- Rebuilt 78 weak or repetitive questions in **Geography Starter** with broader
  global coverage, varied question structures, and substantive answer
  explanations and context. The 100-question pack and its existing difficulty
  distribution are unchanged.
- Standardized sports terminology for the initial American audience: the app
  now says “soccer” for association football and “football” for the American
  game, including the corresponding sports subtopic names.
- Numeric answers now accept equivalent written-number responses and vice
  versa, including larger integers, comma-formatted values, negatives, and
  ordinary spoken decimals.
- Added a curated catalog-wide rule accepting the surname alone when a
  well-known person's full name is the canonical answer, while retaining
  explicit editorial control for ambiguous and culture-specific names.
- Question aliases that differ from the canonical answer only by a leading
  article such as “a,” “an,” or “the” are now omitted from reviewer views and
  future catalog versions because the answer matcher already accepts them.

### Added

- Question approvals can now travel safely between development and production
  through a source-controlled content-fingerprint ledger. Exact unchanged
  content retains its approval, while any revised immutable version returns to
  the unreviewed queue.
- Added 400 questions across eight 50-question expansion packs: **Body of
  Knowledge**, **Wild World**, **How It Works**, **Ancient Worlds**, **The
  American Story**, **Myth & Legend**, **At the Table**, and **Bookshelf
  Essentials**. All eight packs are globally disabled while they undergo
  editorial review, so administrators and question reviewers can inspect them
  without exposing them to players.

### Changed

- Reduced repetitive “how many seasons?” television recall to one catalog
  question, replacing the two excess Stargate prompts with more varied,
  broadly accessible questions. Catalog validation now prevents the pattern
  from becoming overrepresented again.
- Reconciled the latest 18 production question-review items and completed a
  full 1,500-question duplicate audit. Thirty-nine question records received
  corrections, stronger replacements, difficulty or alias updates, or richer
  reviewer classification; all exact and confirmed same-fact duplicates found
  by the pass were removed.
- Full question replacements now receive new question identities. Previously
  earned points and historical attempts remain intact, while the genuinely new
  question starts with fresh repeat value and review state. Corrections that
  continue testing the same fact still preserve the existing identity.
- Replaced the sprawling question-label system with one stable subtopic per
  question plus optional fine-grained detail tags. Question Quality presents
  the topic and subtopic as a compact hierarchy and shows detail tags to
  authorized reviewers; detail tags remain hidden from players.
- Applied the latest production review round: corrected eight Easy Does It
  classifications or difficulty ratings, added **Downey** as an accepted Iron
  Man answer, and rewrote the flagged Osiris question with clearer wording,
  context, classification, and sourcing.
- Question Quality now keeps clearly labeled Previous and Next buttons visible
  at the top and bottom of each review card, while disabling unavailable
  directions at the ends of a queue.
- Reconciled all 55 action items in the July 18 production Question Quality
  export: 21 were already resolved by broader catalog cleanup, 22 weak or
  unstable questions were replaced, 11 received targeted corrections, and one
  approved seed question was retained. The work removes additional obscure
  athlete, venue, scientist-field, chart, box-office, and niche-entertainment
  lookups while preserving stable question identities.
- Question Quality exports now include the submitted player answer associated
  with each feedback item, providing the evidence needed to resolve future
  **My answer should be accepted** reports.
- Replaced 38 repetitive History Starter questions built around obscure state
  capitals and monarch-country associations with a broader global mix covering
  archaeology, law, trade, religion, medicine, labor, political ideas,
  colonialism, decolonization, and international relations. The pack remains at
  100 questions with its original difficulty distribution.
- Reworked 48 Science & Nature Starter questions: eliminated all 16
  constellation-abbreviation and all 16 element-number recall prompts, replaced
  11 obscure element-symbol prompts with broader scientific knowledge, and kept
  only five familiar symbols at more appropriate difficulty levels. The pack
  remains at 100 questions with its original overall difficulty distribution.
- Question Quality now places a clearly labeled Question Index action directly
  beneath the selected pack instead of presenting it as navigation above the
  page, and the Question Index table uses a narrower responsive layout so its
  rightmost results and review information remain accessible in ordinary
  desktop windows.
- The incomplete Question Workshop is hidden from navigation and the Control
  Room while its protected implementation is retained for a future authoring
  redesign.
- The Achievements table now shows live progress counters for question, login,
  breadth, difficulty, and ranking milestones; completed achievements are
  ordered with the most recently earned first.
- Group Activity now shows an achievement's description directly beneath the
  earned-achievement entry, including for existing activity history.
- Corrected 24 question classifications involving the former **Animals**
  subtopic: replaced all 21 animal-biology prompts in the topic-specific
  Lifestyle & Culture Starter pack with human-centered customs, food, dress,
  holidays, and daily-life knowledge, and reclassified three mixed Easy Does
  It questions under Zoology, Visual Arts, and Color Theory as appropriate.

### Fixed

- Question Quality now retries transient player-answer statistics failures and
  keeps the reviewer usable if those nonessential statistics remain
  unavailable, instead of showing a full-page server error after saving an
  editorial decision.
- The landing and login pages now recognize an existing authenticated session
  and continue directly into Mindspan instead of incorrectly presenting the
  signed-out experience again.

## 1.0.0-beta.2 - 2026-07-16

### Added

- Question Quality now shows every distinct submitted player answer with usage,
  correctness, assistance, and answer-acceptance feedback counts. Individual
  feedback cards also show the answer associated with the player's reaction.
- A pack-scoped Question Index gives authorized reviewers a table of every
  published question, its answer, classification, difficulty, answer mode,
  editorial status, and unresolved quality flags, with direct links into review.
- A dedicated Question Reviewer role can use the index, Question Quality queues,
  editorial decisions, notes, and action-item exports without receiving broader
  system-administrator access.
- Reviewer decisions and global role changes now write their immutable audit
  records in the same database transaction as the protected change.

### Changed

- The Question Index now shows attempts, correct answers, accuracy, and clearly
  labeled player-feedback and formal-report indicators for every question.
- Admin and reviewer tools now live in an expandable, role-aware **Admin**
  submenu. Question Quality is the primary review destination, while its
  supporting Question Index remains available inside the scoped review flow.
- The Achievements page uses a denser table layout so more milestones fit on
  screen while names, descriptions, rewards, and completion dates remain easy
  to scan.
- Unlocked question packs now combine total, answered, and correct counts into
  one labeled color progress bar for faster comparison with less table clutter.
- Authorized reviewers can open any enabled pack's scoped Question Quality
  queue directly from the Question Packs page.
- The Question Quality workspace now keeps its pack chooser collapsed while
  reviewing, leaving only a compact current-pack progress row until an
  administrator chooses to switch packs.
- Question Quality hides aliases that only repeat the canonical answer,
  including capitalization and surrounding-whitespace differences.
- Question Reviewer feedback cards omit player names while retaining the answer
  and aggregate evidence needed to evaluate the question.
- Processed all 57 action items in the second production Question Quality
  export: eight were already resolved by the broad catalog cleanup, and 49
  received additional revisions or replacements based on reviewer notes and
  previously unreviewed player feedback.
- This beta.2 work now includes 196 revised questions relative to beta.1,
  covering repetitive prompts, weak explanations, answer acceptance, topic and
  subtopic placement, difficulty, answer mode, and source quality.
- Replaced 21 repetitive battle-location questions with a broader mix of
  civilization, political, cultural, diplomatic, and economic history.
- Reclassified all 42 remaining General Knowledge questions into meaningful
  topics and subtopics, and removed the catch-all category from future imports.
- Reduced exact-year recall to 11 questions catalog-wide, retaining landmark dates
  while replacing obscure release and event years with more useful knowledge.
- Answer submission now uses clearer submitted/checking language, freezes the
  timer immediately, and shows the point value awaiting server verification.
- Answer results return sooner by parallelizing independent progress reads and
  skipping achievement award checks that the player has already completed.
- Mindspan now prepares the next question in the background after an answer and
  starts its server-authoritative timer only when the player advances.
- Players can flag questions whose answers are given away by their wording,
  giving reviewers a specific reason to revise tautological prompts.

### Fixed

- Local Play controls now hydrate and respond when Mindspan is opened through
  `start.bat` at `127.0.0.1`, and no longer remain visibly disabled while the
  client-side game finishes loading.

## 1.0.0-beta.1 - 2026-07-15

### Added

- Mindspan now keeps a player-friendly update history in the app. After an
  upgrade, returning players see a one-time summary and can open **Updates** for
  complete notes, with unread versions highlighted.
- The current Mindspan version is now visible in the desktop navigation and on
  the Account page.
- Release tooling now counts catalog questions added, revised, and retired so
  significant question-quality work can be included in update notes.
- Players can flag a question as being assigned to the wrong topic, with an
  optional note for the question reviewer.

### Changed

- Reviewed all 35 questions in the first production quality export and revised
  their topics, pack placement, accepted answers, answer modes, difficulty, or
  teaching context as appropriate. This includes a balanced six-question pack
  rotation that keeps every starter pack at 100 questions and Trivia 101 at 50.
- Question-quality cards now show labeled subtopics in the top metadata line
  beside the pack, topic, and difficulty, including **None assigned** when a
  question still needs subtopic classification.
- Question-quality cards now identify whether a question uses a typed answer or
  required choices at 50% value.
- Question-quality review now labels the rejection action simply **Reject** and
  uses **X** as its keyboard shortcut.
- Group leaderboards now describe supporting statistics as percentage correct
  and number of different questions, removing the confusing overall proficiency
  percentage.
- Onboarding now moves directly from interest selection into Mindspan so new
  players can begin normal, adaptive play immediately.

### Fixed

- Play setup controls now wait until the page is interactive, preventing a very
  fast first click from being silently ignored.
- Display-name text entered immediately after the onboarding page appears is no
  longer lost when the interactive form finishes loading.
- Authentication refreshes now preserve Supabase's private, no-cache response
  headers and explicitly use long-lived cookies, so players remain signed in
  when closing and reopening their browser.
- Moving to the next question now automatically saves any unsaved question
  feedback details. If saving fails, the answer screen remains open so the
  player's feedback is not silently lost.
- Answer submission now freezes the visible timer and disables further input
  immediately. Server processing time is no longer counted against the player,
  and a tightly bounded allowance prevents ordinary request transit from turning
  an on-time answer into a timeout.

### Removed

- The separate 32-question assessment and its unearned achievement have been
  retired. Historical assessment records, earned awards, Insight, and mastery
  remain preserved.

## 0.2.0-beta.5 - 2026-07-14

This is the release-notes baseline for the invited private beta. Production now
contains real user accounts, groups, play history, and learning progress that
must be preserved by every subsequent release.

### Added

- Players can report that an answer they supplied should have been accepted.
- Administrators have question-quality review and export tools for evaluating
  player feedback and content issues.

### Changed

- Added the intended Jefferson answer alias to the affected catalog question
  while preserving the immutable version used by earlier attempts.
