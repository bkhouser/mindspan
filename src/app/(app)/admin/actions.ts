"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_TIMER_SECONDS, MIN_TIMER_SECONDS } from "@/domain/timer-rules";
import { requireSysAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSupportState = { error?: string; message?: string };

const supportInput = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(3).max(300),
});

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
  const { supabase } = await requireSysAdmin();
  const input = z
    .object({
      userId: z.string().uuid(),
      role: z.enum(["user", "question_reviewer", "sys_admin"]),
    })
    .parse(Object.fromEntries(formData));
  const { error } = await supabase.rpc("set_user_role_v1", {
    p_role: input.role,
    p_user_id: input.userId,
  });
  if (error) throw error;
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

export async function setMaintenanceMode(formData: FormData) {
  const { user } = await requireSysAdmin();
  const input = z
    .object({ enabled: z.enum(["true", "false"]) })
    .parse(Object.fromEntries(formData));
  const enabled = input.enabled === "true";
  const now = new Date().toISOString();
  const message =
    "Mindspan is being updated. Your active answer is safe—please wait a moment.";
  const admin = createAdminClient();
  const { error } = await admin
    .from("system_settings")
    .update({
      maintenance_mode: enabled,
      maintenance_started_at: enabled ? now : null,
      maintenance_message: enabled ? message : null,
      updated_at: now,
      updated_by: user.id,
    })
    .eq("id", true);
  if (error) throw error;
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: enabled ? "system.maintenance_started" : "system.maintenance_ended",
    target_table: "system_settings",
    after_data: { maintenance_mode: enabled },
  });
  revalidatePath("/admin");
  revalidatePath("/play");
}

export async function sendAdminPasswordReset(
  _: AdminSupportState,
  formData: FormData,
): Promise<AdminSupportState> {
  const parsed = supportInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Give a short support reason before sending a reset email.",
    };
  const { user } = await requireSysAdmin();
  const admin = createAdminClient();
  const [{ data: profile }, { data: authResult, error: authError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("disabled_at")
        .eq("id", parsed.data.userId)
        .maybeSingle(),
      admin.auth.admin.getUserById(parsed.data.userId),
    ]);
  if (authError || !authResult.user?.email)
    return { error: "That account could not be found." };
  if (profile?.disabled_at)
    return { error: "Restore this account before sending a reset email." };

  const callback = new URL("/auth/confirm", publicEnv().NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("flow", "recovery");
  callback.searchParams.set("next", "/account/reset-password");
  const { error } = await admin.auth.resetPasswordForEmail(
    authResult.user.email,
    {
      redirectTo: callback.toString(),
    },
  );
  if (error)
    return {
      error: "The reset email could not be sent. Please try again shortly.",
    };

  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: "user.password_reset_sent",
    target_table: "profiles",
    target_id: parsed.data.userId,
    after_data: { reason: parsed.data.reason },
  });
  return { message: "Password-reset email sent." };
}

export async function setUserAccess(
  _: AdminSupportState,
  formData: FormData,
): Promise<AdminSupportState> {
  const parsed = supportInput
    .extend({ disabled: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: "Give a short support reason before changing account access.",
    };
  const { supabase } = await requireSysAdmin();
  const disabled = parsed.data.disabled === "true";
  const { error } = await supabase.rpc("set_user_access_v1", {
    p_disabled: disabled,
    p_reason: parsed.data.reason,
    p_user_id: parsed.data.userId,
  });
  if (error)
    return {
      error:
        error.message === "FINAL_SYS_ADMIN_PROTECTED"
          ? "The final active system administrator cannot be suspended."
          : error.message === "CANNOT_CHANGE_OWN_ACCESS"
            ? "You cannot change your own access here."
            : "The account access change could not be completed.",
    };

  const { error: authError } =
    await createAdminClient().auth.admin.updateUserById(parsed.data.userId, {
      ban_duration: disabled ? "876000h" : "none",
    });
  if (authError)
    return {
      error:
        "Mindspan access changed, but the identity-provider restriction could not be updated. Check the audit log before retrying.",
    };
  revalidatePath("/admin");
  return {
    message: disabled
      ? "Account access suspended."
      : "Account access restored.",
  };
}

export async function updateFeedbackStatus(formData: FormData) {
  const { user } = await requireSysAdmin();
  const input = z
    .object({
      feedbackId: z.string().uuid(),
      status: z.enum(["reviewing", "resolved", "dismissed"]),
    })
    .parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("feedback_reports")
    .update({
      status: input.status,
      updated_at: now,
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .eq("id", input.feedbackId);
  if (error) throw error;
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: `feedback.${input.status}`,
    target_table: "feedback_reports",
    target_id: input.feedbackId,
    after_data: { status: input.status },
  });
  revalidatePath("/admin");
}
