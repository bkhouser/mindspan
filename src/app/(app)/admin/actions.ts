"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_TIMER_SECONDS, MIN_TIMER_SECONDS } from "@/domain/timer-rules";
import { requireSysAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createBetaInvite(formData: FormData) {
  const { user } = await requireSysAdmin();
  const email = z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .parse(formData.get("email"));
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await createAdminClient()
    .from("beta_invites")
    .insert({
      token_hash: tokenHash,
      email: email || null,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
  redirect(`/admin?invite=${encodeURIComponent(token)}`);
}

export async function togglePack(formData: FormData) {
  const { user } = await requireSysAdmin();
  const input = z
    .object({ packId: z.string().uuid(), enabled: z.enum(["true", "false"]) })
    .parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const enabled = input.enabled === "true";
  await admin
    .from("packs")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", input.packId);
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: enabled ? "pack.enabled" : "pack.disabled",
    target_table: "packs",
    target_id: input.packId,
    after_data: { enabled },
  });
  revalidatePath("/admin");
  revalidatePath("/packs");
}

export async function updateUserRole(formData: FormData) {
  const { user } = await requireSysAdmin();
  const input = z
    .object({ userId: z.string().uuid(), role: z.enum(["user", "sys_admin"]) })
    .parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ role: input.role, updated_at: new Date().toISOString() })
    .eq("id", input.userId);
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: "user.role_changed",
    target_table: "profiles",
    target_id: input.userId,
    after_data: { role: input.role },
  });
  revalidatePath("/admin");
}

export async function updateGlobalTimer(formData: FormData) {
  const { user } = await requireSysAdmin();
  const seconds = z.coerce
    .number()
    .int()
    .min(MIN_TIMER_SECONDS)
    .max(MAX_TIMER_SECONDS)
    .parse(formData.get("seconds"));
  const admin = createAdminClient();
  const { error } = await admin
    .from("system_settings")
    .update({
      default_timer_seconds: seconds,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", true);
  if (error) throw error;
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: "settings.timer_changed",
    target_table: "system_settings",
    after_data: { default_timer_seconds: seconds },
  });
  revalidatePath("/admin");
  revalidatePath("/play");
}
