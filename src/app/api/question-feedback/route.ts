import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiContext, errorResponse } from "@/lib/api";

const reason = z.enum([
  "incorrect_answer",
  "should_have_been_accepted",
  "unclear",
  "difficulty",
  "weak_explanation",
  "poor_choices",
  "typo",
  "outdated",
  "media",
  "other",
]);

const schema = z.object({
  attemptId: z.string().uuid(),
  sentiment: z.enum(["up", "down"]),
  reasons: z.array(reason).max(8).default([]),
  comment: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((value) => value ?? ""),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { user, admin } = await apiContext();
    const { data: attempt } = await admin
      .from("attempts")
      .select(
        "id,user_id,question_version_id,correct,assisted,timed_out,created_at",
      )
      .eq("id", input.attemptId)
      .eq("user_id", user.id)
      .single();
    if (!attempt) throw new ApiError("ATTEMPT_NOT_FOUND", 404);

    const isPositive = input.sentiment === "up";
    const { data, error } = await admin
      .from("question_feedback")
      .upsert(
        {
          question_version_id: attempt.question_version_id,
          user_id: user.id,
          attempt_id: attempt.id,
          sentiment: input.sentiment,
          reasons: isPositive ? [] : [...new Set(input.reasons)],
          comment: isPositive || !input.comment ? null : input.comment,
          answer_correct: attempt.correct,
          assisted: attempt.assisted,
          timed_out: attempt.timed_out,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,question_version_id" },
      )
      .select("sentiment,reasons,comment,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
