"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function updatePlayPreferences(formData: FormData) {
  const { user, supabase } = await requireUser();
  const immediateChoiceSubmit = formData.get("immediateChoiceSubmit") === "on";
  const { error } = await supabase
    .from("profiles")
    .update({
      immediate_choice_submit: immediateChoiceSubmit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect("/profile?preferenceError=1");
  redirect("/profile?preferenceSaved=1");
}
