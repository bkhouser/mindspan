import { NextResponse } from "next/server";
import { z } from "zod";
import { accuracy, skillEstimate } from "@/domain/mastery";
import { scoreAttempt } from "@/domain/scoring";
import { selectQuestion, type CandidateQuestion } from "@/domain/selection";
import { scaleQuestionTimer } from "@/domain/timer-rules";
import type {
  Difficulty,
  QuestionPresentation,
  TopicSlug,
} from "@/domain/types";
import {
  ApiError,
  apiContext,
  assertNewPlayWorkAllowed,
  errorResponse,
} from "@/lib/api";

const QUERY_BATCH_SIZE = 100;
const schema = z.object({
  prepareOnly: z.boolean().optional().default(false),
});

function batches<T>(values: T[], size = QUERY_BATCH_SIZE): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const input = schema.parse(await request.json());
    const { user, admin } = await apiContext();
    await assertNewPlayWorkAllowed(admin);
    const { data: session } = await admin
      .from("play_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (!session || session.ended_at)
      throw new ApiError("SESSION_NOT_FOUND", 404);

    const { data: mastery } = session.topic_id
      ? await admin
          .from("user_topic_mastery")
          .select(
            "weighted_successes,weighted_evidence,correct_attempts,total_attempts",
          )
          .eq("user_id", user.id)
          .eq("topic_id", session.topic_id)
          .maybeSingle()
      : { data: null };
    const selectionProficiency = mastery
      ? skillEstimate({
          weightedSuccesses: Number(mastery.weighted_successes),
          weightedEvidence: Number(mastery.weighted_evidence),
        })
      : 0.5;
    let scoringProficiency = mastery
      ? accuracy({
          correctAttempts: mastery.correct_attempts,
          totalAttempts: mastery.total_attempts,
        })
      : 0;

    const { data: unlocks } = await admin
      .from("pack_unlocks")
      .select("pack_id,packs!inner(enabled,topic_id)")
      .eq("user_id", user.id)
      .eq("packs.enabled", true);
    const unlockedPackIds = unlocks?.map((row) => row.pack_id) ?? [];
    if (
      session.mode === "pack" &&
      (!session.pack_id || !unlockedPackIds.includes(session.pack_id))
    )
      throw new ApiError("PACK_LOCKED", 403);
    const selectedPacks =
      session.mode === "pack" && session.pack_id
        ? [session.pack_id]
        : unlockedPackIds;
    const { data: links } = selectedPacks.length
      ? await admin
          .from("pack_questions")
          .select("question_id")
          .in("pack_id", selectedPacks)
      : { data: [] };
    const questionIds = [
      ...new Set(
        (links?.map((row) => row.question_id) ?? []).filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
    if (!questionIds.length) throw new ApiError("NO_QUESTIONS_AVAILABLE", 404);

    const now = new Date().toISOString();
    const versionResults = await Promise.all(
      batches(questionIds).map((questionIdBatch) => {
        let query = admin
          .from("question_versions")
          .select(
            "id,question_id,topic_id,prompt,canonical_answer,answer_mode,difficulty,time_limit_seconds,question_media(media_assets(*)),topics(slug,name)",
          )
          .in("question_id", questionIdBatch)
          .eq("status", "published")
          .or(`expires_at.is.null,expires_at.gt.${now}`);
        if (session.mode === "topic" && session.topic_id)
          query = query.eq("topic_id", session.topic_id);
        return query;
      }),
    );
    const versionError = versionResults.find((result) => result.error)?.error;
    if (versionError) throw versionError;
    const versions = versionResults.flatMap((result) => result.data ?? []);
    const ids = versions?.map((version) => version.question_id) ?? [];
    const stateResults = ids.length
      ? await Promise.all(
          batches(ids).map((questionIdBatch) =>
            admin
              .from("user_question_state")
              .select(
                "question_id,correct_count,last_correct,next_review_at,last_session_sequence",
              )
              .eq("user_id", user.id)
              .in("question_id", questionIdBatch),
          ),
        )
      : [];
    const stateError = stateResults.find((result) => result.error)?.error;
    if (stateError) throw stateError;
    const states = stateResults.flatMap((result) => result.data ?? []);
    const stateMap = new Map(
      states?.map((state) => [state.question_id, state]),
    );

    const candidates = (versions ?? []).map((version) => ({
      id: version.id,
      question_id: version.question_id,
      difficulty: version.difficulty as Difficulty,
      userState: stateMap.get(version.question_id),
    })) as CandidateQuestion[];
    const chosen = selectQuestion(
      candidates,
      selectionProficiency,
      session.question_count + 1,
    );
    if (!chosen) throw new ApiError("NO_QUESTIONS_AVAILABLE", 404);
    const version = versions?.find((item) => item.id === chosen.id);
    if (!version) throw new ApiError("NO_QUESTIONS_AVAILABLE", 404);
    const topic = Array.isArray(version.topics)
      ? version.topics[0]
      : version.topics;
    const relation = Array.isArray(version.question_media)
      ? version.question_media[0]
      : version.question_media;
    const asset = relation?.media_assets
      ? Array.isArray(relation.media_assets)
        ? relation.media_assets[0]
        : relation.media_assets
      : null;
    if (session.mode !== "topic") {
      const { data: topicState } = await admin
        .from("user_topic_mastery")
        .select("correct_attempts,total_attempts")
        .eq("user_id", user.id)
        .eq("topic_id", version.topic_id)
        .maybeSingle();
      scoringProficiency = topicState
        ? accuracy({
            correctAttempts: topicState.correct_attempts,
            totalAttempts: topicState.total_attempts,
          })
        : 0;
    }
    const priorCorrectCount =
      stateMap.get(version.question_id)?.correct_count ?? 0;
    const requiredChoices = version.answer_mode === "required_choice";
    const score = scoreAttempt({
      difficulty: version.difficulty as Difficulty,
      proficiency: scoringProficiency,
      priorCorrectCount,
      remainingRatio: 1,
      assisted: requiredChoices,
      correct: true,
    });
    const timerLimitSeconds = scaleQuestionTimer(
      version.time_limit_seconds,
      session.timer_limit_seconds,
    );
    const scoringTimeLimitSeconds = scaleQuestionTimer(
      version.time_limit_seconds,
      session.scoring_timer_seconds,
    );
    const presentedAt = new Date();
    const activatedAt = input.prepareOnly ? null : presentedAt;
    const loadingDeadline =
      asset && activatedAt ? new Date(presentedAt.getTime() + 10_000) : null;
    const expiresAt = new Date(
      (loadingDeadline?.getTime() ??
        activatedAt?.getTime() ??
        presentedAt.getTime()) +
        timerLimitSeconds * 1000,
    );
    const { data: presentation, error: insertError } = await admin
      .from("question_presentations")
      .insert({
        session_id: session.id,
        user_id: user.id,
        question_version_id: version.id,
        started_at: presentedAt.toISOString(),
        activated_at: activatedAt?.toISOString() ?? null,
        media_ready_at:
          activatedAt && !asset ? presentedAt.toISOString() : null,
        loading_grace_expires_at: loadingDeadline?.toISOString() ?? null,
        expires_at: expiresAt.toISOString(),
        starting_points: score.startingPoints,
        proficiency_snapshot: scoringProficiency,
        prior_correct_count: priorCorrectCount,
        algorithm_version: score.algorithmVersion,
        sequence_number: session.question_count + 1,
        timer_limit_seconds: timerLimitSeconds,
        scoring_timer_seconds: scoringTimeLimitSeconds,
      })
      .select("id,started_at")
      .single();
    if (insertError) throw insertError;
    if (input.prepareOnly) return NextResponse.json({ id: presentation.id });
    let media = null;
    if (asset) {
      const { data: signed } = await admin.storage
        .from("question-media")
        .createSignedUrl(asset.storage_path, 300);
      if (signed)
        media = {
          kind: asset.kind,
          signedUrl: signed.signedUrl,
          altText: asset.alt_text,
          transcriptAvailable: Boolean(asset.transcript),
        };
    }
    if (!topic) throw new ApiError("TOPIC_NOT_FOUND", 500);
    let initialChoices;
    if (requiredChoices) {
      const { data: distractors, error: distractorError } = await admin
        .from("distractors")
        .select("id,answer")
        .eq("question_version_id", version.id)
        .order("sort_order");
      if (distractorError) throw distractorError;
      if (distractors?.length !== 3)
        throw new ApiError("CHOICES_UNAVAILABLE", 409);
      const shuffled = [
        ...distractors.map((item) => ({ id: item.id, text: item.answer })),
        { id: "canonical", text: version.canonical_answer },
      ];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
      }
      initialChoices = {
        choices: shuffled,
        assistance: "required_choices" as const,
        pointFactor: 0.5,
        revisedPointCeiling: score.startingPoints,
      };
    }
    const response: QuestionPresentation = {
      id: presentation.id,
      prompt: version.prompt,
      answerMode: requiredChoices ? "required_choice" : "recall",
      topic: {
        id: version.topic_id,
        slug: topic.slug as TopicSlug,
        name: topic.name,
      },
      difficulty: version.difficulty as Difficulty,
      media,
      timeLimitSeconds: timerLimitSeconds,
      scoringTimeLimitSeconds,
      startingPoints: score.startingPoints,
      expiresAt: expiresAt.toISOString(),
      mediaLoadDeadline: loadingDeadline?.toISOString() ?? null,
      ...(initialChoices ? { initialChoices } : {}),
    };
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
