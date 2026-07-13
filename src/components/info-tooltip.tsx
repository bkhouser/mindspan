import type { ReactNode } from "react";

export function InfoTooltip({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-describedby={id}
        aria-label="What is Insight?"
        className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]"
        type="button"
      >
        {children}
      </button>
      <span
        className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-left text-xs font-medium leading-5 text-slate-100 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        id={id}
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
