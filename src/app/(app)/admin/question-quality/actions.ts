"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireQuestionReviewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAchievementsForUser } from "@/server/achievements";

function safeReturnTo(value: string) {
  return value.startsWith("/admin/question-quality")
    ? value
    : "/admin/question-quality";
}

export async function saveEditorialReview(formData: FormData) {
  const { supabase } = await requireQuestionReviewer();
  const input = z
    .object({
      versionId: z.string().uuid(),
      verdict: z.enum(["approved", "needs_revision", "rejected"]),
      notes: z.string().trim().max(4000).default(""),
      returnTo: z.string().default("/admin/question-quality"),
    })
    .parse(Object.fromEntries(formData));
  const returnTo = safeReturnTo(input.returnTo);
  const { error } = await supabase.rpc("save_question_editorial_review_v1", {
    p_notes: input.notes || undefined,
    p_question_version_id: input.versionId,
    p_verdict: input.verdict,
  });
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/admin/question-quality");
  redirect(returnTo);
}

export async function acceptPlayerAnswer(formData: FormData) {
  const { supabase } = await requireQuestionReviewer();
  const admin = createAdminClient();
  const input = z
    .object({
      feedbackId: z.string().uuid(),
      returnTo: z.string().default("/admin/question-quality"),
    })
    .parse(Object.fromEntries(formData));
  const { data: feedback, error: feedbackError } = await admin
    .from("question_feedback")
    .select("user_id")
    .eq("id", input.feedbackId)
    .single();
  if (feedbackError) throw feedbackError;
  const { data, error } = await supabase.rpc(
    "award_reviewed_answer_credit_for_reviewer_v1",
    { p_question_feedback_id: input.feedbackId },
  );
  if (error) throw error;
  const correction = data?.[0];
  if (correction?.result_corrected) {
    await evaluateAchievementsForUser(
      admin,
      feedback.user_id,
    );
  }
  revalidatePath("/achievements");
  revalidatePath("/groups");
  revalidatePath("/home");
  revalidatePath("/profile");
  revalidatePath("/review");
  revalidatePath("/admin");
  revalidatePath("/admin/question-quality");
  redirect(safeReturnTo(input.returnTo));
}
