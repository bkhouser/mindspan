"use client";

import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  hasSignificantQuestionChanges,
  questionChangesSummary,
} from "@/domain/release-note-utils";
import type { ReleaseNote } from "@/domain/release-notes";

export function ReleaseUpdateNotice({
  release,
  releaseCount,
}: {
  release: ReleaseNote | null;
  releaseCount: number;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(Boolean(release));
  if (!visible || !release || pathname === "/updates") return null;

  return (
    <aside
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md overflow-hidden rounded-3xl border border-[var(--brand)]/35 bg-slate-950/95 p-6 shadow-2xl shadow-emerald-950/40 backdrop-blur sm:left-auto sm:right-6 sm:mx-0"
      role="status"
    >
      <button
        aria-label="Close update notice"
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-white/5 hover:text-white"
        onClick={() => setVisible(false)}
        type="button"
      >
        <X aria-hidden="true" size={18} />
      </button>
      <div className="flex items-start gap-4 pr-8">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
          <Megaphone aria-hidden="true" size={22} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[var(--brand)]">
            Mindspan was updated
          </p>
          <h2 className="mt-1 text-xl font-black">{release.title}</h2>
          {releaseCount > 1 ? (
            <p className="mt-2 text-sm text-slate-300">
              There have been {releaseCount} updates since your last visit.
            </p>
          ) : null}
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
        {release.highlights.slice(0, 5).map((highlight) => (
          <li className="flex gap-2" key={highlight.text}>
            <span aria-hidden="true" className="text-[var(--brand)]">
              •
            </span>
            {highlight.text}
          </li>
        ))}
      </ul>
      {hasSignificantQuestionChanges(release.questionChanges) ? (
        <p className="mt-4 rounded-xl bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-300">
          Question quality: {questionChangesSummary(release.questionChanges!)}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-10 items-center rounded-full bg-[var(--brand)] px-5 text-sm font-black text-slate-950"
          href="/updates"
        >
          See all updates
        </Link>
        <button
          className="min-h-10 rounded-full px-4 text-sm font-bold text-[var(--muted)] hover:bg-white/5 hover:text-white"
          onClick={() => setVisible(false)}
          type="button"
        >
          Continue
        </button>
      </div>
    </aside>
  );
}
