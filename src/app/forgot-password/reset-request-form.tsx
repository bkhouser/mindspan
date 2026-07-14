"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "./actions";

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="mt-7 space-y-4">
      <div>
        <label className="text-sm font-bold" htmlFor="email">Email address</label>
        <input autoComplete="email" className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4" id="email" name="email" required type="email" />
      </div>
      {state.error ? <p className="text-sm font-bold text-[var(--danger)]" role="alert">{state.error}</p> : null}
      {state.message ? <p className="rounded-2xl bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100" role="status">{state.message}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}
