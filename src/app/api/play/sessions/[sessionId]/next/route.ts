import { NextResponse } from "next/server";
import { scoreAttempt } from "@/domain/scoring";
import { selectQuestion, type CandidateQuestion } from "@/domain/selection";
import { scaleQuestionTimer } from "@/domain/timer-rules";
import type {
  Difficulty,
  QuestionPresentation,
  TopicSlug,
} from "@/domain/types";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const { user, admin } = await apiContext();
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
          .select("weighted_successes,weighted_evidence")
          .eq("user_id", user.id)
          .eq("topic_id", session.topic_id)
          .maybeSingle()
      : { data: null };
    let proficiency = mastery
      ? (Number(mastery.weighted_successes) + 2) /
        (Number(mastery.weighted_evidence) + 4)
      : 0.5;

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

    let query = admin
      .from("question_versions")
      .select(
        "id,question_id,topic_id,prompt,difficulty,time_limit_seconds,question_media(media_assets(*)),topics(slug,name)",
      )
      .in("question_id", questionIds)
      .eq("status", "published")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    if (session.mode === "topic" && session.topic_id)
      query = query.eq("topic_id", session.topic_id);
    const { data: versions, error } = await query;
    if (error) throw error;
    const ids = versions?.map((version) => version.question_id) ?? [];
    const { data: states } = ids.length
      ? await admin
          .from("user_question_state")
          .select(
            "question_id,correct_count,last_correct,next_review_at,last_session_sequence",
          )
          .eq("user_id", user.id)
          .in("question_id", ids)
      : { data: [] };
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
      proficiency,
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
        .select("weighted_successes,weighted_evidence")
        .eq("user_id", user.id)
        .eq("topic_id", version.topic_id)
        .maybeSingle();
      proficiency = topicState
        ? (Number(topicState.weighted_successes) + 2) /
          (Number(topicState.weighted_evidence) + 4)
        : 0.5;
    }
    const priorCorrectCount =
      stateMap.get(version.question_id)?.correct_count ?? 0;
    const score = scoreAttempt({
      difficulty: version.difficulty as Difficulty,
      proficiency,
      priorCorrectCount,
      remainingRatio: 1,
      assisted: false,
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
    const loadingDeadline = asset
      ? new Date(presentedAt.getTime() + 10_000)
      : null;
    const expiresAt = new Date(
      (loadingDeadline?.getTime() ?? presentedAt.getTime()) +
        timerLimitSeconds * 1000,
    );
    const { data: presentation, error: insertError } = await admin
      .from("question_presentations")
      .insert({
        session_id: session.id,
        user_id: user.id,
        question_version_id: version.id,
        started_at: presentedAt.toISOString(),
        media_ready_at: asset ? null : presentedAt.toISOString(),
        loading_grace_expires_at: loadingDeadline?.toISOString() ?? null,
        expires_at: expiresAt.toISOString(),
        starting_points: score.startingPoints,
        proficiency_snapshot: proficiency,
        prior_correct_count: priorCorrectCount,
        algorithm_version: score.algorithmVersion,
        sequence_number: session.question_count + 1,
        timer_limit_seconds: timerLimitSeconds,
        scoring_timer_seconds: scoringTimeLimitSeconds,
      })
      .select("id,started_at")
      .single();
    if (insertError) throw insertError;
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
    const response: QuestionPresentation = {
      id: presentation.id,
      prompt: version.prompt,
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
    };
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
