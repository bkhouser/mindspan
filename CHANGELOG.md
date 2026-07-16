# Changelog

This file tracks notable player- and administrator-visible changes to Mindspan.
Add entries under **Unreleased** as each change is completed; do not wait until
release day to reconstruct them from commit history.

## Unreleased

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
