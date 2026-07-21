import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv, serverEnv } from "@/lib/env";
import { currentAuthenticationDestination } from "@/server/authentication";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; setup?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = hasSupabaseEnv();
  if (configured) {
    const destination = await currentAuthenticationDestination({
      invite: params.invite,
    });
    if (destination) redirect(destination);
  }
  const errorMessage =
    params.error === "invalid-invite"
      ? "That invitation is invalid or has expired."
      : params.error
        ? "That authentication link is invalid or has expired."
        : undefined;
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        {!configured || params.setup ? (
          <>
            <Link className="text-xl font-black" href="/">
              Mindspan
            </Link>
            <h1 className="mt-8 text-3xl font-black tracking-tight">
              Welcome back
            </h1>
            <p className="mb-7 mt-3 leading-7 text-[var(--muted)]">
              Sign in with your email and password.
            </p>
            <p className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
              Local Supabase environment variables are not configured yet. Copy{" "}
              <code>.env.example</code> to <code>.env.local</code> after
              starting Supabase.
            </p>
          </>
        ) : (
          <LoginForm
            bootstrapEnabled={Boolean(serverEnv().INITIAL_SYS_ADMIN_EMAIL)}
            initialError={errorMessage}
            invite={params.invite}
          />
        )}
      </Card>
    </main>
  );
}
