"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type OnboardingValues = {
  ageConfirmed: boolean;
  displayName: string;
  topics: string[];
};

export type OnboardingState = {
  error?: string;
  submissionKey?: string;
  values?: OnboardingValues;
};

export async function completeOnboarding(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { user, supabase } = await requireUser();
  const topics = formData.getAll("topics").map(String);
  const values: OnboardingValues = {
    ageConfirmed: formData.get("ageConfirmed") === "on",
    displayName: String(formData.get("displayName") ?? ""),
    topics,
  };
  const parsed = z
    .object({
      displayName: z.string().trim().min(1).max(50),
      ageConfirmed: z.literal("on"),
      topics: z.array(z.string().uuid()).min(1),
    })
    .safeParse({
      displayName: formData.get("displayName"),
      ageConfirmed: formData.get("ageConfirmed"),
      topics,
    });
  if (!parsed.success) {
    return {
      error:
        topics.length === 0
          ? "Choose at least one topic before continuing."
          : "Check your display name and confirm that you are at least 13.",
      submissionKey: crypto.randomUUID(),
      values,
    };
  }

  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return {
      error: "Mindspan could not save your interests. Please try again.",
      submissionKey: crypto.randomUUID(),
      values,
    };
  }
  const { error: interestError } = await supabase.from("user_interests").insert(
    parsed.data.topics.map((topicId) => ({
      user_id: user.id,
      topic_id: topicId,
    })),
  );
  if (interestError) {
    return {
      error: "Mindspan could not save your interests. Please try again.",
      submissionKey: crypto.randomUUID(),
      values,
    };
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      age_confirmed: true,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) {
    return {
      error: "Mindspan could not finish your profile. Please try again.",
      submissionKey: crypto.randomUUID(),
      values,
    };
  }
  await createAdminClient().rpc("award_achievement_v1", {
    target_user: user.id,
    evaluator: "onboarding_complete",
  });
  redirect("/home");
}
