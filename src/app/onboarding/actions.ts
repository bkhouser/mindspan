"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function completeOnboarding(formData: FormData) {
  const { user, supabase } = await requireUser();
  const topics = formData.getAll("topics").map(String);
  const parsed = z.object({
    displayName: z.string().trim().min(1).max(50),
    ageConfirmed: z.literal("on"),
    intent: z.enum(["assessment", "skip"]),
    topics: z.array(z.string().uuid()).min(1),
  }).safeParse({ displayName: formData.get("displayName"), ageConfirmed: formData.get("ageConfirmed"), intent: formData.get("intent"), topics });
  if (!parsed.success) redirect("/onboarding?error=invalid");

  await supabase.from("profiles").update({
    display_name: parsed.data.displayName,
    age_confirmed: true,
    onboarding_completed: parsed.data.intent === "skip",
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  await supabase.from("user_interests").delete().eq("user_id", user.id);
  await supabase.from("user_interests").insert(parsed.data.topics.map((topicId) => ({ user_id: user.id, topic_id: topicId })));
  if (parsed.data.intent === "skip") await createAdminClient().rpc("award_achievement_v1", { target_user: user.id, evaluator: "onboarding_complete" });
  redirect(parsed.data.intent === "assessment" ? "/assessment" : "/home");
}
