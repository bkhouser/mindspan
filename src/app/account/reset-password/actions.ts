"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NewPasswordState = { error?: string; message?: string };

export async function saveRecoveredPassword(_: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const parsed = z.object({ password: z.string().min(12).max(128), confirmation: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Use a password of at least 12 characters." };
  if (parsed.data.password !== parsed.data.confirmation) return { error: "The passwords do not match." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This reset session has expired. Request another reset link." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "That password could not be saved. Choose a stronger password or request another link." };
  return { message: "Your password has been updated. You can continue to Mindspan." };
}
