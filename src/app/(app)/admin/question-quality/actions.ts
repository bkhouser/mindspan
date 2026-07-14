"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSysAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveEditorialReview(formData: FormData) {
  const { user } = await requireSysAdmin();
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
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("question_editorial_reviews").upsert({
    question_version_id: input.versionId,
    reviewed_by: user.id,
    verdict: input.verdict,
    notes: input.notes || null,
    player_feedback_reviewed_at: now,
    updated_at: now,
  });
  if (error) throw error;
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: `question.editorial_${input.verdict}`,
    target_table: "question_versions",
    target_id: input.versionId,
    after_data: { verdict: input.verdict, notes: input.notes || null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/question-quality");
  redirect(returnTo);
}
