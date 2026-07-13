"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; sent?: boolean };

export async function requestMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.object({ email: z.string().email(), invite: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const env = publicEnv();
  const callback = new URL("/auth/confirm", env.NEXT_PUBLIC_SITE_URL);
  if (parsed.data.invite) callback.searchParams.set("invite", parsed.data.invite);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });
  if (error) return { error: "We could not send the sign-in email. Try again shortly." };
  return { sent: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
