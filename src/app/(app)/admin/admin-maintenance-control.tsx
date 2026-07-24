"use client";

import { setMaintenanceMode } from "./actions";

export function AdminMaintenanceControl({
  activePresentationCount,
  enabled,
}: {
  activePresentationCount: number;
  enabled: boolean;
}) {
  const label = enabled ? "Resume play" : "Begin update drain";
  return (
    <form
      action={setMaintenanceMode}
      className="mt-5"
      onSubmit={(event) => {
        const prompt = enabled
          ? "Resume new play sessions now?"
          : "Begin an update drain? New questions will pause while active answers remain available.";
        if (!window.confirm(prompt)) event.preventDefault();
      }}
    >
      <input name="enabled" type="hidden" value={String(!enabled)} />
      <p className="text-sm text-[var(--muted)]">
        {enabled
          ? `${activePresentationCount} active question${activePresentationCount === 1 ? "" : "s"} still able to submit.`
          : "New sessions and questions continue normally."}
      </p>
      <button
        className={`mt-4 min-h-11 rounded-full px-5 font-black ${enabled ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}
