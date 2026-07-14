"use server";

import { requireUser } from "@/lib/auth";

export async function dismissPlayIntroduction() {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      show_play_intro: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return error ? { ok: false as const } : { ok: true as const };
}
