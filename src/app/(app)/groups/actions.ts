"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_TIMER_SECONDS, MIN_TIMER_SECONDS } from "@/domain/timer-rules";
import { requireUser } from "@/lib/auth";

export async function createGroup(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      description: z.string().trim().max(300).default(""),
    })
    .parse(Object.fromEntries(formData));
  const { data, error } = await supabase.rpc("create_group_with_admin", {
    group_name: parsed.name,
    group_description: parsed.description,
  });
  if (error) throw error;
  redirect(`/groups/${data}`);
}

export async function createGroupInvite(formData: FormData) {
  const { user, supabase } = await requireUser();
  const groupId = z.string().uuid().parse(formData.get("groupId"));
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { error } = await supabase.from("group_invites").insert({
    group_id: groupId,
    token_hash: hash,
    created_by: user.id,
    expires_at: expires,
  });
  if (error) throw error;
  redirect(`/groups/${groupId}?invite=${encodeURIComponent(token)}`);
}

export async function updateGroup(formData: FormData) {
  const { supabase } = await requireUser();
  const input = z
    .object({
      groupId: z.string().uuid(),
      name: z.string().trim().min(2).max(80),
      description: z.string().trim().max(300),
      timerOverride: z.preprocess(
        (value) => (value === "" ? null : value),
        z.coerce
          .number()
          .int()
          .min(MIN_TIMER_SECONDS)
          .max(MAX_TIMER_SECONDS)
          .nullable(),
      ),
    })
    .parse(Object.fromEntries(formData));
  const { error } = await supabase
    .from("groups")
    .update({
      name: input.name,
      description: input.description,
      timer_seconds_override: input.timerOverride,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.groupId);
  if (error) throw error;
  revalidatePath(`/groups/${input.groupId}`);
}

export async function revokeGroupInvite(formData: FormData) {
  const { supabase } = await requireUser();
  const input = z
    .object({ groupId: z.string().uuid(), inviteId: z.string().uuid() })
    .parse(Object.fromEntries(formData));
  const { error } = await supabase
    .from("group_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.inviteId)
    .eq("group_id", input.groupId);
  if (error) throw error;
  revalidatePath(`/groups/${input.groupId}`);
}

export async function changeMemberRole(formData: FormData) {
  const { supabase } = await requireUser();
  const input = z
    .object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.enum(["member", "admin"]),
    })
    .parse(Object.fromEntries(formData));
  const { error } = await supabase
    .from("group_memberships")
    .update({ role: input.role })
    .eq("group_id", input.groupId)
    .eq("user_id", input.userId);
  if (error) throw error;
  revalidatePath(`/groups/${input.groupId}`);
}

export async function removeMember(formData: FormData) {
  const { supabase } = await requireUser();
  const groupId = z.string().uuid().parse(formData.get("groupId"));
  const userId = z.string().uuid().parse(formData.get("userId"));
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
}
