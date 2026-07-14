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
- Apply the feature to timed play only; the untimed onboarding assessment does
  not need it.

Acceptance criteria:

- A padded question remains answerable for exactly the configured additional
  time and then times out normally.
- Extra time never increases available points or mastery speed credit compared
  with the same answer submitted at the end of the base timer.
- Global and group timer overrides continue to use the same normalized scoring
  baseline.
- Players can distinguish ordinary time from typing allowance without relying
  on color alone.

### Advanced review tools

**Status:** Candidate

Add incorrect-only and topic filters, bookmarks, custom review sessions,
retention-due queues, and an option to retry a missed question without granting
competitive points immediately.

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

## Platform expansion

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
