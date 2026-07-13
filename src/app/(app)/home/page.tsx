import { ArrowRight, Brain, Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { InfoTooltip } from "@/components/info-tooltip";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export default async function HomePage() {
  const { user, profile, supabase } = await requireUser();
  const [
    { data: mastery },
    { data: ledger },
    { count: attempts },
    { data: recentAchievements },
  ] = await Promise.all([
    supabase
      .from("user_topic_mastery")
      .select(
        "weighted_successes, weighted_evidence, lifetime_points, unique_questions, topics(name)",
      )
      .eq("user_id", user.id)
      .order("lifetime_points", { ascending: false })
      .limit(4),
    supabase.from("insight_ledger").select("amount").eq("user_id", user.id),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("user_achievements")
      .select("earned_at,achievements(slug,name,description,insight_reward)")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(3),
  ]);
  const points =
    mastery?.reduce((sum, row) => sum + Number(row.lifetime_points), 0) ?? 0;
  const insight = ledger?.reduce((sum, row) => sum + row.amount, 0) ?? 0;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
            Your mindspan
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Ready when you are, {profile.display_name}.
          </h1>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 font-black text-slate-950"
          href="/play"
        >
          Play now <ArrowRight size={18} />
        </Link>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Trophy,
            label: "Lifetime points",
            value: points.toLocaleString(),
          },
          { icon: Brain, label: "Questions answered", value: attempts ?? 0 },
          {
            icon: Sparkles,
            label: "Insight",
            value: insight,
            tooltip:
              "Insight is currency earned from achievements. Spend it to unlock bonus question packs; it does not affect mastery or leaderboard rank.",
          },
        ].map(({ icon: Icon, label, value, tooltip }) => (
          <Card className="p-5" key={label}>
            {tooltip ? (
              <InfoTooltip id="home-insight-help" label={tooltip}>
                <Icon
                  aria-hidden="true"
                  className="text-[var(--brand)]"
                  size={20}
                />
              </InfoTooltip>
            ) : (
              <Icon
                aria-hidden="true"
                className="text-[var(--brand)]"
                size={20}
              />
            )}
            <p className="mt-5 text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
          </Card>
        ))}
      </section>
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[var(--brand)]">
                PLAY WITHOUT LIMITS
              </p>
              <h2 className="mt-1 text-2xl font-black">Choose your next run</h2>
            </div>
            <Flame className="text-[var(--accent)]" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              className="rounded-2xl bg-emerald-300/10 p-4 font-bold hover:bg-emerald-300/15"
              href="/play?mode=mixed"
            >
              Mixed play
              <small className="mt-1 block font-normal text-[var(--muted)]">
                Your interests, intelligently mixed
              </small>
            </Link>
            <Link
              className="rounded-2xl bg-white/5 p-4 font-bold hover:bg-white/10"
              href="/play?mode=topic"
            >
              Choose a topic
              <small className="mt-1 block font-normal text-[var(--muted)]">
                Build a specific specialty
              </small>
            </Link>
            <Link
              className="rounded-2xl bg-white/5 p-4 font-bold hover:bg-white/10"
              href="/play?mode=pack"
            >
              Choose a pack
              <small className="mt-1 block font-normal text-[var(--muted)]">
                Follow a curated collection
              </small>
            </Link>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-black">Strongest topics</h2>
          <div className="mt-5 space-y-4">
            {mastery?.length ? (
              mastery.map((row, index) => {
                const p =
                  (Number(row.weighted_successes) + 2) /
                  (Number(row.weighted_evidence) + 4);
                const topic = Array.isArray(row.topics)
                  ? row.topics[0]
                  : row.topics;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm">
                      <span>{topic?.name ?? "Topic"}</span>
                      <b>{Math.round(p * 100)}%</b>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--brand)]"
                        style={{ width: `${p * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">
                Play your first questions to reveal the shape of your knowledge.
              </p>
            )}
          </div>
        </Card>
      </section>
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-amber-200">MILESTONES</p>
            <h2 className="mt-1 text-xl font-black">Recent achievements</h2>
          </div>
          <Link
            className="text-sm font-black text-[var(--brand)]"
            href="/achievements"
          >
            View all <ArrowRight className="inline" size={16} />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {recentAchievements?.map((row) => {
            const achievement = Array.isArray(row.achievements)
              ? row.achievements[0]
              : row.achievements;
            if (!achievement) return null;
            return (
              <div
                className="rounded-2xl border border-amber-200/15 bg-amber-200/[.045] p-4"
                key={`${achievement.slug}-${row.earned_at}`}
              >
                <div className="flex items-start gap-3">
                  <Trophy
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-200"
                    size={20}
                  />
                  <div>
                    <b>{achievement.name}</b>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {achievement.description}
                    </p>
                    <p className="mt-2 text-xs font-bold text-[var(--accent)]">
                      +{achievement.insight_reward} Insight ·{" "}
                      {new Date(row.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {!recentAchievements?.length ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Your completed milestones will appear here. Keep playing to earn
              your first achievement.
            </p>
          ) : null}
        </div>
      </Card>
    </>
  );
}
