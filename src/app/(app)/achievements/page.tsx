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
      (achievement) =>
        achievement.enabled || earnedById.has(achievement.id),
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
          <h1 className="mt-2 text-4xl font-black">Achievements</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
            Milestones celebrate how you play and award Insight for unlocking
            bonus packs.
          </p>
        </div>
        <Card className="flex items-center gap-4 px-5 py-4">
          <Award className="text-amber-200" />
          <div>
            <b className="text-2xl">
              {earnedCount}/{achievements.length}
            </b>
            <p className="text-xs text-[var(--muted)]">Unlocked</p>
          </div>
        </Card>
      </header>
      <section className="mt-8" aria-label="Achievement catalog">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">
                All Mindspan achievements and their current status
              </caption>
              <thead className="bg-white/[.035] text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4" scope="col">
                    Achievement
                  </th>
                  <th className="px-6 py-4" scope="col">
                    Description
                  </th>
                  <th className="px-6 py-4" scope="col">
                    Reward
                  </th>
                  <th className="px-6 py-4" scope="col">
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
                      <th className="px-6 py-5" scope="row">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                              earned
                                ? "bg-amber-200/15 text-amber-200"
                                : "bg-white/5 text-[var(--muted)]"
                            }`}
                          >
                            {earned ? (
                              <CheckCircle2 aria-hidden="true" size={19} />
                            ) : (
                              <LockKeyhole aria-hidden="true" size={17} />
                            )}
                          </span>
                          <span className="font-black text-white">
                            {achievement.name}
                          </span>
                        </div>
                      </th>
                      <td className="max-w-xl px-6 py-5 text-sm leading-6 text-[var(--muted)]">
                        {achievement.description}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-black text-[var(--accent)]">
                          <Sparkles aria-hidden="true" size={15} />
                          {achievement.insight_reward} Insight
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            earned
                              ? "bg-emerald-300/10 text-emerald-200"
                              : "bg-white/5 text-[var(--muted)]"
                          }`}
                        >
                          {earned ? "Achieved" : "Locked"}
                        </span>
                        {achievement.earnedAt ? (
                          <p className="mt-1.5 whitespace-nowrap text-xs text-[var(--muted)]">
                            {new Date(
                              achievement.earnedAt,
                            ).toLocaleDateString()}
                          </p>
                        ) : null}
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
