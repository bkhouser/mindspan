"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveRecoveredPassword } from "./actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(saveRecoveredPassword, {});
  return (
    <form action={action} className="mt-7 space-y-4">
      <div><label className="text-sm font-bold" htmlFor="password">New password</label><input autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4" id="password" minLength={12} name="password" required type="password" /></div>
      <div><label className="text-sm font-bold" htmlFor="confirmation">Confirm new password</label><input autoComplete="new-password" className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4" id="confirmation" minLength={12} name="confirmation" required type="password" /></div>
      {state.error ? <p className="text-sm font-bold text-[var(--danger)]" role="alert">{state.error}</p> : null}
      {state.message ? <div className="rounded-2xl bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100" role="status"><p>{state.message}</p><a className="mt-2 inline-block font-black underline" href="/home">Continue to Mindspan</a></div> : null}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}
