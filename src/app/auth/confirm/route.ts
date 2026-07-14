import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { finishAuthentication } from "@/server/authentication";

export async function GET(request: NextRequest) {
  const env = serverEnv();
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_SITE_URL));
  const code = request.nextUrl.searchParams.get("code");
  const invite = request.nextUrl.searchParams.get("invite");
  const requestedPath = request.nextUrl.searchParams.get("next");
  if (!code) return redirectTo("/login?error=invalid-link");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirectTo("/login?error=expired-link");
  const destination = await finishAuthentication({
    userId: data.user.id,
    email: data.user.email,
    invite: invite || undefined,
    requestedPath: requestedPath || undefined,
  });
  return redirectTo(destination);
}
