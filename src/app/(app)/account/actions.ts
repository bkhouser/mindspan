"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";

export type PasswordState = { error?: string; message?: string };

export async function changePassword(_: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = z.object({ currentPassword: z.string().max(128).optional(), password: z.string().min(12).max(128), confirmation: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Use a password of at least 12 characters." };
  if (parsed.data.password !== parsed.data.confirmation) return { error: "The passwords do not match." };
  const { user, supabase } = await requireUser();
  const hasPassword = user.identities?.some((identity) => identity.provider === "email");
  if (hasPassword && !parsed.data.currentPassword) return { error: "Enter your current password." };
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    ...(hasPassword ? { current_password: parsed.data.currentPassword } : {}),
  });
  if (error) return { error: "The password could not be changed. Check your current password and try again." };
  return { message: hasPassword ? "Password changed." : "Password sign-in added to your account." };
}
