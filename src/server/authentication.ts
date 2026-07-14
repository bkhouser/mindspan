import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

function inviteHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function isValidInvite(token: string, email?: string) {
  if (!token || token.length > 256) return false;
  const admin = createAdminClient();
  const hash = inviteHash(token);
  const now = new Date().toISOString();
  const [{ data: betaInvite }, { data: groupInvite }] = await Promise.all([
    admin
      .from("beta_invites")
      .select("email,max_uses,use_count")
      .eq("token_hash", hash)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .maybeSingle(),
    admin
      .from("group_invites")
      .select("max_uses,use_count")
      .eq("token_hash", hash)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .maybeSingle(),
  ]);
  const betaAllowed = Boolean(
    betaInvite &&
    betaInvite.use_count < betaInvite.max_uses &&
    (!betaInvite.email ||
      !email ||
      betaInvite.email.toLowerCase() === email.toLowerCase()),
  );
  const groupAllowed = Boolean(
    groupInvite && groupInvite.use_count < groupInvite.max_uses,
  );
  return betaAllowed || groupAllowed;
}

async function grantStarterPacks(userId: string) {
  const admin = createAdminClient();
  const { data: packs } = await admin
    .from("packs")
    .select("id")
    .eq("is_starter", true);
  if (packs?.length) {
    await admin.from("pack_unlocks").upsert(
      packs.map((pack) => ({
        user_id: userId,
        pack_id: pack.id,
        cost_insight: 0,
      })),
      { onConflict: "user_id,pack_id", ignoreDuplicates: true },
    );
  }
}

export async function finishAuthentication(input: {
  userId: string;
  email?: string;
  invite?: string;
  requestedPath?: string;
}) {
  const admin = createAdminClient();
  let granted = false;
  if (input.invite) {
    const { data: redemption } = await admin.rpc("redeem_invite_for_user", {
      raw_token: input.invite,
      target_user: input.userId,
    });
    granted = Boolean(redemption?.[0]?.granted);
  }

  const env = serverEnv();
  const bootstrapAdmin = Boolean(
    env.INITIAL_SYS_ADMIN_EMAIL &&
    input.email?.toLowerCase() === env.INITIAL_SYS_ADMIN_EMAIL.toLowerCase(),
  );
  if (bootstrapAdmin) {
    const { error } = await admin
      .from("profiles")
      .update({
        role: "sys_admin",
        beta_access_granted_at: new Date().toISOString(),
        onboarding_completed: true,
      })
      .eq("id", input.userId);
    if (error) throw error;
    await grantStarterPacks(input.userId);
    granted = true;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("beta_access_granted_at,onboarding_completed")
    .eq("id", input.userId)
    .single();
  granted ||= Boolean(profile?.beta_access_granted_at);
  return authenticatedDestination({
    granted,
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    bootstrapAdmin,
    requestedPath: input.requestedPath,
  });
}

export function authenticatedDestination(input: {
  granted: boolean;
  onboardingCompleted: boolean;
  bootstrapAdmin: boolean;
  requestedPath?: string;
}) {
  if (!input.granted) return "/no-access";
  if (
    ["/account", "/account/reset-password"].includes(input.requestedPath ?? "")
  ) {
    return input.requestedPath!;
  }
  if (input.bootstrapAdmin) return "/admin";
  return input.onboardingCompleted ? "/home" : "/onboarding";
}
