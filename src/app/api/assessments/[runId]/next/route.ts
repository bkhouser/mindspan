import { NextResponse } from "next/server";
import type {
  Difficulty,
  QuestionPresentation,
  TopicSlug,
} from "@/domain/types";
import { ApiError, apiContext, errorResponse } from "@/lib/api";
import type { Json } from "@/types/database.generated";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const { user, admin } = await apiContext();
    const { data: run } = await admin
      .from("assessment_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!run) throw new ApiError("ASSESSMENT_NOT_FOUND", 404);
    const { data: topics } = await admin
      .from("topics")
      .select("id,slug,name,sort_order")
      .eq("enabled", true)
      .order("sort_order");
    const { data: responses } = await admin
      .from("assessment_responses")
      .select("topic_id,attempts(question_version_id)")
      .eq("assessment_run_id", run.id);
    const counts = new Map<string, number>();
    const usedVersions = new Set<string>();
    for (const response of responses ?? []) {
      counts.set(response.topic_id, (counts.get(response.topic_id) ?? 0) + 1);
      const attempt = Array.isArray(response.attempts)
        ? response.attempts[0]
        : response.attempts;
      if (attempt?.question_version_id)
        usedVersions.add(attempt.question_version_id);
    }
    const topic = topics?.find((item) => (counts.get(item.id) ?? 0) < 4);
    if (!topic) throw new ApiError("ASSESSMENT_COMPLETE", 409);
    const topicDifficulties =
      run.topic_difficulties &&
      typeof run.topic_difficulties === "object" &&
      !Array.isArray(run.topic_difficulties)
        ? (run.topic_difficulties as Record<string, Json | undefined>)
        : {};
    const difficulty = Number(topicDifficulties[topic.id] ?? 3) as Difficulty;
    let query = admin
      .from("question_versions")
      .select(
        "id,question_id,prompt,difficulty,time_limit_seconds,question_media(media_assets(*))",
      )
      .eq("topic_id", topic.id)
      .eq("difficulty", difficulty)
      .eq("status", "published");
    if (usedVersions.size)
      query = query.not("id", "in", `(${[...usedVersions].join(",")})`);
    let { data: versions } = await query.limit(10);
    if (!versions?.length) {
      const fallback = await admin
        .from("question_versions")
        .select(
          "id,question_id,prompt,difficulty,time_limit_seconds,question_media(media_assets(*))",
        )
        .eq("topic_id", topic.id)
        .eq("status", "published")
        .limit(20);
      versions =
        fallback.data?.filter((item) => !usedVersions.has(item.id)) ?? null;
    }
    const version = versions?.[Math.floor(Math.random() * versions.length)];
    if (!version) throw new ApiError("NO_QUESTIONS_AVAILABLE", 404);
    const relation = Array.isArray(version.question_media)
      ? version.question_media[0]
      : version.question_media;
    const asset = relation?.media_assets
      ? Array.isArray(relation.media_assets)
        ? relation.media_assets[0]
        : relation.media_assets
      : null;
    const presentedAt = new Date();
    const loadingDeadline = asset
      ? new Date(presentedAt.getTime() + 10_000)
      : null;
    const expiresAt = new Date(
      (loadingDeadline?.getTime() ?? presentedAt.getTime()) +
        version.time_limit_seconds * 1000,
    );
    const { data: presentation, error } = await admin
      .from("question_presentations")
      .insert({
        session_id: run.session_id,
        user_id: user.id,
        question_version_id: version.id,
        started_at: presentedAt.toISOString(),
        media_ready_at: asset ? null : presentedAt.toISOString(),
        loading_grace_expires_at: loadingDeadline?.toISOString() ?? null,
        expires_at: expiresAt.toISOString(),
        starting_points: 0,
        proficiency_snapshot: 0.5,
        prior_correct_count: 0,
        algorithm_version: "assessment-v1",
        sequence_number: run.response_count + 1,
      })
      .select("id")
      .single();
    if (error) throw error;
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
    const response: QuestionPresentation = {
      id: presentation.id,
      prompt: version.prompt,
      topic: { id: topic.id, slug: topic.slug as TopicSlug, name: topic.name },
      difficulty: version.difficulty as Difficulty,
      media,
      timeLimitSeconds: version.time_limit_seconds,
      scoringTimeLimitSeconds: version.time_limit_seconds,
      startingPoints: 0,
      expiresAt: expiresAt.toISOString(),
      mediaLoadDeadline: loadingDeadline?.toISOString() ?? null,
    };
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
