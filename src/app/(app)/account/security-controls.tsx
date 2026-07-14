"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changePassword } from "./actions";

export function SecurityControls({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, {});

  return (
    <div className="max-w-2xl">
      <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6">
        <h2 className="text-xl font-black">
          {hasPassword ? "Change password" : "Add password sign-in"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Use at least 12 characters. A password manager is recommended.
        </p>
        <form action={action} className="mt-5 space-y-4">
          {hasPassword ? (
            <div>
              <label className="text-sm font-bold" htmlFor="currentPassword">
                Current password
              </label>
              <input
                autoComplete="current-password"
                className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/55 px-4"
                id="currentPassword"
                name="currentPassword"
                required
                type="password"
              />
            </div>
          ) : null}
          <div>
            <label className="text-sm font-bold" htmlFor="newPassword">
              New password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/55 px-4"
              id="newPassword"
              minLength={12}
              name="password"
              required
              type="password"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="passwordConfirmation">
              Confirm new password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/55 px-4"
              id="passwordConfirmation"
              minLength={12}
              name="confirmation"
              required
              type="password"
            />
          </div>
          {state.error ? (
            <p className="text-sm font-bold text-[var(--danger)]" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.message ? (
            <p className="text-sm font-bold text-emerald-300" role="status">
              {state.message}
            </p>
          ) : null}
          <Button disabled={pending} type="submit">
            {pending
              ? "Saving…"
              : hasPassword
                ? "Change password"
                : "Add password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
