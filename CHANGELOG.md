# Changelog

This file tracks notable player- and administrator-visible changes to Mindspan.
Add entries under **Unreleased** as each change is completed; do not wait until
release day to reconstruct them from commit history.

## Unreleased

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
