"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv, serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { finishAuthentication, isValidInvite } from "@/server/authentication";

export type LoginState = { error?: string; message?: string };

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  invite: z.string().trim().max(256).optional(),
});

function authCallback(invite?: string, next?: string) {
  const callback = new URL("/auth/confirm", publicEnv().NEXT_PUBLIC_SITE_URL);
  if (invite) callback.searchParams.set("invite", invite);
  if (next) callback.searchParams.set("next", next);
  return callback.toString();
}

export async function signInWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: "The email or password was not recognized." };
  const destination = await finishAuthentication({
    userId: data.user.id,
    email: data.user.email,
    invite: parsed.data.invite || undefined,
  });
  redirect(destination);
}

export async function signUpWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.extend({ confirmation: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Use a valid email and a password of at least 12 characters." };
  if (parsed.data.password !== parsed.data.confirmation) return { error: "The passwords do not match." };
  const bootstrapEmail = serverEnv().INITIAL_SYS_ADMIN_EMAIL?.toLowerCase();
  const bootstrap = parsed.data.email.toLowerCase() === bootstrapEmail;
  if (!bootstrap && (!parsed.data.invite || !(await isValidInvite(parsed.data.invite, parsed.data.email)))) {
    return { error: "This invitation is invalid, expired, already used, or restricted to another email." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: authCallback(parsed.data.invite || undefined) },
  });
  if (error) return { error: "We could not create that account. Try signing in or resetting the password." };
  if (data.session && data.user) {
    const destination = await finishAuthentication({
      userId: data.user.id,
      email: data.user.email,
      invite: parsed.data.invite || undefined,
    });
    redirect(destination);
  }
  return { message: "Check your inbox to confirm your email and finish creating your Mindspan account." };
}

export async function signInWithGoogle(formData: FormData) {
  const invite = z.string().trim().max(256).optional().parse(String(formData.get("invite") ?? "")) || undefined;
  if (invite && !(await isValidInvite(invite))) redirect("/login?error=invalid-invite");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallback(invite) },
  });
  if (error || !data.url) redirect(`/login?error=google${invite ? `&invite=${encodeURIComponent(invite)}` : ""}`);
  redirect(data.url);
}

export async function requestMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.object({ email: z.string().email(), invite: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: authCallback(parsed.data.invite), shouldCreateUser: false },
  });
  if (error) return { error: "We could not send the sign-in email. Try again shortly." };
  return { message: "If that address belongs to a Mindspan account, a one-time sign-in link is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
