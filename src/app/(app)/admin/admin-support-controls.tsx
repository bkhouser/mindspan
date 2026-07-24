"use client";

import { useActionState } from "react";
import { sendAdminPasswordReset, setUserAccess } from "./actions";

export function AdminSupportControls({
  disabled,
  displayName,
  userId,
}: {
  disabled: boolean;
  displayName: string;
  userId: string;
}) {
  const [resetState, resetAction, resetPending] = useActionState(
    sendAdminPasswordReset,
    {},
  );
  const [accessState, accessAction, accessPending] = useActionState(
    setUserAccess,
    {},
  );
  const nextAction = disabled ? "restore" : "suspend";

  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-bold text-[var(--brand)]">
        Support actions
      </summary>
      <div className="mt-3 grid gap-3 rounded-xl bg-white/5 p-3">
        <form action={resetAction} className="flex flex-wrap gap-2">
          <input name="userId" type="hidden" value={userId} />
          <input
            aria-label={`Reason for ${displayName}'s password reset`}
            className="min-h-9 min-w-40 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3"
            minLength={3}
            name="reason"
            placeholder="Reason for reset"
            required
          />
          <button
            className="rounded-full bg-white/10 px-3 font-black disabled:opacity-40"
            disabled={disabled || resetPending}
            type="submit"
          >
            Send reset email
          </button>
          {resetState.error ? (
            <p className="w-full text-rose-200" role="alert">
              {resetState.error}
            </p>
          ) : null}
          {resetState.message ? (
            <p className="w-full text-emerald-200" role="status">
              {resetState.message}
            </p>
          ) : null}
        </form>
        <form
          action={accessAction}
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            if (
              !window.confirm(
                `${nextAction[0].toUpperCase()}${nextAction.slice(1)} ${displayName}'s Mindspan access? This action is audited.`,
              )
            )
              event.preventDefault();
          }}
        >
          <input name="userId" type="hidden" value={userId} />
          <input name="disabled" type="hidden" value={String(!disabled)} />
          <input
            aria-label={`Reason to ${nextAction} ${displayName}'s access`}
            className="min-h-9 min-w-40 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3"
            minLength={3}
            name="reason"
            placeholder={`Reason to ${nextAction}`}
            required
          />
          <button
            className={`rounded-full px-3 font-black disabled:opacity-40 ${disabled ? "bg-emerald-300 text-slate-950" : "bg-rose-300/20 text-rose-100"}`}
            disabled={accessPending}
            type="submit"
          >
            {disabled ? "Restore access" : "Suspend access"}
          </button>
          {accessState.error ? (
            <p className="w-full text-rose-200" role="alert">
              {accessState.error}
            </p>
          ) : null}
          {accessState.message ? (
            <p className="w-full text-emerald-200" role="status">
              {accessState.message}
            </p>
          ) : null}
        </form>
      </div>
    </details>
  );
}
