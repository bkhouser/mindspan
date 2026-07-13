"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markAchievementsNotified(slugs: string[]) {
  const { user } = await requireUser();
  const parsed = z
    .array(z.string().trim().min(1).max(100))
    .min(1)
    .max(20)
    .parse(slugs);
  const admin = createAdminClient();
  const { data: achievements, error: lookupError } = await admin
    .from("achievements")
    .select("id")
    .in("slug", parsed);
  if (lookupError) throw lookupError;
  const ids = achievements?.map((achievement) => achievement.id) ?? [];
  if (!ids.length) return;
  const { error } = await admin
    .from("user_achievements")
    .update({ notified_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("achievement_id", ids)
    .is("notified_at", null);
  if (error) throw error;
}
