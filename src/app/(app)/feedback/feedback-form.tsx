"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { submitFeedback, type FeedbackFormState } from "./actions";

const initialState: FeedbackFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Sending…" : "Send feedback"}
    </Button>
  );
}

export function FeedbackForm({ sourcePage }: { sourcePage: string }) {
  const [state, action] = useActionState(submitFeedback, initialState);

  return (
    <form action={action} className="space-y-6">
      <input name="pagePath" type="hidden" value={sourcePage} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">
          What kind of feedback is this?
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3"
            defaultValue="bug"
            name="category"
          >
            <option value="bug">Something is broken</option>
            <option value="confusing">Something is confusing</option>
            <option value="suggestion">Suggestion</option>
            <option value="content">Question or content issue</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          How much did it affect you?
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3"
            defaultValue="annoying"
            name="impact"
          >
            <option value="minor">Minor</option>
            <option value="annoying">Annoying, but I could continue</option>
            <option value="blocking">Blocking—I could not continue</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-bold">
        What happened or what would you change?
        <textarea
          className="mt-2 min-h-36 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 leading-6"
          maxLength={4000}
          minLength={10}
          name="description"
          placeholder="Include enough detail for us to understand and reproduce the issue."
          required
        />
      </label>
      <label className="block text-sm font-bold">
        What did you expect instead?{" "}
        <span className="text-[var(--muted)]">(optional)</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 leading-6"
          maxLength={2000}
          name="expectedBehavior"
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-200">
        <input
          className="mt-1 size-4 accent-[var(--brand)]"
          defaultChecked
          name="contactAllowed"
          type="checkbox"
        />
        You may contact me inside the beta group if you need more details.
      </label>
      {state.error ? (
        <p
          className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton />
        <span className="text-xs text-[var(--muted)]">
          We automatically include the page, app version, browser, and device
          type.
        </span>
      </div>
    </form>
  );
}
