import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

const schema = z.object({ category: z.enum(["answer", "wording", "source", "media", "other"]), details: z.string().trim().min(3).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ presentationId: string }> }) {
  try {
    const { presentationId } = await params; const input = schema.parse(await request.json()); const { user, admin } = await apiContext();
    const { data: presentation } = await admin.from("question_presentations").select("question_version_id,user_id").eq("id", presentationId).single();
    if (!presentation || presentation.user_id !== user.id) throw new ApiError("PRESENTATION_NOT_FOUND", 404);
    const { data, error } = await admin.from("question_reports").insert({ question_version_id: presentation.question_version_id, reporter_user_id: user.id, category: input.category, details: input.details }).select("id").single();
    if (error) throw error; return NextResponse.json(data, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
