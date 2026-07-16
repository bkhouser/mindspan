import { Award, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const { user, supabase } = await requireUser();
  const [{ data: definitions }, { data: earnedRows }] = await Promise.all([
    supabase
      .from("achievements")
      .select("id,slug,name,description,insight_reward,created_at,enabled")
      .order("created_at"),
    supabase
      .from("user_achievements")
      .select("achievement_id,earned_at")
      .eq("user_id", user.id),
  ]);
  const earnedById = new Map(
    earnedRows?.map((row) => [row.achievement_id, row.earned_at]),
  );
  const achievements = (definitions ?? [])
    .filter(
      (achievement) => achievement.enabled || earnedById.has(achievement.id),
    )
    .map((achievement) => ({
      ...achievement,
      earnedAt: earnedById.get(achievement.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.earnedAt && !b.earnedAt) return -1;
      if (!a.earnedAt && b.earnedAt) return 1;
      return a.name.localeCompare(b.name);
    });
  const earnedCount = achievements.filter(
    (achievement) => achievement.earnedAt,
  ).length;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-200">
            Progression
          </p>
          <h1 className="mt-1 text-4xl font-black">Achievements</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Milestones celebrate how you play and award Insight for unlocking
            bonus packs.
          </p>
        </div>
        <Card className="flex items-center gap-3 px-4 py-3">
          <Award className="text-amber-200" size={20} />
          <div>
            <b className="text-xl">
              {earnedCount}/{achievements.length}
            </b>
            <p className="text-xs text-[var(--muted)]">Unlocked</p>
          </div>
        </Card>
      </header>
      <section className="mt-6" aria-label="Achievement catalog">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">
                All Mindspan achievements and their current status
              </caption>
              <thead className="bg-white/[.035] text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-2.5" scope="col">
                    Achievement
                  </th>
                  <th className="px-4 py-2.5" scope="col">
                    Description
                  </th>
                  <th className="px-4 py-2.5" scope="col">
                    Reward
                  </th>
                  <th className="px-4 py-2.5" scope="col">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {achievements.map((achievement) => {
                  const earned = Boolean(achievement.earnedAt);
                  return (
                    <tr
                      className={`border-t border-white/10 ${
                        earned
                          ? "bg-amber-200/[.045]"
                          : "text-slate-300 hover:bg-white/[.025]"
                      }`}
                      key={achievement.id}
                    >
                      <th className="px-4 py-3" scope="row">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                              earned
                                ? "bg-amber-200/15 text-amber-200"
                                : "bg-white/5 text-[var(--muted)]"
                            }`}
                          >
                            {earned ? (
                              <CheckCircle2 aria-hidden="true" size={15} />
                            ) : (
                              <LockKeyhole aria-hidden="true" size={14} />
                            )}
                          </span>
                          <span className="text-sm font-black text-white">
                            {achievement.name}
                          </span>
                        </div>
                      </th>
                      <td className="max-w-xl px-4 py-3 text-xs leading-5 text-[var(--muted)]">
                        {achievement.description}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-black text-[var(--accent)]">
                          <Sparkles aria-hidden="true" size={13} />
                          {achievement.insight_reward} Insight
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ${
                              earned
                                ? "bg-emerald-300/10 text-emerald-200"
                                : "bg-white/5 text-[var(--muted)]"
                            }`}
                          >
                            {earned ? "Achieved" : "Locked"}
                          </span>
                          {achievement.earnedAt ? (
                            <span className="text-xs text-[var(--muted)]">
                              {new Date(
                                achievement.earnedAt,
                              ).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
