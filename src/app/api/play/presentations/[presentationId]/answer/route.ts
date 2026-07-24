import { NextResponse } from "next/server";
import { z } from "zod";
import { isAnswerAccepted } from "@/domain/answers";
import { resolveAttemptTiming } from "@/domain/attempt-timing";
import {
  applyMasteryAttempt,
  accuracy,
  topicMastery,
  type MasteryState,
} from "@/domain/mastery";
import { nextReviewAt } from "@/domain/scheduling";
import { scoreAttempt } from "@/domain/scoring";
import type { Difficulty } from "@/domain/types";
import { ApiError, apiContext, errorResponse } from "@/lib/api";
import { evaluateAchievementsForUser } from "@/server/achievements";
import type { Json } from "@/types/database.generated";

const schema = z.object({
  answer: z.string().max(500).optional().default(""),
  idempotencyKey: z.string().uuid(),
  timedOut: z.boolean().optional().default(false),
  clientElapsedMs: z.number().int().nonnegative().max(86_400_000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ presentationId: string }> },
) {
  try {
    const { presentationId } = await params;
    const input = schema.parse(await request.json());
    const requestReceivedAt = Date.now();
    const { user, admin } = await apiContext();
    const { data: presentation } = await admin
      .from("question_presentations")
      .select("*")
      .eq("id", presentationId)
      .eq("user_id", user.id)
      .single();
    if (!presentation) throw new ApiError("PRESENTATION_NOT_FOUND", 404);
    if (!presentation.activated_at)
      throw new ApiError("PRESENTATION_NOT_ACTIVE", 409);
    const { data: version } = await admin
      .from("question_versions")
      .select("*,questions(id),question_citations(label,url)")
      .eq("id", presentation.question_version_id)
      .single();
    if (!version) throw new ApiError("QUESTION_NOT_FOUND", 404);
    const [
      { data: aliases },
      { data: distractors },
      { data: packLinks },
      { data: current },
      { data: questionState },
      { data: subtopicLinks },
      { data: existingAttempt },
    ] = await Promise.all([
      admin
        .from("answer_aliases")
        .select("answer")
        .eq("question_version_id", version.id),
      admin
        .from("distractors")
        .select("answer")
        .eq("question_version_id", version.id),
      admin
        .from("pack_questions")
        .select("packs(name)")
        .eq("question_id", version.question_id),
      admin
        .from("user_topic_mastery")
        .select("*")
        .eq("user_id", user.id)
        .eq("topic_id", version.topic_id)
        .maybeSingle(),
      admin
        .from("user_question_state")
        .select("correct_count,attempt_count")
        .eq("user_id", user.id)
        .eq("question_id", version.question_id)
        .maybeSingle(),
      admin
        .from("question_subtopics")
        .select("subtopics(id,name)")
        .eq("question_id", version.question_id),
      admin
        .from("attempts")
        .select(
          "id,presentation_id,correct,timed_out,earned_points,submitted_answer",
        )
        .eq("user_id", user.id)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle(),
    ]);
    if (existingAttempt && existingAttempt.presentation_id !== presentation.id)
      throw new ApiError("IDEMPOTENCY_KEY_REUSED", 409);
    if (presentation.finalized_at && !existingAttempt)
      throw new ApiError("PRESENTATION_FINALIZED", 409);
    const packNames = [
      ...new Set(
        (packLinks ?? []).flatMap((link) => {
          const pack = Array.isArray(link.packs) ? link.packs[0] : link.packs;
          return pack?.name ? [pack.name] : [];
        }),
      ),
    ].sort((left, right) => left.localeCompare(right));
    const assessmentMode = presentation.algorithm_version === "assessment-v1";
    const citation = version.question_citations?.[0] ?? {
      label: "Source",
      url: "https://example.com",
    };
    const subtopics = (subtopicLinks ?? []).flatMap((link) => {
      const subtopic = Array.isArray(link.subtopics)
        ? link.subtopics[0]
        : link.subtopics;
      return subtopic ? [subtopic] : [];
    });

    if (existingAttempt) {
      const retryState: MasteryState = current
        ? {
            topicId: version.topic_id,
            weightedSuccesses: Number(current.weighted_successes),
            weightedEvidence: Number(current.weighted_evidence),
            uniqueQuestions: current.unique_questions,
            correctAttempts: current.correct_attempts,
            totalAttempts: current.total_attempts,
            assistedCorrectAttempts: current.assisted_correct_attempts,
          }
        : {
            topicId: version.topic_id,
            weightedSuccesses: 0,
            weightedEvidence: 0,
            uniqueQuestions: 0,
            correctAttempts: 0,
            totalAttempts: 0,
            assistedCorrectAttempts: 0,
          };
      const [subtopicResult, ledgerResult] = await Promise.all([
        subtopics.length
          ? admin
              .from("user_subtopic_mastery")
              .select(
                "subtopic_id,correct_attempts,total_attempts,unique_questions",
              )
              .eq("user_id", user.id)
              .in(
                "subtopic_id",
                subtopics.map((subtopic) => subtopic.id),
              )
          : Promise.resolve({ data: [] }),
        admin.from("insight_ledger").select("amount").eq("user_id", user.id),
      ]);
      const subtopicRows = subtopicResult.data ?? [];
      return NextResponse.json({
        attemptId: existingAttempt.id,
        correct: existingAttempt.correct,
        submittedAnswer: existingAttempt.submitted_answer ?? "",
        timedOut: existingAttempt.timed_out,
        canonicalAnswer: version.canonical_answer,
        explanation: version.explanation,
        details: version.details,
        source: citation,
        packNames,
        earnedPoints: existingAttempt.earned_points,
        topicMastery: topicMastery(retryState),
        subtopicMastery: subtopics.map((subtopic) => {
          const row = subtopicRows.find(
            (item) => item.subtopic_id === subtopic.id,
          );
          return {
            id: subtopic.id,
            name: subtopic.name,
            proficiency: row
              ? accuracy({
                  correctAttempts: row.correct_attempts,
                  totalAttempts: row.total_attempts,
                })
              : 0,
            uniqueQuestions: row?.unique_questions ?? 0,
          };
        }),
        achievements: [],
        insightBalance:
          ledgerResult.data?.reduce((sum, item) => sum + item.amount, 0) ?? 0,
      });
    }

    const started = new Date(
      presentation.media_ready_at ??
        presentation.loading_grace_expires_at ??
        presentation.activated_at,
    ).getTime();
    const { elapsedMs, expired, remainingRatio } = resolveAttemptTiming({
      now: requestReceivedAt,
      startedAt: started,
      expiresAt: new Date(presentation.expires_at).getTime(),
      timeLimitSeconds: presentation.scoring_timer_seconds,
      clientTimedOut: input.timedOut,
      clientElapsedMs: input.clientElapsedMs,
      untimed: assessmentMode,
    });
    const accepted =
      !expired &&
      isAnswerAccepted(
        input.answer,
        [
          version.canonical_answer,
          ...(aliases?.map((item) => item.answer) ?? []),
        ],
        {
          removeLeadingArticles: version.remove_leading_articles,
          fuzzy: true,
          rejectedAnswers: distractors?.map((item) => item.answer) ?? [],
        },
      );
    const calculatedScore = scoreAttempt({
      difficulty: version.difficulty as Difficulty,
      proficiency: Number(presentation.proficiency_snapshot),
      priorCorrectCount: presentation.prior_correct_count,
      remainingRatio,
      assisted:
        presentation.choices_revealed ||
        version.answer_mode === "required_choice",
      correct: accepted,
    });
    const score = assessmentMode
      ? {
          ...calculatedScore,
          startingPoints: 0,
          earnedPoints: 0,
          algorithmVersion:
            "assessment-v1" as typeof calculatedScore.algorithmVersion,
        }
      : calculatedScore;
    const state: MasteryState = current
      ? {
          topicId: version.topic_id,
          weightedSuccesses: Number(current.weighted_successes),
          weightedEvidence: Number(current.weighted_evidence),
          uniqueQuestions: current.unique_questions,
          correctAttempts: current.correct_attempts,
          totalAttempts: current.total_attempts,
          assistedCorrectAttempts: current.assisted_correct_attempts,
        }
      : {
          topicId: version.topic_id,
          weightedSuccesses: 0,
          weightedEvidence: 0,
          uniqueQuestions: 0,
          correctAttempts: 0,
          totalAttempts: 0,
          assistedCorrectAttempts: 0,
        };
    const updated = applyMasteryAttempt(state, {
      difficulty: version.difficulty as Difficulty,
      priorCorrectCount: presentation.prior_correct_count,
      correct: accepted,
      assisted: presentation.choices_revealed,
      remainingRatio,
      isUnique: !questionState,
    });
    const mastery = topicMastery(updated);
    const successDelta = updated.weightedSuccesses - state.weightedSuccesses;
    const evidenceDelta = updated.weightedEvidence - state.weightedEvidence;
    const uniqueDelta = questionState ? 0 : 1;
    const scoreSnapshot = {
      ...score,
      answerMode: version.answer_mode,
      elapsedMs,
      priorAttemptCount: questionState?.attempt_count ?? 0,
      timerLimitSeconds: presentation.timer_limit_seconds,
      scoringTimeLimitSeconds: presentation.scoring_timer_seconds,
      masterySuccessDelta: successDelta,
      masteryEvidenceDelta: evidenceDelta,
      masteryUniqueDelta: uniqueDelta,
    };
    const newCorrectCount =
      (questionState?.correct_count ?? 0) + (accepted ? 1 : 0);
    const { data: attemptId, error: finalizeError } = await admin.rpc(
      "finalize_attempt_v1",
      {
        target_presentation: presentation.id,
        target_user: user.id,
        target_question: version.question_id,
        target_topic: version.topic_id,
        submitted: input.answer,
        was_correct: accepted,
        was_assisted: presentation.choices_revealed,
        was_timeout: expired,
        elapsed: elapsedMs,
        remaining: remainingRatio,
        points: score.earnedPoints,
        snapshot: scoreSnapshot as unknown as Json,
        request_key: input.idempotencyKey,
        success_delta: successDelta,
        evidence_delta: evidenceDelta,
        unique_delta: uniqueDelta,
        new_correct_count: newCorrectCount,
        next_review: nextReviewAt(
          newCorrectCount - (accepted ? 1 : 0),
          accepted,
        ).toISOString(),
        new_tier: mastery.tier,
      },
    );
    if (finalizeError) throw finalizeError;
    if (assessmentMode) {
      const { data: run } = await admin
        .from("assessment_runs")
        .select("*")
        .eq("session_id", presentation.session_id)
        .eq("status", "active")
        .single();
      if (run) {
        const nextCount = run.response_count + 1;
        const existingLevels =
          run.topic_difficulties &&
          typeof run.topic_difficulties === "object" &&
          !Array.isArray(run.topic_difficulties)
            ? run.topic_difficulties
            : {};
        const levels = {
          ...existingLevels,
          [version.topic_id]: Math.max(
            1,
            Math.min(5, version.difficulty + (accepted ? 1 : -1)),
          ),
        };
        if (attemptId)
          await admin.from("assessment_responses").insert({
            assessment_run_id: run.id,
            attempt_id: attemptId,
            topic_id: version.topic_id,
            ordinal: nextCount,
          });
        await admin
          .from("assessment_runs")
          .update({
            response_count: nextCount,
            topic_difficulties: levels,
            status: nextCount >= 32 ? "completed" : "active",
            completed_at: nextCount >= 32 ? new Date().toISOString() : null,
          })
          .eq("id", run.id);
        if (nextCount >= 32)
          await admin
            .from("profiles")
            .update({
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
      }
    }
    const [subtopicRows, progression] = await Promise.all([
      (async () => {
        if (!subtopics.length) return [];
        const { data } = await admin
          .from("user_subtopic_mastery")
          .select(
            "subtopic_id,correct_attempts,total_attempts,unique_questions",
          )
          .eq("user_id", user.id)
          .in(
            "subtopic_id",
            subtopics.map((subtopic) => subtopic.id),
          );
        return data ?? [];
      })(),
      evaluateAchievementsForUser(admin, user.id),
    ]);
    const subtopicMastery = subtopics.map((subtopic) => {
      const row = subtopicRows.find((item) => item.subtopic_id === subtopic.id);
      return {
        id: subtopic.id,
        name: subtopic.name,
        proficiency: row
          ? accuracy({
              correctAttempts: row.correct_attempts,
              totalAttempts: row.total_attempts,
            })
          : 0,
        uniqueQuestions: row?.unique_questions ?? 0,
      };
    });
    return NextResponse.json({
      attemptId,
      correct: accepted,
      submittedAnswer: input.answer,
      timedOut: expired,
      canonicalAnswer: version.canonical_answer,
      explanation: version.explanation,
      details: version.details,
      source: citation,
      packNames,
      earnedPoints: score.earnedPoints,
      topicMastery: mastery,
      subtopicMastery,
      achievements: progression.awards,
      insightBalance: progression.insightBalance,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
