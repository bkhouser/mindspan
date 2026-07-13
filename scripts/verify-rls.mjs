import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);
const fileValues = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    )
  : {};
const values = { ...fileValues, ...process.env };
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const createdUsers = [];
let groupId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const emailLabel = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const email = `rls-${emailLabel}-${crypto.randomUUID()}@mindspan.local`;
  const password = `Test-${crypto.randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  await admin
    .from("profiles")
    .update({
      display_name: label,
      beta_access_granted_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);
  const client = createClient(
    values.NEXT_PUBLIC_SUPABASE_URL,
    values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

try {
  const owner = await createUser("Owner");
  const member = await createUser("Member");
  const outsider = await createUser("Outsider");
  const systemAdmin = await createUser("System Admin");
  await admin
    .from("profiles")
    .update({ role: "sys_admin" })
    .eq("id", systemAdmin.id);

  const { data: group, error: groupError } = await admin
    .from("groups")
    .insert({ name: "RLS verification group", created_by: owner.id })
    .select("id")
    .single();
  if (groupError) throw groupError;
  groupId = group.id;
  const { error: membershipError } = await admin
    .from("group_memberships")
    .insert([
      { group_id: groupId, user_id: owner.id, role: "admin" },
      { group_id: groupId, user_id: member.id, role: "member" },
    ]);
  if (membershipError) throw membershipError;

  const { data: shared } = await owner.client
    .from("profiles")
    .select("id")
    .eq("id", member.id);
  assert(
    shared?.length === 1,
    "a group member must see a shared aggregate profile",
  );
  const { data: hidden } = await outsider.client
    .from("profiles")
    .select("id")
    .eq("id", member.id);
  assert(hidden?.length === 0, "an outsider must not see another profile");

  const { data: visibleGroup } = await member.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(visibleGroup?.length === 1, "a member must see their group");
  const { data: hiddenGroup } = await outsider.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(hiddenGroup?.length === 0, "an outsider must not see a private group");
  const { data: globalProfiles } = await systemAdmin.client
    .from("profiles")
    .select("id")
    .in("id", [owner.id, member.id, outsider.id]);
  assert(
    globalProfiles?.length === 3,
    "a system admin must have global operational visibility",
  );

  const { data: settings } = await member.client
    .from("system_settings")
    .select("default_timer_seconds")
    .eq("id", true)
    .single();
  assert(
    settings?.default_timer_seconds >= 10,
    "an active player must see the global timer setting",
  );
  const { data: memberSettingsUpdate, error: memberSettingsError } =
    await member.client
      .from("system_settings")
      .update({ default_timer_seconds: 45 })
      .eq("id", true)
      .select("id");
  assert(
    Boolean(memberSettingsError) || memberSettingsUpdate?.length === 0,
    "a normal player must not change the global timer",
  );

  const { data: memberSession, error: memberSessionError } = await member.client
    .from("play_sessions")
    .insert({ user_id: member.id, mode: "mixed", group_id: groupId })
    .select("id")
    .single();
  assert(
    !memberSessionError && Boolean(memberSession),
    "a group member must be able to start group-scoped play",
  );
  const { data: outsiderSession, error: outsiderSessionError } =
    await outsider.client
      .from("play_sessions")
      .insert({ user_id: outsider.id, mode: "mixed", group_id: groupId })
      .select("id");
  assert(
    Boolean(outsiderSessionError) || outsiderSession?.length === 0,
    "an outsider must not start play under a private group's rules",
  );

  const { data: memberUpdate, error: memberUpdateError } = await member.client
    .from("groups")
    .update({ name: "Unauthorized edit" })
    .eq("id", groupId)
    .select("id");
  assert(
    Boolean(memberUpdateError) || memberUpdate?.length === 0,
    "a normal member must not edit group identity",
  );
  const { data: ownerUpdate, error: ownerUpdateError } = await owner.client
    .from("groups")
    .update({ description: "Authorized edit" })
    .eq("id", groupId)
    .select("id");
  assert(
    !ownerUpdateError && ownerUpdate?.length === 1,
    "a group admin must be able to edit group identity",
  );
  const { data: timerUpdate, error: timerUpdateError } = await owner.client
    .from("groups")
    .update({ timer_seconds_override: 45 })
    .eq("id", groupId)
    .select("timer_seconds_override");
  assert(
    !timerUpdateError && timerUpdate?.[0]?.timer_seconds_override === 45,
    "a group admin must be able to set the group timer override",
  );

  const { error: roleEscalationError } = await owner.client
    .from("profiles")
    .update({ role: "sys_admin" })
    .eq("id", owner.id);
  assert(
    Boolean(roleEscalationError),
    "a user must not promote their global role",
  );
  const { error: finalAdminError } = await owner.client
    .from("group_memberships")
    .update({ role: "member" })
    .eq("group_id", groupId)
    .eq("user_id", owner.id);
  assert(Boolean(finalAdminError), "the final group admin must not be demoted");

  await admin
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", member.id);
  const { data: formerMemberGroup } = await member.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(
    formerMemberGroup?.length === 0,
    "a former member must immediately lose group visibility",
  );
  await admin
    .from("profiles")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", outsider.id);
  const { data: disabledTopics } = await outsider.client
    .from("topics")
    .select("id");
  assert(
    disabledTopics?.length === 0,
    "a disabled account token must not retain catalog access",
  );

  console.log(
    "RLS personas: owner, member, outsider, former member, disabled user, and system admin passed",
  );
  console.log(
    "Role escalation, immediate revocation, and final-admin protection passed",
  );
} finally {
  if (groupId) await admin.from("groups").delete().eq("id", groupId);
  for (const id of createdUsers.reverse())
    await admin.auth.admin.deleteUser(id);
}
