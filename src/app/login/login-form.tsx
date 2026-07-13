"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestMagicLink } from "./actions";

export function LoginForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, {});
  if (state.sent) return <div className="rounded-2xl bg-emerald-300/10 p-5 text-emerald-100"><b>Check your inbox.</b><p className="mt-2 text-sm leading-6">Your one-time Mindspan sign-in link is on its way.</p></div>;
  return (
    <form action={action} className="space-y-5">
      <input name="invite" type="hidden" value={invite ?? ""} />
      <label className="block text-sm font-bold" htmlFor="email">Email address</label>
      <input className="min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4 text-white placeholder:text-slate-500" id="email" name="email" placeholder="you@example.com" required type="email" />
      {state.error ? <p className="text-sm text-[var(--danger)]" role="alert">{state.error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Sending…" : "Email me a magic link"}</Button>
    </form>
  );
}
