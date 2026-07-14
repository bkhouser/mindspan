"use server";

import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ResetRequestState = { error?: string; message?: string };

export async function requestPasswordReset(_: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const callback = new URL("/auth/confirm", publicEnv().NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", "/account/reset-password");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callback.toString() });
  return { message: "If that address belongs to a Mindspan account, a password-reset link is on its way." };
}
