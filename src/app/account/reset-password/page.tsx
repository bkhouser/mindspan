import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");
  return <main className="grid min-h-screen place-items-center px-6 py-12"><Card className="w-full max-w-md p-7 sm:p-9"><Link className="text-xl font-black" href="/">Mindspan</Link><h1 className="mt-8 text-3xl font-black">Choose a new password</h1><p className="mt-3 leading-7 text-[var(--muted)]">Use at least 12 characters and avoid reusing a password from another site.</p><NewPasswordForm /></Card></main>;
}
