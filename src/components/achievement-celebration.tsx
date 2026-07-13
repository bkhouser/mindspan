"use client";

import { useState, useTransition } from "react";
import { Award, Sparkles } from "lucide-react";
import { markAchievementsNotified } from "@/app/(app)/actions";

export interface AchievementNotice {
  slug: string;
  name: string;
  description?: string;
  insightAwarded: number;
}

export function AchievementCelebration({
  achievements,
}: {
  achievements: AchievementNotice[];
}) {
  const [visible, setVisible] = useState(achievements.length > 0);
  const [isPending, startTransition] = useTransition();
  if (!visible || !achievements.length) return null;

  function dismiss() {
    startTransition(async () => {
      await markAchievementsNotified(
        achievements.map((achievement) => achievement.slug),
      );
      setVisible(false);
    });
  }

  return (
    <aside
      aria-atomic="true"
      aria-live="polite"
      className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md overflow-hidden rounded-3xl border border-amber-200/40 bg-slate-950/95 p-6 shadow-2xl shadow-amber-300/20 backdrop-blur sm:left-auto sm:right-6 sm:mx-0"
      data-enter-advance-blocker="true"
      role="status"
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-300/15 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-300/15 text-amber-200">
          <Award aria-hidden="true" size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.2em] text-amber-200">
            Achievement unlocked
          </p>
          {achievements.map((achievement) => (
            <div className="mt-3" key={achievement.slug}>
              <h2 className="text-xl font-black">{achievement.name}</h2>
              {achievement.description ? (
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {achievement.description}
                </p>
              ) : null}
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-[var(--accent)]">
                <Sparkles aria-hidden="true" size={15} />+
                {achievement.insightAwarded} Insight
              </p>
            </div>
          ))}
          <button
            className="mt-5 min-h-10 rounded-full bg-amber-200 px-5 text-sm font-black text-slate-950 disabled:opacity-60"
            disabled={isPending}
            onClick={dismiss}
            type="button"
          >
            {isPending ? "Saving…" : "Nice!"}
          </button>
        </div>
      </div>
    </aside>
  );
}
