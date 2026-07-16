import { redirect } from "next/navigation";
import { canReviewQuestions } from "@/domain/authorization";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (!hasSupabaseEnv()) redirect("/login?setup=required");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.beta_access_granted_at) redirect("/no-access");
  if (profile.disabled_at) redirect("/no-access?disabled=1");
  return { user, profile, supabase };
}

export async function requireSysAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "sys_admin") redirect("/home");
  return context;
}

export async function requireQuestionReviewer() {
  const context = await requireUser();
  if (!canReviewQuestions(context.profile.role)) redirect("/home");
  return context;
}
