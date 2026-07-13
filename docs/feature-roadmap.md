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
- Provide helpful/unhelpful feedback and the existing question-report path so
  weak or inaccurate expansions can be reviewed and invalidated.
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

## Gameplay and learning

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
