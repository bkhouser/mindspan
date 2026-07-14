"use client";

import { useEffect, useRef } from "react";
import { saveEditorialReview } from "./actions";

const interactive = "input,textarea,select,button,a,[contenteditable='true']";

export function EditorialReviewControls({
  versionId,
  notes,
  returnTo,
}: {
  versionId: string;
  notes: string;
  returnTo: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        (event.target instanceof Element && event.target.closest(interactive))
      )
        return;
      const verdict = { y: "approved", r: "needs_revision", n: "rejected" }[
        event.key.toLowerCase()
      ];
      const button = verdict ? buttons.current[verdict] : null;
      if (!button || !form.current) return;
      event.preventDefault();
      form.current.requestSubmit(button);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <form action={saveEditorialReview} className="mt-6" ref={form}>
      <input name="versionId" type="hidden" value={versionId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="block text-sm font-black" htmlFor="editorial-notes">
        Editorial notes
      </label>
      <textarea
        className="mt-2 min-h-28 w-full rounded-2xl border border-white/15 bg-slate-950/45 p-4"
        defaultValue={notes}
        id="editorial-notes"
        maxLength={4000}
        name="notes"
        placeholder="What should change, or why is this question good?"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            verdict: "approved",
            label: "Approve",
            shortcut: "Y",
            className: "bg-emerald-300 text-slate-950",
          },
          {
            verdict: "needs_revision",
            label: "Needs revision",
            shortcut: "R",
            className: "bg-amber-200 text-slate-950",
          },
          {
            verdict: "rejected",
            label: "Nay / Reject",
            shortcut: "N",
            className: "bg-rose-300 text-slate-950",
          },
        ].map((item) => (
          <button
            className={`min-h-12 rounded-2xl px-4 font-black ${item.className}`}
            key={item.verdict}
            name="verdict"
            ref={(element) => {
              buttons.current[item.verdict] = element;
            }}
            type="submit"
            value={item.verdict}
          >
            {item.label} <kbd className="ml-2 opacity-60">{item.shortcut}</kbd>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Decisions and notes are attached to this immutable question version.
        A replacement version must be reviewed again.
      </p>
    </form>
  );
}
