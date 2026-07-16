# Mindspan Feature Roadmap

This is a living list of product opportunities beyond the current private-beta
scope. Items are candidates, not release commitments. Priority and scope should
be revisited after observing real play patterns, support requests, content costs,
and group behavior during beta.

## Status guide

- **Candidate** — worth exploring; requirements still need validation.
- **Defined** — expected experience and acceptance criteria are understood.
- **Scheduled** — assigned to a target release after explicit prioritization.
- **In progress** — implementation has begun.
- **Released** — available to players.

## AI-assisted learning

### AI “Tell me more” explanations

**Status:** Defined  
**Priority:** High candidate  
**Surfaces:** Post-answer feedback and Review history

Add a **Tell me more** button after a question has been finalized. It requests a
substantially deeper explanation through the OpenAI Responses API and presents it
without interrupting the play session. The generated material should help the
player understand and remember the answer, not merely restate it.

Suggested response sections:

1. The idea in plain language.
2. Why the fact matters or how it fits into its broader topic.
3. A memorable analogy, mnemonic, or mental model when appropriate.
4. Commonly confused facts or plausible wrong answers.
5. Two or three closely related facts that may appear in future trivia.

Implementation principles:

- Call OpenAI only from a trusted server route. Never expose the API key to the
  browser.
- Allow access only after the player has answered the presentation; never send
  answer-bearing content through a pre-answer endpoint.
- Ground the request with the immutable question version, canonical answer,
  authored explanation, detailed context, topic/subtopics, difficulty, and
  reviewed sources.
- Use a structured response contract so headings and content can be rendered
  consistently and validated before display.
- Label the expansion as AI-generated and retain the original reviewed
  explanation and citations alongside it.
- Cache a successful expansion by question-version, prompt-version, model, and
  locale. Reuse it across players unless personalization is intentionally added
  later.
- Store generation time, token usage, model identifier, prompt version, and
  moderation/result status for operational and cost auditing.
- Apply per-user and global rate limits, a bounded output size, request timeout,
  retry limits, and a monthly spend ceiling. A failed request must leave the
  normal answer screen fully usable.
- Extend the compact question-feedback path to AI explanations so weak or
  inaccurate expansions can be reviewed and invalidated.
- Evaluate output quality with a fixed set of questions from all eight topics,
  including dates, disputed facts, sensitive history, and time-sensitive content.
- Select the production model during implementation using current quality,
  latency, and cost evaluations rather than hard-coding today’s recommendation
  into the roadmap.

Acceptance criteria:

- The button appears only after an answer or in the player’s private Review
  history.
- The first uncached response normally begins rendering within two seconds and
  completes within an agreed latency budget.
- Repeat requests for the same question version use the approved cached result.
- The response never changes scoring, mastery, achievements, or the authored
  canonical answer.
- API keys and raw provider errors are never returned to the client.
- Administrators can inspect, invalidate, and regenerate cached expansions.
- Usage and cost can be measured per day, user, question, and model.

