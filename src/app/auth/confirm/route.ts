import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { finishAuthentication } from "@/server/authentication";

export async function GET(request: NextRequest) {
  const env = serverEnv();
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(
      new URL(path, env.NEXT_PUBLIC_SITE_URL),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpType = emailOtpType(request.nextUrl.searchParams.get("type"));
  const code = request.nextUrl.searchParams.get("code");
  const invite = request.nextUrl.searchParams.get("invite");
  const requestedPath = request.nextUrl.searchParams.get("next");
  if ((!tokenHash || !otpType) && !code)
    return redirectTo("/login?error=invalid-link");
  const supabase = await createClient();
  const { data, error } = tokenHash && otpType
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error || !data.user) return redirectTo("/login?error=expired-link");
  const destination = await finishAuthentication({
    userId: data.user.id,
    email: data.user.email,
    invite: invite || undefined,
    requestedPath: requestedPath || undefined,
  });
  return redirectTo(destination);
}

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "recovery",
  "invite",
  "email_change",
  "signup",
  "magiclink",
]);

function emailOtpType(value: string | null): EmailOtpType | null {
  return value && emailOtpTypes.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}
