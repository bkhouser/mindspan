import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const fileValues = existsSync(".env.local")
  ? Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    )
  : {};
const values = { ...fileValues, ...process.env };
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase test environment is not configured");
}

const admin = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const email = `auth-check-${randomUUID()}@mindspan.local`;
const wrongEmail = `wrong-${randomUUID()}@mindspan.local`;
const correctToken = randomUUID();
const wrongToken = randomUUID();
const hash = (token) => createHash("sha256").update(token).digest("hex");
let userId;

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: `Mindspan-${randomUUID()}!`,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("User was not created");
  userId = created.user.id;

  const { count: pendingUnlocks } = await admin
    .from("pack_unlocks")
    .select("pack_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (pendingUnlocks !== 0) throw new Error("Pending identities must not receive starter packs");

  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const { error: inviteError } = await admin.from("beta_invites").insert([
    { token_hash: hash(wrongToken), email: wrongEmail, expires_at: expiresAt },
    { token_hash: hash(correctToken), email, expires_at: expiresAt },
  ]);
  if (inviteError) throw inviteError;

  const { data: wrongRedemption, error: wrongError } = await admin.rpc("redeem_invite_for_user", {
    raw_token: wrongToken,
    target_user: userId,
  });
  if (wrongError || wrongRedemption?.[0]?.granted) throw wrongError ?? new Error("Restricted invite accepted the wrong email");

  const { data: correctRedemption, error: correctError } = await admin.rpc("redeem_invite_for_user", {
    raw_token: correctToken,
    target_user: userId,
  });
  if (correctError || !correctRedemption?.[0]?.granted) throw correctError ?? new Error("Valid invite was not redeemed");

  const [{ data: profile }, { count: starterCount }, { count: expectedStarters }] = await Promise.all([
    admin.from("profiles").select("beta_access_granted_at").eq("id", userId).single(),
    admin.from("pack_unlocks").select("pack_id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("packs").select("id", { count: "exact", head: true }).eq("is_starter", true),
  ]);
  if (!profile?.beta_access_granted_at) throw new Error("Invite redemption did not grant beta access");
  if (starterCount !== expectedStarters) throw new Error(`Expected ${expectedStarters} starter packs, found ${starterCount}`);
  console.log("Pending provisioning, email-restricted invites, and starter grants passed");
} finally {
  await admin.from("beta_invites").delete().in("token_hash", [hash(correctToken), hash(wrongToken)]);
  if (userId) await admin.auth.admin.deleteUser(userId);
}
