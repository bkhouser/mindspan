import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(public code: string, public status = 400, message?: string) { super(message ?? code); }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
}

export async function apiContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError("AUTH_REQUIRED", 401, "Sign in to continue.");
  const { data: profile } = await supabase.from("profiles").select("beta_access_granted_at,disabled_at,role").eq("id", user.id).single();
  if (!profile?.beta_access_granted_at || profile.disabled_at) throw new ApiError("ACCESS_DENIED", 403, "A valid beta invitation is required.");
  return { user, supabase, admin: createAdminClient(), profile };
}
