"use client";

import { useActionState, useState } from "react";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  requestMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "./actions";

function Notice({ message }: { message?: string }) {
  return message ? (
    <div
      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100"
      role="status"
    >
      {message}
    </div>
  ) : null;
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm font-bold text-[var(--danger)]" role="alert">
      {message}
    </p>
  ) : null;
}

export function LoginForm({
  invite,
  bootstrapEnabled,
  initialError,
}: {
  invite?: string;
  bootstrapEnabled: boolean;
  initialError?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">(
    invite ? "signup" : "signin",
  );
  const [signInState, signInAction, signingIn] = useActionState(
    signInWithPassword,
    {},
  );
  const [signUpState, signUpAction, signingUp] = useActionState(
    signUpWithPassword,
    {},
  );
  const [magicState, magicAction, sendingMagic] = useActionState(
    requestMagicLink,
    {},
  );
  const activeState = mode === "signin" ? signInState : signUpState;

  if (mode === "signup" && signUpState.message) {
    return (
      <div className="py-6 text-center" role="status">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-300/15 text-emerald-200">
          <MailCheck aria-hidden="true" size={32} />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          Check your inbox
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          We sent you a confirmation link. Open it to finish creating your
          Mindspan account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link className="text-xl font-black" href="/">
        Mindspan
      </Link>
      <h1 className="pt-3 text-3xl font-black tracking-tight">
        {invite ? "Join Mindspan" : "Welcome back"}
      </h1>
      <p className="pb-2 leading-7 text-[var(--muted)]">
        {invite
          ? "Create your invited beta account with your email and password."
          : "Sign in with your email and password."}
      </p>
      {invite || bootstrapEnabled ? (
        <div
          className="grid grid-cols-2 rounded-2xl bg-white/5 p-1"
          aria-label="Account action"
        >
          <button
            className={`min-h-10 rounded-xl text-sm font-black ${mode === "signup" ? "bg-white/10 text-white" : "text-[var(--muted)]"}`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
          <button
            className={`min-h-10 rounded-xl text-sm font-black ${mode === "signin" ? "bg-white/10 text-white" : "text-[var(--muted)]"}`}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
        </div>
      ) : null}
      {!invite && bootstrapEnabled && mode === "signup" ? (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
          Initial setup accepts only the configured system-administrator email.
        </p>
      ) : null}

      <form
        action={mode === "signin" ? signInAction : signUpAction}
        className="space-y-4"
      >
        <input name="invite" type="hidden" value={invite ?? ""} />
        <div>
          <label className="text-sm font-bold" htmlFor="email">
            Email address
          </label>
          <input
            autoComplete="email"
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4 text-white placeholder:text-slate-500"
            id="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold" htmlFor="password">
              Password
            </label>
            {mode === "signin" ? (
              <a
                className="text-xs font-bold text-[var(--brand)] hover:underline"
                href="/forgot-password"
              >
                Forgot password?
              </a>
            ) : null}
          </div>
          <input
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4 text-white"
            id="password"
            minLength={12}
            name="password"
            required
            type="password"
          />
          {mode === "signup" ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Use at least 12 characters.
            </p>
          ) : null}
        </div>
        {mode === "signup" ? (
          <div>
            <label className="text-sm font-bold" htmlFor="confirmation">
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4 text-white"
              id="confirmation"
              minLength={12}
              name="confirmation"
              required
              type="password"
            />
          </div>
        ) : null}
        <ErrorMessage message={initialError ?? activeState.error} />
        {mode === "signin" ? <Notice message={activeState.message} /> : null}
        <Button
          className="w-full gap-2"
          disabled={signingIn || signingUp}
          type="submit"
        >
          <KeyRound aria-hidden="true" size={18} />
          {signingIn || signingUp
            ? "Working…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      {mode === "signin" ? (
        <details className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <summary className="cursor-pointer text-sm font-black">
            Use a one-time email link instead
          </summary>
          <form action={magicAction} className="mt-4 space-y-3">
            <input name="invite" type="hidden" value={invite ?? ""} />
            <label className="sr-only" htmlFor="magic-email">
              Email address for one-time link
            </label>
            <input
              autoComplete="email"
              className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/55 px-4"
              id="magic-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
            <ErrorMessage message={magicState.error} />
            <Notice message={magicState.message} />
            <Button
              className="w-full gap-2"
              disabled={sendingMagic}
              type="submit"
            >
              <Mail aria-hidden="true" size={17} />
              {sendingMagic ? "Sending…" : "Email a sign-in link"}
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
