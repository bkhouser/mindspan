import { NextResponse } from "next/server";
import type {
  Difficulty,
  QuestionPresentation,
  TopicSlug,
} from "@/domain/types";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ presentationId: string }> },
) {
  try {
    const { presentationId } = await params;
    const { user, admin } = await apiContext();
    const { data: original } = await admin
      .from("question_presentations")
      .select("*")
      .eq("id", presentationId)
      .eq("user_id", user.id)
      .single();
    if (!original) throw new ApiError("PRESENTATION_NOT_FOUND", 404);
    if (original.finalized_at)
      throw new ApiError("PRESENTATION_FINALIZED", 409);

    const [{ data: session }, { data: version }] = await Promise.all([
      admin
        .from("play_sessions")
        .select("question_count,ended_at")
        .eq("id", original.session_id)
        .eq("user_id", user.id)
        .single(),
      admin
        .from("question_versions")
        .select(
          "id,topic_id,prompt,canonical_answer,answer_mode,difficulty,question_media(media_assets(*)),topics(slug,name)",
        )
        .eq("id", original.question_version_id)
        .single(),
    ]);
    if (!session || session.ended_at)
      throw new ApiError("SESSION_NOT_FOUND", 404);
    if (!version) throw new ApiError("QUESTION_NOT_FOUND", 404);
    if (
      !original.activated_at &&
      original.sequence_number !== session.question_count + 1
    )
      throw new ApiError("PRESENTATION_STALE", 409);

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
    if (!topic) throw new ApiError("TOPIC_NOT_FOUND", 500);

    let presentation = original;
    if (!original.activated_at) {
      const activatedAt = new Date();
      const loadingDeadline = asset
        ? new Date(activatedAt.getTime() + 10_000)
        : null;
      const expiresAt = new Date(
        (loadingDeadline?.getTime() ?? activatedAt.getTime()) +
          original.timer_limit_seconds * 1000,
      );
      const { data: activated, error: activationError } = await admin
        .from("question_presentations")
        .update({
          activated_at: activatedAt.toISOString(),
          started_at: activatedAt.toISOString(),
          media_ready_at: asset ? null : activatedAt.toISOString(),
          loading_grace_expires_at: loadingDeadline?.toISOString() ?? null,
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", original.id)
        .is("activated_at", null)
        .select("*")
        .maybeSingle();
      if (activationError) throw activationError;
      if (activated) presentation = activated;
      else {
        const { data: current } = await admin
          .from("question_presentations")
          .select("*")
          .eq("id", original.id)
          .eq("user_id", user.id)
          .single();
        if (!current?.activated_at)
          throw new ApiError("PRESENTATION_ACTIVATION_FAILED", 409);
        presentation = current;
      }
    }

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

    const requiredChoices = version.answer_mode === "required_choice";
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
        revisedPointCeiling: presentation.starting_points,
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
      timeLimitSeconds: presentation.timer_limit_seconds,
      scoringTimeLimitSeconds: presentation.scoring_timer_seconds,
      startingPoints: presentation.starting_points,
      expiresAt: presentation.expires_at,
      mediaLoadDeadline: presentation.loading_grace_expires_at,
      ...(initialChoices ? { initialChoices } : {}),
    };
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
