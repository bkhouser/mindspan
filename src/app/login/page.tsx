import Link from "next/link";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string; setup?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <Link className="text-xl font-black" href="/">Mindspan</Link>
        <h1 className="mt-8 text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="mb-7 mt-3 leading-7 text-[var(--muted)]">Sign in without a password. New beta players need an invitation.</p>
        {!hasSupabaseEnv() || params.setup ? <p className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Local Supabase environment variables are not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> after starting Supabase.</p> : <LoginForm invite={params.invite} />}
      </Card>
    </main>
  );
}
