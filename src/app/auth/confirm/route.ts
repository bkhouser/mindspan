import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const env = serverEnv();
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_SITE_URL));
  const code = request.nextUrl.searchParams.get("code");
  const invite = request.nextUrl.searchParams.get("invite");
  if (!code) return redirectTo("/login?error=invalid-link");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirectTo("/login?error=expired-link");
  const admin = createAdminClient();
  let granted = false;
  if (invite) {
    const { data: redemption } = await admin.rpc("redeem_invite_for_user", { raw_token: invite, target_user: data.user.id });
    granted = Boolean(redemption?.[0]?.granted);
  }
  if (env.INITIAL_SYS_ADMIN_EMAIL && data.user.email?.toLowerCase() === env.INITIAL_SYS_ADMIN_EMAIL.toLowerCase()) {
    await admin.from("profiles").update({ role: "sys_admin", beta_access_granted_at: new Date().toISOString() }).eq("id", data.user.id);
    granted = true;
  }
  if (!granted) {
    const { data: profile } = await admin.from("profiles").select("beta_access_granted_at").eq("id", data.user.id).single();
    granted = Boolean(profile?.beta_access_granted_at);
  }
  return redirectTo(granted ? "/onboarding" : "/no-access");
}
