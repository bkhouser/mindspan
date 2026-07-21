import { Award, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { achievementProgress } from "@/domain/achievements";
import { requireUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const { user, supabase } = await requireUser();
  const [
    { data: definitions },
    { data: earnedRows },
    { data: profile },
    { count: attempts },
    { count: hardCorrect },
    { data: mastery },
    { count: loginDays },
  ] = await Promise.all([
    supabase
      .from("achievements")
      .select(
        "id,slug,name,description,evaluator_key,insight_reward,created_at,enabled",
      )
      .order("created_at"),
    supabase
      .from("user_achievements")
      .select("achievement_id,earned_at")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("attempts")
      .select("id,question_versions!inner(difficulty)", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("correct", true)
      .gte("question_versions.difficulty", 4),
    supabase
      .from("user_topic_mastery")
      .select("tier,unique_questions,topics(slug)")
      .eq("user_id", user.id),
    supabase
      .from("user_login_days")
      .select("login_date", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);
  const proficientTopicSlugs =
    mastery?.flatMap((row) => {
      if (!["proficient", "expert", "master"].includes(row.tier)) return [];
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
      return topic?.slug ? [topic.slug] : [];
    }) ?? [];
  const metrics = {
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    totalAttempts: attempts ?? 0,
    attemptedTopics:
      mastery?.filter((row) => row.unique_questions > 0).length ?? 0,
    proficientTopicSlugs,
    hardCorrect: hardCorrect ?? 0,
    rankedTopics:
      mastery?.filter((row) => row.unique_questions >= 5).length ?? 0,
    loginDays: loginDays ?? 0,
  };
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
      progress: achievementProgress(achievement.evaluator_key, metrics),
    }))
    .sort((a, b) => {
      if (a.earnedAt && !b.earnedAt) return -1;
      if (!a.earnedAt && b.earnedAt) return 1;
      if (a.earnedAt && b.earnedAt) {
        return (
          new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
        );
      }
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
            <table className="w-full min-w-[840px] border-collapse text-left">
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
                    Progress
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
                      <td className="px-4 py-3 text-xs font-black tabular-nums text-slate-200">
                        {achievement.progress ? (
                          <span className="whitespace-nowrap">
                            {achievement.progress.current.toLocaleString()}/
                            {achievement.progress.target.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
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
