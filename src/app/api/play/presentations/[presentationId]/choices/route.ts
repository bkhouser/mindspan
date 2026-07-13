import { NextResponse } from "next/server";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

export async function POST(_: Request, { params }: { params: Promise<{ presentationId: string }> }) {
  try {
    const { presentationId } = await params;
    const { user, admin } = await apiContext();
    const { data: presentation } = await admin.from("question_presentations").select("id,user_id,question_version_id,starting_points,finalized_at").eq("id", presentationId).single();
    if (!presentation || presentation.user_id !== user.id || presentation.finalized_at) throw new ApiError("PRESENTATION_NOT_FOUND", 404);
    const [{ data: version }, { data: distractors }] = await Promise.all([
      admin.from("question_versions").select("canonical_answer").eq("id", presentation.question_version_id).single(),
      admin.from("distractors").select("id,answer").eq("question_version_id", presentation.question_version_id).order("sort_order"),
    ]);
    if (!version || distractors?.length !== 3) throw new ApiError("CHOICES_UNAVAILABLE", 409);
    await admin.from("assistance_events").upsert({ presentation_id: presentation.id, kind: "show_choices", point_factor: 0.5 }, { onConflict: "presentation_id,kind" });
    await admin.from("question_presentations").update({ choices_revealed: true }).eq("id", presentation.id);
    const choices = [...distractors.map((item) => ({ id: item.id, text: item.answer })), { id: "canonical", text: version.canonical_answer }].sort(() => Math.random() - 0.5);
    return NextResponse.json({ choices, assistance: "show_choices", pointFactor: 0.5, revisedPointCeiling: Math.round(presentation.starting_points * 0.5) });
  } catch (error) { return errorResponse(error); }
}
