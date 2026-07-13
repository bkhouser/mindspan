import { NextResponse } from "next/server";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ presentationId: string }> },
) {
  try {
    const { presentationId } = await params;
    const { user, admin } = await apiContext();
    const { data: presentation } = await admin
      .from("question_presentations")
      .select(
        "id,user_id,media_ready_at,loading_grace_expires_at,expires_at,timer_limit_seconds",
      )
      .eq("id", presentationId)
      .eq("user_id", user.id)
      .single();
    if (!presentation) throw new ApiError("PRESENTATION_NOT_FOUND", 404);
    if (presentation.media_ready_at || !presentation.loading_grace_expires_at)
      return NextResponse.json({ expiresAt: presentation.expires_at });
    const now = Date.now();
    const graceDeadline = new Date(
      presentation.loading_grace_expires_at,
    ).getTime();
    const effectiveStart = new Date(Math.min(now, graceDeadline));
    const expiresAt = new Date(
      effectiveStart.getTime() + presentation.timer_limit_seconds * 1000,
    );
    await admin
      .from("question_presentations")
      .update({
        media_ready_at: effectiveStart.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", presentation.id)
      .is("media_ready_at", null);
    const { data: current } = await admin
      .from("question_presentations")
      .select("expires_at")
      .eq("id", presentation.id)
      .single();
    return NextResponse.json({
      expiresAt: current?.expires_at ?? expiresAt.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
