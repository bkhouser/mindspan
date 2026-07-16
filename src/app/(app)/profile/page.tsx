import { Award, Brain, Package, Sparkles } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { Card } from "@/components/ui/card";
import {
  accuracy,
  topicMastery,
  type MasteryState,
} from "@/domain/mastery";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { updatePlayPreferences } from "./actions";

const masteryBarColor = {
  unrated: "bg-slate-400",
  developing: "bg-amber-300",
  proficient: "bg-sky-300",
  expert: "bg-emerald-300",
  master: "bg-fuchsia-300",
} as const;

function formatTier(tier: keyof typeof masteryBarColor) {
  return tier.slice(0, 1).toUpperCase() + tier.slice(1);
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    preferenceSaved?: string;
    preferenceError?: string;
  }>;
}) {
  const params = await searchParams;
  const { user, profile, supabase } = await requireUser();
  const [
    { data: rows },
    { data: achievementDefinitions },
    { data: earnedAchievements },
    { data: ledger },
    { data: enabledPacks },
    { data: packUnlocks },
    { data: subtopicRows },
  ] = await Promise.all([
    supabase
      .from("user_topic_mastery")
      .select("*,topics(name)")
      .eq("user_id", user.id),
    supabase
      .from("achievements")
      .select("id,enabled"),
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id),
    supabase.from("insight_ledger").select("amount").eq("user_id", user.id),
    supabase.from("packs").select("id").eq("enabled", true),
    supabase
      .from("pack_unlocks")
      .select("pack_id")
      .eq("user_id", user.id),
    supabase
      .from("user_subtopic_mastery")
      .select("*,subtopics(name,topic_id)")
      .eq("user_id", user.id)
      .order("weighted_evidence", { ascending: false }),
  ]);
  const subtopicMastery =
    subtopicRows
      ?.map((row) => {
        const subtopic = Array.isArray(row.subtopics)
          ? row.subtopics[0]
          : row.subtopics;
        return {
          id: row.subtopic_id,
          name: subtopic?.name ?? "Subtopic",
          topicId: subtopic?.topic_id ?? "",
          proficiency: accuracy({
            correctAttempts: row.correct_attempts,
            totalAttempts: row.total_attempts,
          }),
          evidence: Number(row.weighted_evidence),
          uniqueQuestions: row.unique_questions,
        };
      })
      .sort(
        (left, right) =>
          right.proficiency - left.proficiency ||
          right.evidence - left.evidence ||
          left.name.localeCompare(right.name),
      ) ?? [];
  const mastery =
    rows
      ?.map((row) => ({
        value: topicMastery({
          topicId: row.topic_id,
          weightedSuccesses: Number(row.weighted_successes),
          weightedEvidence: Number(row.weighted_evidence),
          uniqueQuestions: row.unique_questions,
          correctAttempts: row.correct_attempts,
          totalAttempts: row.total_attempts,
          assistedCorrectAttempts: row.assisted_correct_attempts,
        } satisfies MasteryState),
        topic:
          (Array.isArray(row.topics) ? row.topics[0] : row.topics)?.name ??
          "Topic",
        points: row.lifetime_points,
        subtopics: subtopicMastery.filter(
          (subtopic) => subtopic.topicId === row.topic_id,
        ),
      }))
      .sort(
        (left, right) =>
          right.value.proficiency - left.value.proficiency ||
          right.value.weightedEvidence - left.value.weightedEvidence ||
          left.topic.localeCompare(right.topic),
      ) ?? [];
  const insight = ledger?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const earnedAchievementIds = new Set(
    earnedAchievements?.map((achievement) => achievement.achievement_id),
  );
  const availableAchievementIds = new Set(
    achievementDefinitions
      ?.filter(
        (achievement) =>
          achievement.enabled || earnedAchievementIds.has(achievement.id),
      )
      .map((achievement) => achievement.id),
  );
  const achievementCount =
    earnedAchievements?.filter((award) =>
      availableAchievementIds.has(award.achievement_id),
    ).length ?? 0;
  const availablePackIds = new Set(enabledPacks?.map((pack) => pack.id));
  const packCount =
    packUnlocks?.filter((unlock) => availablePackIds.has(unlock.pack_id))
      .length ?? 0;
  return (
    <>
      <header className="flex flex-wrap items-center gap-5">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-300/15 text-3xl font-black text-emerald-200">
          {profile.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
            Player profile
          </p>
          <h1 className="mt-1 text-4xl font-black">{profile.display_name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{user.email}</p>
        </div>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <Brain className="text-[var(--brand)]" />
          <p className="mt-4 text-2xl font-black">
            {mastery.reduce((sum, item) => sum + item.value.uniqueQuestions, 0)}
          </p>
          <span className="text-sm text-[var(--muted)]">Unique questions</span>
        </Card>
        <Card className="p-5">
          <InfoTooltip
            id="profile-insight-help"
            label="Insight is currency earned from achievements. Spend it to unlock bonus question packs; it does not affect mastery or leaderboard rank."
          >
            <Sparkles aria-hidden="true" className="text-[var(--accent)]" />
          </InfoTooltip>
          <p className="mt-4 text-2xl font-black">{insight}</p>
          <span className="text-sm text-[var(--muted)]">Insight</span>
        </Card>
        <a
          aria-label={`View achievements: ${achievementCount} of ${availableAchievementIds.size} earned`}
          className="group rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          href="/achievements"
        >
          <Card className="h-full p-5 transition group-hover:border-fuchsia-300/35 group-hover:bg-white/[.04]">
            <Award className="text-fuchsia-300" />
            <p className="mt-4 text-2xl font-black">
              {achievementCount}/{availableAchievementIds.size}
            </p>
            <span className="text-sm text-[var(--muted)]">
              Achievements earned
            </span>
          </Card>
        </a>
        <a
          aria-label={`View packs: ${packCount} of ${availablePackIds.size} unlocked`}
          className="group rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          href="/packs"
        >
          <Card className="h-full p-5 transition group-hover:border-sky-300/35 group-hover:bg-white/[.04]">
            <Package className="text-sky-300" />
            <p className="mt-4 text-2xl font-black">
              {packCount}/{availablePackIds.size}
            </p>
            <span className="text-sm text-[var(--muted)]">
              Packs unlocked
            </span>
          </Card>
        </a>
      </section>
      <section className="mt-8">
        <Card className="p-6">
          <h2 className="text-xl font-black">Topic mastery</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Percentages are your correct answers divided by total answers.
            Subtopic counts are distinct questions carrying that label;
            repeated attempts do not increase them.
          </p>
          <div className="mt-5 space-y-5">
            {mastery.map(({ value, topic, points, subtopics }) => (
              <div key={value.topicId}>
                <div className="flex flex-wrap justify-between gap-2">
                  <b>{topic}</b>
                  <span className="text-sm">
                    <b>{Math.round(value.proficiency * 100)}%</b>
                    {" \u00b7 "}
                    {value.uniqueQuestions} unique
                    {" \u00b7 "}
                    {Number(points).toLocaleString()} pts
                    {" \u00b7 "}
                    <span className="text-[var(--muted)]">
                      {formatTier(value.tier)}
                    </span>
                  </span>
                </div>
                <div
                  aria-label={`${topic} proficiency: ${Math.round(value.proficiency * 100)} percent, ${formatTier(value.tier)} tier`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(value.proficiency * 100)}
                  className="mt-2 h-2 rounded-full bg-white/10"
                  role="progressbar"
                >
                  <div
                    className={`h-full rounded-full ${masteryBarColor[value.tier]}`}
                    style={{ width: `${value.proficiency * 100}%` }}
                  />
                </div>
                {subtopics.length ? (
                  <div className="ml-3 mt-3 space-y-3 border-l border-white/10 pl-4">
                    {subtopics.map((subtopic) => (
                      <div key={subtopic.id}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <span className="font-bold text-[var(--muted)]">
                            {subtopic.name}
                          </span>
                          <span>
                            <b>{Math.round(subtopic.proficiency * 100)}%</b>
                            {" \u00b7 "}
                            <span className="text-[var(--muted)]">
                              {subtopic.uniqueQuestions} distinct{" "}
                              {subtopic.uniqueQuestions === 1
                                ? "question"
                                : "questions"}
                            </span>
                          </span>
                        </div>
                        <div
                          aria-label={`${subtopic.name} proficiency: ${Math.round(subtopic.proficiency * 100)} percent`}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={Math.round(
                            subtopic.proficiency * 100,
                          )}
                          className="mt-1.5 h-1 rounded-full bg-white/[.07]"
                          role="progressbar"
                        >
                          <div
                            className="h-full rounded-full bg-cyan-300/60"
                            style={{
                              width: `${subtopic.proficiency * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {!mastery.length ? (
              <p className="text-[var(--muted)]">
                No mastery evidence yet. Your first game will start the map.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-black">Play preferences</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Customize how answer choices behave for your account on every
          device.
        </p>
        <form action={updatePlayPreferences} className="mt-5">
          <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <input
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-300"
              defaultChecked={profile.immediate_choice_submit}
              name="immediateChoiceSubmit"
              type="checkbox"
            />
            <span>
              <span className="block font-black">
                Submit answer choices immediately
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                When enabled, clicking a revealed choice locks it in right
                away. There is no second confirmation.
              </span>
            </span>
          </label>
          {params.preferenceSaved ? (
            <p className="mt-3 text-sm font-bold text-emerald-300" role="status">
              Play preference saved.
            </p>
          ) : null}
          {params.preferenceError ? (
            <p className="mt-3 text-sm font-bold text-[var(--danger)]" role="alert">
              We could not save that preference. Please try again.
            </p>
          ) : null}
          <button
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 font-black text-slate-950 transition hover:bg-[var(--brand-strong)]"
            type="submit"
          >
            Save preference
          </button>
        </form>
      </Card>
      <form action={signOut} className="mt-6">
        <button
          className="text-sm font-bold text-[var(--muted)] hover:text-white"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </>
  );
}
