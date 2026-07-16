"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireQuestionReviewer } from "@/lib/auth";

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
  const returnTo = input.returnTo.startsWith("/admin/question-quality")
    ? input.returnTo
    : "/admin/question-quality";
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