The current OpenAI model catalog exposes text-capable models through the
[Responses API](https://developers.openai.com/api/docs/models). Final model and
pricing decisions should be made when this feature is scheduled because both can
change.

### Personalized AI tutoring pages

**Status:** Defined  
**Priority:** High candidate  
**Depends on:** AI “Tell me more” generation, grounding, caching, safety, and
cost controls

Add a private tutoring area that turns a player’s demonstrated weak spots into a
short, structured lesson. The tutor should use topic and subtopic proficiency,
confidence/evidence, recurring incorrect answers, due reviews, and the player’s
stated interests to recommend useful areas—not simply force the lowest percentage
topic.

Proposed experience:

1. Show two or three recommended lesson targets and explain why each was chosen.
2. Let the player choose a topic, lesson goal, and approximate duration such as
   5, 10, or 20 minutes.
3. Generate a page containing a plain-language overview, core concepts,
   connections between facts, memory aids, common confusions, and a concise
   recap.
4. Insert retrieval checkpoints using reviewed Mindspan questions where possible.
5. Finish with suggested packs or review queues that reinforce the lesson.
6. Let the player dismiss or deprioritize topics they do not currently want to
   study, even when those topics are objectively weak.

Implementation principles:

- Generate from a server-created learner snapshot containing only the current
  player’s relevant aggregate mastery and selected question history. Never include
  another group member’s private attempts.
- Ground lessons in immutable question versions, reviewed explanations, source
  citations, and the approved AI expansions from **Tell me more**.
- Explain recommendations with neutral language such as “limited evidence” or
  “frequently missed,” avoiding labels that shame the player.
- Keep authored questions and AI-generated teaching content distinct. Generated
  checkpoints do not award competitive points or mastery evidence; reviewed
  Mindspan questions continue to use the normal server-authoritative attempt flow.
- Store the mastery snapshot, selected goal, prompt version, model identifier,
  sources, generation metadata, and lesson version so the result is auditable and
  reproducible.
- Cache reusable topic teaching blocks, but generate the lesson outline and
  emphasis from the individual player’s current evidence.
- Regenerate or mark a lesson stale when the underlying question content changes
  materially or the player’s evidence has advanced enough to change the target.
- Apply the same output validation, moderation, rate limits, spending controls,
  feedback, administrative inspection, and failure fallback as **Tell me more**.
- Make the page printable, keyboard accessible, and easy to resume across
  devices.

Acceptance criteria:

- Recommendations account for both weakness and player interest, and clearly
  state why each topic was suggested.
- A player can manually request a lesson for any enabled topic or subtopic.
- Every factual section is traceable to reviewed Mindspan content and its sources.
- The lesson cannot alter points, mastery, achievements, or Insight merely by
  being opened or read.
- Only completed reviewed-question attempts can add normal mastery evidence.
- The player can resume a lesson and see which sections and checkpoints were
  completed.
- Administrators can inspect, invalidate, and regenerate a lesson without seeing
  unrelated private answer history.
- Effectiveness is measured through later recall on reviewed questions, not only
  lesson opens or time spent.

### AI-assisted content workshop

**Status:** Candidate

Let system administrators request draft aliases, distractors, subtopics,
explanations, and source-search suggestions. All generated content must enter the
existing review workflow; the model must never publish questions directly.

### AI-generated custom personal packs

**Status:** Candidate

**Priority:** Premium candidate

**Depends on:** AI content generation, source grounding, validation, moderation,
cost controls, and pack-generation economics

Let a player request a personal pack for a topic of their choice. Mindspan uses
AI to propose, validate, and assemble the questions, then sells the finished pack
to that player for a premium amount of Insight. The creation flow should show the
proposed topic, scope, approximate difficulty, question count, price, and expected
generation time before the player confirms the purchase.

Proposed experience:

1. The player enters a topic such as **Women in early aviation**, **1980s college
   basketball**, or **Italian opera**.
2. Mindspan checks the request for safety, reasonable scope, duplication with
   existing packs, and sufficient reliable source material.
3. The player selects a difficulty profile and one of a small number of pack
   sizes.
4. Mindspan quotes the premium Insight price before deducting currency.
5. Generation runs asynchronously and produces a private draft pack with a clear
   status and retry/refund behavior if creation fails.
6. The player receives the pack after automated factual, answer-collision,
   citation, formatting, and duplicate checks pass.

Quality and fairness principles:

- Ground factual claims in reputable sources and retain citations and generation
  metadata for every generated question.
- Use separate generation and verification passes; do not treat a model's first
  answer as proof that a question is correct.
- Validate canonical answers, aliases, distractors, dates, ambiguity, and
  time-sensitive claims against the same structural rules used by authored packs.
- Clearly label questions as AI-generated and provide an especially prominent
  report path.
- Make early custom packs private and practice-only. They should not affect
  competitive points, group leaderboards, achievements, or shared mastery until
  their quality is proven or the questions complete an appropriate review path.
- Do not automatically publish one user's custom pack to other players. Sharing,
  marketplace sales, and creator rewards require separate privacy, moderation,
  licensing, and abuse requirements.
- Apply per-user generation limits, predictable pack sizes, spend ceilings, and
  idempotent Insight charges. Failed validation or generation must not consume
  the purchase permanently.
- Reject requests for unsafe material or topics that cannot support enough
  reliable, age-appropriate trivia questions.

Acceptance criteria:

- The player sees and confirms the exact Insight price before generation begins.
- Currency deduction and pack creation are transactional and retry-safe.
- Every delivered question passes automated schema, citation, ambiguity,
  duplication, and answer-quality checks.
- A failed or rejected generation produces a clear explanation and automatic
  Insight refund.
- Custom content cannot influence competitive rankings while it remains
  unreviewed.
- System administrators can inspect, disable, regenerate, or refund a custom pack
  without exposing unrelated private player data.

## Gameplay and learning

### Player levels and renewable Insight

**Status:** Defined

**Priority:** High candidate

**Depends on:** Initial private-beta scoring data and economy simulation

Add a global player level based on career points. Levels provide an easily
understood measure of accumulated play experience, while topic mastery,
accuracy, and leaderboard statistics continue to describe demonstrated
knowledge and competitive performance.

Proposed experience:

1. Every player begins at level 1 with zero career points.
2. Career points are the sum of points earned through finalized scored-question
   attempts and are never spent.
3. Reaching a new level awards Insight automatically and presents a visible
   level-up celebration.
4. Point requirements increase with each level, while later levels award more
   Insight.
5. Selected expansion packs may require both sufficient Insight and a minimum
   player level. Starter, beginner, and general expansion packs should remain
   available without restrictive level gates.
6. Profiles and appropriate group views show level as a concise experience
   comparison alongside, not in place of, mastery and accuracy.

Economy and fairness principles:

- Continue using awarded question points as the progression input. Novel,
  difficult, quickly answered questions advance levels faster, while assistance
  and repeated correct answers naturally produce less or no progress.
- Do not deduct career points when Insight is spent or a pack is unlocked.
- Keep achievement Insight as meaningful one-time bonuses; level rewards supply
  the renewable path needed as the pack catalog grows.
- Grandfather access to packs a player already owns if a level requirement is
  introduced or raised later.
- Make every pack's Insight price, level requirement, and the player's progress
  toward both requirements clear before purchase.
- Do not imply that a higher level alone means greater knowledge. A broadly
  experienced player and a lower-level topic specialist may have very different
  mastery profiles.

Data readiness and rollout:

- The current attempt history is sufficient for a retroactive rollout. Each
  finalized attempt stores its awarded points, question version, assistance and
  timing state, scoring snapshot, and algorithm version. Assessment attempts
  explicitly award zero points.
- Treat finalized attempts as the career-point source of truth. Derived profile
  totals and levels must be rebuildable from that history rather than maintained
  as an independent counter that can drift.
- Preserve all existing attempts and immutable question-version references in
  every production migration, catalog update, and deployment.
- Before choosing a curve, analyze beta distributions for points per session,
  points per unique question, assisted-answer frequency, repeated-question
  value, and differences between occasional and frequent players.
- Simulate candidate level thresholds and Insight rewards against existing
  production histories. Introduce levels retroactively and award existing
  players the level and cumulative level-up Insight they have earned.
- Store a progression-rule version with level awards so later economy changes
  remain auditable and retry-safe.

Acceptance criteria:

- A player's career points and level can be reconstructed exactly from finalized
  attempt history.
- Assessment answers and any future explicitly noncompetitive practice modes do
  not advance career points.
- Level-up Insight is issued exactly once per reached level, including during a
  retroactive backfill or retry.
- Existing players receive full credit without losing accounts, groups,
  attempts, mastery, achievements, feedback, media, pack ownership, or Insight.
- Existing pack owners retain access regardless of later level-gate changes.
- Automated simulations demonstrate that casual beta players can unlock new
  content at a reasonable pace without making repeated-question farming useful.

### Depth-versus-breadth learning preference

**Status:** Defined

**Priority:** High candidate

**Surface:** Player preferences and Mixed Play

Add a player-controlled slider with **Increase depth of knowledge** at one end,
**Increase breadth of knowledge** at the other, and **Balanced** as the default.
The preference changes how Mixed Play chooses topics and difficulty; it does not
change scoring, mastery calculations, question values, or leaderboard rules.

Selection behavior:

- Moving toward **depth** increases the weight of higher-difficulty questions in
  the player's strongest or most-practiced selected interests, helping the player
  turn familiarity into expertise.
- Moving toward **breadth** increases the weight of topics and subtopics with low
  proficiency or limited evidence, helping the player cover knowledge gaps.
- The balanced midpoint preserves the ordinary adaptive scheduling mix.
- Due retention reviews and the no-immediate-repeat rule continue to apply at all
  slider positions.
- Explicit Topic or Pack Play overrides this preference because the player has
  already chosen what to study.
- The system should respect topic interests and any future topic-deprioritization
  controls. Breadth must not continually force a player into subjects they have
  explicitly said they do not want to study.

Implementation principles:

- Persist the setting per user and synchronize it across devices.
- Treat the slider as a continuous scheduling weight rather than three unrelated
  modes, while providing accessible named values such as **Depth**, **Balanced**,
  and **Breadth** for keyboard and screen-reader users.
- Store the preference and selection-algorithm version with each play session so
  question-selection behavior remains auditable.
- Use bounded weighting: even the extreme depth setting retains some novel and
  cross-topic questions, while the extreme breadth setting retains some practice
  in established strengths.
- Explain the effect beside the control with a short, live summary of the current
  setting.

Acceptance criteria:

- Changing the slider measurably shifts topic and difficulty selection over a
  deterministic simulation without excluding required reviews.
- The preference never directly changes points, mastery evidence, achievements,
  or competitive rank.
- A player can reset the control to Balanced.
- The setting works with keyboard input, exposes its value to assistive
  technology, and persists across sessions and devices.

### Achievement-unlocked lifelines

**Status:** Candidate

Add 50/50, timer extension, skip, and similar assistance events. Lifelines may
cost Insight, reduce the available point ceiling, require an achievement, or use
a combination of those constraints. Keep their effects server-authoritative and
auditable through the existing assistance-event model.

### Per-question typing-time allowance

**Status:** Candidate

Allow content authors to add a small, explicit typing allowance to questions
whose expected answers are unusually long, such as multi-word names, titles, or
short lists. The allowance extends the answer deadline without increasing the
question's point ceiling.

Fairness and implementation principles:

- Keep the ordinary global or group timer as the competitive scoring window.
  After that window ends, the time factor remains at its minimum while the
  player uses the added typing time; padding can prevent a timeout but cannot
  improve the score.
- Show the allowance clearly in the timer UI, for example **30s + 8s typing**,
  and have both countdown bars represent the full available answer window.
- Make padding an authored question-version field with a conservative maximum,
  validation, and review requirement. Do not infer it from difficulty alone.
- Recommend padding from canonical-answer and alias length during content
  authoring, while leaving the final value under human editorial control.
- Preserve server-authoritative expiry and store the base window, typing
  allowance, effective deadline, and scoring snapshot with each attempt.
- Apply the feature to timed play only; historical untimed assessment attempts
  do not use it.

Acceptance criteria:

- A padded question remains answerable for exactly the configured additional
  time and then times out normally.
- Extra time never increases available points or mastery speed credit compared
  with the same answer submitted at the end of the base timer.
- Global and group timer overrides continue to use the same normalized scoring
  baseline.
- Players can distinguish ordinary time from typing allowance without relying
  on color alone.

### Achievement progress counters and recent-first ordering

**Status:** Candidate

Make achievement goals feel attainable by showing measurable progress toward
each unfinished achievement. For example, **Become ranked in five topics**
would show **3/5 topics**, while a question-count milestone could show **37/50
questions**. Progress should come from the same trusted data used to award the
achievement so the displayed counter and eventual award cannot disagree.

Order completed achievements by `earned_at` with the most recently earned at
the top. Keep incomplete achievements easy to scan beneath them, prioritizing
the ones closest to completion when comparable progress is available.

Acceptance criteria:

- Every achievement with a countable requirement can expose a current value,
  target value, and plain-language unit without duplicating evaluator logic in
  the browser.
- Progress is capped at the target and changes after the qualifying play or
  group activity is persisted.
- Earned achievements are sorted newest to oldest and continue to display their
  earned date and Insight reward.
- Achievements without meaningful numeric progression use a clear incomplete
  state rather than a misleading `0/1` counter.
- Counters remain understandable with keyboard navigation, screen readers, and
  narrow mobile layouts.

### Advanced review tools

**Status:** Candidate

Add incorrect-only and topic filters, bookmarks, custom review sessions,
retention-due queues, and an option to retry a missed question without granting
competitive points immediately.

### Difficulty filters for Play and Review

**Status:** Candidate

Let players select one or more difficulty levels, shown with the existing
one-to-five-star scale, when starting play or browsing their answer history.

Proposed behavior:

- **Play:** Mixed, topic, and pack setup can optionally restrict selection to
  chosen difficulty levels. Adaptive difficulty remains the default when no
  filter is active.
- **Review:** Filter historical attempts by the difficulty of the immutable
  question version that was actually presented. Combine the filter with topic,
  pack, and correct/incorrect controls.
- Preserve ordinary scoring, mastery, repeat decay, and review scheduling. A
  difficulty filter changes question eligibility, not question value.
- If the chosen topic or pack has no eligible questions, explain why and offer
  to broaden the selected difficulty range rather than silently ignoring the
  filter.
- Display active filters prominently and provide a one-step reset to the normal
  adaptive selection behavior.

Acceptance criteria:

- A filtered play session serves only the selected difficulty levels.
- Review results use the difficulty stored with each historical question
  version, even if a newer version has a different difficulty.
- Filters are keyboard accessible, mobile friendly, and represented by both
  stars and text or accessible labels.
- Removing all filters restores the existing adaptive play and complete review
  history.

### Content correction and attempt regrading

**Status:** Candidate

Give system administrators a controlled workflow for correcting a published
answer or collision rule and regrading affected attempts. Regrading must update
points, mastery evidence, question state, subtopic aggregates, achievements, and
Insight consistently while preserving a complete audit record.

### Reminders and healthy-session controls

**Status:** Candidate

Offer opt-in practice reminders, configurable notification schedules, and better
break controls. Mindspan should remain playable ad hoc and indefinitely; reminders
must not turn the product into a mandatory daily trainer.

### Expanded multimedia play

**Status:** Candidate

Grow the licensed image, audio, and video catalog; add post-answer transcripts,
playback accessibility, and media-specific review tools.

### Beginner-friendly question packs

**Status:** Candidate

Add welcoming, intentionally easy packs for new players, casual groups, and
players building confidence in weaker subjects. Possible names include **Easy
Does It**, **Warm-Up Round**, **Trivia 101**, and **Confidence Builder**.

Target an average difficulty around 1.5–2.0/5 with clear wording, familiar
subjects, useful explanations, and enough breadth to introduce several main
topics. Recommend these packs during onboarding or when a player has limited
evidence in several topics, but keep them optional.

Use the normal difficulty-based point values, repeat decay, assistance penalty,
and retirement rules. This lets easy packs provide legitimate early leaderboard
progress without making them more valuable than harder knowledge. Treat
“Questions for Dummies” only as a concept reference unless branding review
confirms that the name can be used.

### Licensed Jeopardy! archive expansion packs

**Status:** Candidate  
**Dependency:** Content license and trademark review

Offer themed expansion packs built from actual historical Jeopardy! clues and
responses when Mindspan has an official license or another documented grant of
rights to use them. Do not scrape, import, or republish unofficial clue archives
without verified authorization, and do not imply affiliation with Jeopardy!
unless the applicable agreement permits it.

Preserve source provenance for every clue, including episode air date, round,
category, original value, and any supplied attribution. Present the clue in its
original answer-first form while accepting the expected response without
requiring players to type “What is” or “Who is” during ordinary Mindspan play.

Map clues onto Mindspan's 1–5 difficulty scale using round, value, broadcast era,
and observed player performance rather than treating the original dollar value
as a universal difficulty score. Support packs organized by subject, era,
tournament, or difficulty, and allow licensed content to be disabled promptly
without deleting ownership or historical attempt records.

## Groups and competition

### Group status panel on Home

**Status:** Candidate

Replace the removed group-count box with a useful summary: recent group activity,
coverage gaps, current leaders, invitations, and suggested topics where the group
needs more depth.

### Cross-group and public leaderboards

**Status:** Candidate

Allow groups to opt into broader competition without exposing private profiles or
answer histories. Define minimum evidence and anti-abuse rules before enabling
public ranking.

### Group chat and feed moderation

**Status:** Candidate

Add lightweight group conversation around activity and questions. Introduce group
admin moderation permissions only when user-authored content exists.

### Synchronous multiplayer

**Status:** Candidate

Add hosted live rounds with synchronized questions, answer locking, host controls,
latency-tolerant timers, and post-game scoring. Preserve asynchronous training as
the primary experience.

## Content operations and security

### Question reviewer role

**Status:** Defined

**Priority:** High candidate

**Scope:** Global role, because Mindspan's published question catalog and packs
are shared across all groups

Add a dedicated **Question Reviewer** security role for trusted people who help
evaluate question quality but should not receive full system-administrator
access. System administrators retain all reviewer capabilities.

Reviewer permissions:

- Open the Question Quality dashboard and its pack-level queues.
- Inspect question prompts, answer modes, canonical answers, aliases,
  distractors, explanations, deeper context, sources, topics, subtopics,
  difficulty, pack placement, and immutable version history.
- See question-specific player feedback and formal content reports without
  receiving access to unrelated private attempts, typed-answer history, email
  addresses, or account-administration data.
- Record **Approved**, **Needs revision**, or **Rejected** editorial decisions,
  add editorial notes, and mark the feedback attached to that question version
  as reviewed.
- Export the same limited question-action-items file used to prepare catalog
  corrections.

Explicit exclusions:

- Reviewers cannot create, edit, publish, retire, import, or bulk-replace
  question content directly.
- Reviewers cannot enable packs, change prices, edit achievements, award or
  spend Insight, alter scoring, or change global settings.
- Reviewers cannot invite, disable, promote, or inspect private records for
  users; manage groups; assign roles; or access the full system audit log.
- Reviewers cannot grant or revoke their own role. Only a system administrator
  can assign it, with explicit confirmation and an immutable audit entry.

Implementation principles:

- Extend the global role model to `user | question_reviewer | sys_admin`; do not
  model review authority as a group role.
- Enforce every permission in PostgreSQL row-level policies and trusted server
  code. Hiding administrator navigation is not an authorization control.
- Centralize capability checks such as `can_review_questions` so reviewer and
  system-administrator behavior stays consistent across pages, actions, APIs,
  exports, and future review tools.
- Keep player feedback attribution minimized. Expose only information necessary
  to evaluate the question and whether the submitted answer should have been
  accepted.
- Preserve all editorial decisions with reviewer identity and timestamps so an
  administrator can audit or supersede them without deleting history.

Acceptance criteria:

- A reviewer can complete the full question-quality workflow and export action
  items without accessing the broader system-admin console.
- Direct requests to user administration, pack administration, content editing,
  imports, settings, and private attempt APIs are denied server-side.
- Removing the role ends reviewer access immediately without deleting prior
  reviews or changing their recorded author.
- Authorization tests cover a normal user, question reviewer, system admin,
  disabled reviewer, and reviewer whose role was revoked.
- Existing system administrators retain every current capability after the role
  migration.

### Dual question-quality ratings

**Status:** Defined

**Priority:** High candidate

**Depends on:** Question reviewer role and sufficient production attempt data

Add two private quality ratings to every immutable question version. Both use a
conventional five-star scale: **5 stars means excellent** and **1 star means
poor**. They appear only in the Question Quality/reviewer experience and its
restricted exports; players never see them during Play, Review, pack browsing,
or on profiles.

#### Reviewer rating

The **Reviewer rating** is an explicit editorial judgment entered by an
authorized question reviewer or system administrator. It answers: “How strong
is this as a fair, interesting, well-written trivia question?”

- Rating is optional until a reviewer evaluates the question.
- Store the rating on the exact immutable question version with reviewer,
  timestamp, and optional supporting note.
- A later reviewer may revise the rating, but retain an auditable rating history.
- Publishing a materially revised version starts with no reviewer rating; do not
  silently inherit a rating earned by different wording, answers, or choices.
- Suggested anchors:
  - **5:** Excellent—clear, interesting, accurate, fair, and worth keeping.
  - **4:** Strong—minor imperfections but solid for normal play.
  - **3:** Acceptable—usable, though ordinary or in need of modest refinement.
  - **2:** Weak—significant concern; revise or consider replacement.
  - **1:** Poor—misleading, unfair, uninteresting, or a strong retirement
    candidate.

#### System rating

The **System rating** is calculated when the reviewer page or queue is loaded
from the latest eligible production evidence. It answers: “How healthy does
this question appear in actual play?” Display the calculation timestamp,
confidence/evidence level, and a concise factor breakdown beside the stars.

Candidate inputs include:

- Difficulty- and player-proficiency-adjusted success rate, rather than raw
  percentage correct alone.
- Optional **Show choices** rate for recall questions. Required-choice questions
  must use a separate baseline because choices are mandatory by design.
- Timeout, abandonment, and unusually long answer-time rates.
- Thumbs-up/down balance and structured player-feedback reasons, especially
  incorrect answer, answer should have been accepted, unclear wording, poor
  choices, wrong topic, outdated content, typo, and weak explanation.
- Formal reports, unresolved flags, editorial verdicts, and whether prior
  feedback has already been reviewed.
- Answer-alias misses or repeated reports suggesting that valid variants are not
  accepted.
- Number of attempts and distinct players, with diminishing influence from
  repeated exposure by the same person.

Scoring safeguards:

- Show **Insufficient evidence** instead of a star rating below an agreed minimum
  of distinct players and attempts. Show **Provisional** until confidence is
  strong enough for normal triage.
- Normalize performance expectations by authored difficulty, answer mode,
  assistance availability, and player proficiency so genuinely difficult
  questions are not punished merely for being difficult.
- Keep the manual reviewer star rating out of the system formula so the two
  ratings remain independent. Structured editorial verdicts and unresolved
  findings may contribute as separate operational signals.
- Version the formula and retain periodic snapshots so a score can be explained
  and historical changes can be audited.
- Recalculate from aggregate evidence without exposing player identities or raw
  private answer histories.
- Treat the system rating as a diagnostic aid, never an automatic publication or
  retirement decision.

Reviewer experience:

- Show both ratings together with unambiguous labels such as **Reviewer** and
  **System**, plus the words **Excellent**, **Strong**, **Acceptable**, **Weak**,
  or **Poor** so meaning does not depend on star color alone.
- Let reviewers sort and filter by either rating, unrated questions,
  insufficient evidence, rating disagreement, confidence, pack, topic,
  difficulty, feedback status, and editorial verdict.
- Highlight large disagreements, such as a five-star reviewer rating paired with
  a one- or two-star system rating, for human investigation.
- Provide a removal-candidate queue based on low ratings and sufficient evidence,
  while requiring a reviewer decision before revision, replacement, or
  retirement.

Export requirements:

- Include the reviewer rating, descriptive label, rating timestamp, and optional
  rating note for every exported question. Identify the reviewer only within the
  restricted administrative export and use a stable account identifier rather
  than unnecessary profile details.
- Include the system rating or **Insufficient evidence** state, descriptive
  label, calculated timestamp, evidence/confidence status, attempt and distinct
  player counts, formula version, and concise factor breakdown.
- Preserve the distinction between **Provisional** and established system
  ratings so downstream review does not overstate limited evidence.
- Add questions with a one- or two-star reviewer rating to the action-items
  export even when they have no separate `needs_revision` verdict or unresolved
  player flag.
- Add questions with a one- or two-star system rating only when the configured
  evidence and confidence threshold is satisfied. A provisional or
  insufficient-evidence score alone must not create an action item.
- Record the rating filters and formula version in the export metadata so a
  later review can reproduce why each question was selected.

Acceptance criteria:

- Reviewer ratings are version-specific, auditable, and writable only by a
  question reviewer or system administrator.
- System ratings are deterministic for the same evidence and formula version,
  with unit tests for each factor and boundary.
- A low sample never produces a confidently poor rating.
- Required-choice questions are not penalized for always displaying choices.
- Raw difficulty and low success alone cannot mark an otherwise healthy hard
  question as poor.
- Neither rating affects player scoring, mastery, question difficulty, pack
  ownership, or leaderboards.
- No question is automatically retired, unpublished, or removed from play based
  solely on either rating.
- Every question-quality export includes the complete reviewer and system rating
  fields, including explicit null or insufficient-evidence states rather than
  silently omitting unavailable ratings.

### System-admin user detail and support tools

**Status:** Defined

**Priority:** High candidate

**Access:** System administrators only; question reviewers and group
administrators receive no access through this feature

Add a dedicated user-detail page reached from the system-admin user list. It
combines account support, aggregate gameplay history, group membership, and
carefully controlled administrative actions without exposing authentication
secrets or encouraging silent edits to competitive data.

User overview:

- Display name, avatar, email address, account status, global role, account
  creation and confirmation dates, onboarding state, last successful sign-in,
  and last activity.
- Current groups and group roles, including when each membership began.
- Lifetime points, questions answered, different questions answered, percentage
  correct, assistance rate, timeouts, play sessions, current and longest play
  streaks if streaks are later added, and activity by date.
- Topic and subtopic statistics, pack ownership and progress, achievements with
  award dates, Insight balance and ledger summary, and future player level.
- Counts and status summaries for question feedback, formal reports, invitation
  history, and support-related account events.
- A chronological, filterable history of meaningful events such as account
  creation, confirmation, profile changes, group joins/leaves, role changes,
  achievements, pack unlocks, account restrictions, session revocations, and
  administrator actions.

Administrative actions:

- Edit display name and avatar metadata with a required reason and audit entry.
- Send a password-reset email. Administrators can never view, retrieve, or
  directly assign a password.
- Resend account confirmation or invitation email when applicable.
- Revoke all active sessions, requiring the user to sign in again.
- Disable or reactivate an account with an explicit reason and confirmation.
- Add or remove group memberships and change group roles while preserving the
  rule that every group must retain at least one administrator.
- Promote or demote the global system-admin role only through the existing
  high-friction confirmation and audit process; prevent removal of the final
  active system administrator.
- Correct display-only profile metadata without altering attempts, earned
  points, mastery evidence, achievements, or currency history.

Email and identity safeguards:

- Treat an email-address change as an identity-security operation, not a normal
  profile edit. Prefer a user-confirmed change flow sent to the old and new
  addresses, with session revocation after completion.
- Never display password hashes, refresh tokens, magic-link tokens, provider
  secrets, recovery codes, or raw authentication claims.
- Clearly distinguish **Send reset email** from **Revoke sessions** so support
  staff understand what each operation does.
- Notify the affected user after sensitive actions such as email changes,
  password-reset initiation, role changes, account disablement, or session
  revocation, unless doing so would undermine an active security response.

Privacy and data-integrity principles:

- Default to aggregates and operational events. Do not expose raw typed answers,
  unrelated private feedback text, or complete attempt payloads on the main
  page.
- Permit narrowly scoped attempt inspection only through a separate support
  action with a stated reason, audit entry, and clear indication that private
  player data is being opened.
- Every mutation runs through trusted server code, checks the administrator's
  current role again, records before/after values and reason in the immutable
  audit log, and is idempotent where retries are possible.
- Administrative corrections must not rewrite historical attempts, question
  versions, Insight ledger entries, achievement awards, or group activity
  history. Use compensating records when a future correction workflow genuinely
  requires one.
- Provide date-range and event-type filters so useful history can be reviewed
  without loading an unbounded account timeline.

Acceptance criteria:

- A system administrator can find a player, understand their account and
  gameplay status, and complete common support actions from one page.
- Sending a password reset creates a normal expiring reset flow; no administrator
  can learn or choose the resulting password.
- Group edits enforce final-group-admin protection under concurrent requests.
- Final-system-admin protection applies to demotion, disablement, and deletion.
- Disabled accounts lose access immediately while their groups, attempts,
  mastery, feedback, packs, achievements, and audit history remain preserved.
- Direct access by normal users, question reviewers, group administrators, and
  former system administrators is denied server-side and by database policy.
- Authorization and concurrency tests cover every sensitive action, including
  stale pages where the acting administrator's role was revoked before submit.
- All sensitive changes appear in the audit timeline with actor, time, reason,
  and before/after state.

### Separate admin pages and navigation

**Status:** Defined

**Priority:** High candidate

Replace the growing combined admin screen with focused pages and show each
available function as a nested subitem beneath **Admin** in the main navigation.
Keep a compact Admin overview as the landing page, but use it for status,
attention queues, and links rather than placing every management form on one
long page.

Proposed Admin navigation:

- **Overview** — system status, catalog counts, unresolved issues, recent admin
  activity, and shortcuts to queues needing attention.
- **Users** — user search, invitations, roles, account status, and links to the
  system-admin user detail page.
- **Groups** — system-level group search and exceptional support operations;
  normal group administration remains on each group's own page.
- **Question Quality** — reviewer queue, player flags, editorial decisions,
  quality ratings, filters, and action-item export.
- **Questions** — drafting, editing, version history, publication, retirement,
  and bulk import.
- **Packs** — pack metadata, pricing, availability, ownership diagnostics, and
  question membership.
- **Topics & Subtopics** — taxonomy, ordering, aliases, and classification
  maintenance.
- **Achievements & Insight** — achievement definitions, rewards, progression
  diagnostics, and currency-ledger support tools.
- **Media** — private question assets, attribution, licensing, transcripts,
  metadata, and orphaned-file review.
- **Feedback & Reports** — general beta feedback and operational reports that do
  not belong to the question-quality queue.
- **Updates** — release-note drafting and visibility controls when in-app update
  publishing becomes administrative rather than repository-managed.
- **Settings** — global game defaults and other deliberately configurable system
  behavior.
- **Audit Log** — immutable administrative and security events with filters and
  export.

Navigation behavior:

- On desktop, **Admin** expands into an indented submenu in the left navigation
  and keeps the current page visibly selected.
- On smaller screens, present the same destinations in an accessible expandable
  section or Admin landing menu without crowding the primary player navigation.
- Remember whether the Admin section was expanded for the current browser, but
  automatically reveal it when the active page is inside Admin.
- Support keyboard navigation, visible focus, screen-reader expansion state,
  reduced motion, and direct links to every page.
- Show only destinations the current role can use. A Question Reviewer sees
  **Question Quality** but not Users, Questions, Packs, Settings, or Audit Log.
  System administrators see the complete applicable set.
- Do not show placeholder menu items for features that have not been released.
  Add each item when its corresponding page is functional.

Architecture and security principles:

- Give every function a stable route and page-level loading, empty, error, and
  permission-denied states; avoid implementing the sections as tabs that still
  load all admin data at once.
- Keep list filters, sorting, pagination, and return location in the URL so pages
  can be bookmarked and shared between authorized administrators.
- Reuse consistent page headers, attention counts, tables, confirmation dialogs,
  and audit-reason controls across all admin sections.
- Enforce authorization independently in every page, server action, route
  handler, database function, and row-level policy. A hidden submenu item never
  grants or removes permission.
- Avoid duplicating ownership: question-specific player feedback belongs in
  Question Quality, while broad beta feedback belongs in Feedback & Reports.
- Let the Overview aggregate counts and health indicators, but defer detailed
  records and mutations to the dedicated page that owns them.

Acceptance criteria:

- No released admin function requires scrolling through unrelated management
  sections to reach it.
- Every released admin page appears as a separate, role-appropriate subitem
  under Admin and can be opened directly by URL.
- The desktop and mobile navigation identify the current admin page and remain
  fully usable by keyboard and screen reader.
- A reviewer sees only reviewer-authorized navigation and receives a server-side
  denial when directly requesting a system-admin route.
- Loading one admin page does not query or disclose data owned solely by another
  admin function.
- Existing bookmarked admin URLs either remain stable or redirect to the correct
  new page without losing relevant filters.

## Platform expansion

### Graceful application updates

**Status:** Defined

**Priority:** High candidate

Protect active players during production deployments without requiring full
blue-green infrastructure during the private beta.

Proposed deployment behavior:

1. Put Mindspan into a short-lived **updating** state before application
   activation.
2. Prevent new play sessions and new questions from starting while continuing
   to accept answers for questions already presented.
3. Wait until active presentations are finalized or expired, subject to a
   conservative maximum drain time.
4. Activate the immutable release and restart the application service.
5. Verify health, database connectivity, and the deployed version before
   reopening play.
6. Show waiting players a friendly message such as **Mindspan is being updated.
   Your progress is safe—play will resume shortly.**

Reliability principles:

- Authentication sessions, completed attempts, mastery, Insight, achievements,
  feedback, groups, and pack ownership must remain intact across every update.
- Updating mode should block only work that would create a new active question;
  existing answer-finalization requests must remain available during the drain.
- Determine whether active questions remain from server-side presentation
  records rather than browser presence or an arbitrary fixed delay.
- Keep answer submissions idempotent across connection loss. Retrying a request
  after an interrupted response must return the finalized result rather than
  duplicate or reject the attempt.
- Preserve the current question or provide a recovery path if the browser
  reloads during an active presentation.
- Use a bounded escape path so a failed or abandoned presentation cannot block
  deployment indefinitely. Record any forced cutover for operational review.
- Continue taking verified production backups and using forward-compatible
  migrations before the application cutover.

Acceptance criteria:

- A player who is already viewing a question can submit it normally while the
  deployment drain is active.
- No new question is presented after updating mode begins.
- Players waiting to start or advance see an accessible update message and can
  continue without signing in again when service returns.
- An answer committed immediately before a restart is returned correctly after
  a retry and is scored exactly once.
- The deployment process waits for active presentations, enforces its maximum
  drain time, verifies the new release, and reliably clears updating mode after
  success or rollback.
- Automated deployment tests cover active play, interrupted submission,
  authentication persistence, rollback, and stale updating-state recovery.

### Native mobile apps

**Status:** Candidate

Consider native or installable app experiences after the responsive web beta
establishes retention and notification needs.

### Child and guardian accounts

**Status:** Candidate

Explore younger-user support only after legal, consent, privacy, content, and
guardian-control requirements are fully defined. The current product remains 13+.

## Prioritization questions

For every candidate, evaluate:

- Does it measurably improve recall, breadth, or trivia-night readiness?
- How often did beta users ask for it or encounter the problem it solves?
- Does it preserve fair scoring and private-group boundaries?
- What ongoing content, moderation, infrastructure, and support cost does it add?
- Can it ship as a reversible experiment with a clear success metric?
