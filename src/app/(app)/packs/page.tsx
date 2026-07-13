import { LockKeyhole, PackageOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DifficultyStars } from "@/components/difficulty-stars";
import {
  calculatePackAverageDifficulty,
  calculatePackProgress,
} from "@/domain/pack-progress";
import { requireUser } from "@/lib/auth";
import { unlockPack } from "./actions";

function AverageDifficulty({
  value,
  showValue = false,
}: {
  value: number | null;
  showValue?: boolean;
}) {
  if (value === null)
    return <span className="text-xs text-[var(--muted)]">Not rated</span>;
  const formatted = value.toFixed(1);
  return (
    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
      <DifficultyStars
        difficulty={value}
        label={`Average difficulty ${formatted} out of 5`}
        size={13}
      />
      {showValue ? (
        <span aria-hidden="true" className="text-xs font-black text-amber-100">
          {formatted}/5
        </span>
      ) : null}
    </span>
  );
}

export default async function PacksPage() {
  const { user, supabase } = await requireUser();
  const now = new Date().toISOString();
  const [
    { data: packs },
    { data: unlocks },
    { data: ledger },
    { data: packQuestions },
    { data: questionStates },
    { data: publishedVersions },
  ] = await Promise.all([
    supabase
      .from("packs")
      .select("id,name,description,price_insight,is_starter,topics(name)")
      .eq("enabled", true)
      .order("is_starter", { ascending: false })
      .order("name"),
    supabase.from("pack_unlocks").select("pack_id").eq("user_id", user.id),
    supabase.from("insight_ledger").select("amount").eq("user_id", user.id),
    supabase.from("pack_questions").select("pack_id,question_id"),
    supabase
      .from("user_question_state")
      .select("question_id,attempt_count,correct_count")
      .eq("user_id", user.id),
    supabase
      .from("question_versions")
      .select("question_id,difficulty")
      .eq("status", "published")
      .or(`expires_at.is.null,expires_at.gt.${now}`),
  ]);
  const owned = new Set(unlocks?.map((item) => item.pack_id));
  const balance = ledger?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const playableQuestions = new Set(
    publishedVersions?.map((version) => version.question_id),
  );
  const progressByPack = calculatePackProgress(
    (packQuestions ?? []).filter((link) =>
      playableQuestions.has(link.question_id),
    ),
    questionStates ?? [],
  );
  const averageDifficultyByPack = calculatePackAverageDifficulty(
    packQuestions ?? [],
    publishedVersions ?? [],
  );
  const unlockedPacks = packs?.filter((pack) => owned.has(pack.id)) ?? [];
  const lockedPacks = packs?.filter((pack) => !owned.has(pack.id)) ?? [];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
            Question catalog
          </p>
          <h1 className="mt-2 text-4xl font-black">Packs</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-300/10 px-4 py-2 font-black text-amber-200">
          <Sparkles aria-hidden="true" size={18} />
          {balance} Insight
        </div>
      </header>

      <section className="mt-8" aria-labelledby="unlocked-packs-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black" id="unlocked-packs-heading">
              Unlocked packs
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Unique-question progress across packs you can play now.
            </p>
          </div>
          <p className="text-sm font-bold text-[var(--muted)]">
            {unlockedPacks.length} available
          </p>
        </div>
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">
                Progress through unlocked question packs
              </caption>
              <thead className="bg-white/[.04] text-left text-[11px] font-black uppercase tracking-[.14em] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3" scope="col">
                    Pack
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Topic
                  </th>
                  <th className="px-4 py-3 text-center" scope="col">
                    Questions
                  </th>
                  <th className="px-4 py-3 text-center" scope="col">
                    Avg. difficulty
                  </th>
                  <th className="px-4 py-3 text-center" scope="col">
                    Answered
                  </th>
                  <th className="px-5 py-3 text-center" scope="col">
                    Correct
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {unlockedPacks.map((pack) => {
                  const topic = Array.isArray(pack.topics)
                    ? pack.topics[0]
                    : pack.topics;
                  const progress = progressByPack.get(pack.id) ?? {
                    answered: 0,
                    correct: 0,
                    total: 0,
                  };
                  return (
                    <tr className="hover:bg-white/[.025]" key={pack.id}>
                      <th className="px-5 py-4 text-left" scope="row">
                        <span className="font-black text-white">
                          {pack.name}
                        </span>
                        <span className="mt-1 block max-w-xl text-xs font-normal leading-5 text-[var(--muted)]">
                          {pack.description}
                        </span>
                      </th>
                      <td className="px-4 py-4">
                        <span className="whitespace-nowrap rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold">
                          {topic?.name ?? "Mixed"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-black">
                        {progress.total}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <AverageDifficulty
                          value={averageDifficultyByPack.get(pack.id) ?? null}
                        />
                      </td>
                      <td className="px-4 py-4 text-center font-black text-sky-100">
                        {progress.answered}/{progress.total}
                      </td>
                      <td className="px-5 py-4 text-center font-black text-emerald-200">
                        {progress.correct}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!unlockedPacks.length ? (
            <p className="p-6 text-sm text-[var(--muted)]">
              No packs are unlocked yet.
            </p>
          ) : null}
        </Card>
      </section>

      {lockedPacks.length ? (
        <section className="mt-10" aria-labelledby="unlock-packs-heading">
          <div>
            <h2 className="text-2xl font-black" id="unlock-packs-heading">
              Unlock more packs
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Spend Insight to add another pack to your catalog.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lockedPacks.map((pack) => {
              const topic = Array.isArray(pack.topics)
                ? pack.topics[0]
                : pack.topics;
              const total = progressByPack.get(pack.id)?.total ?? 0;
              const averageDifficulty =
                averageDifficultyByPack.get(pack.id) ?? null;
              return (
                <Card className="flex flex-col p-6" key={pack.id}>
                  <div className="flex items-start justify-between">
                    <PackageOpen
                      aria-hidden="true"
                      className="text-[var(--brand)]"
                    />
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold">
                      {topic?.name ?? "Mixed"}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-black">{pack.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">
                    {pack.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-sky-100">
                      {total} {total === 1 ? "question" : "questions"}
                    </p>
                    <AverageDifficulty showValue value={averageDifficulty} />
                  </div>
                  <form action={unlockPack} className="mt-6">
                    <input name="packId" type="hidden" value={pack.id} />
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 px-4 font-black disabled:opacity-40"
                      disabled={balance < pack.price_insight}
                      type="submit"
                    >
                      <LockKeyhole aria-hidden="true" size={16} />
                      Unlock · {pack.price_insight}
                    </button>
                  </form>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
