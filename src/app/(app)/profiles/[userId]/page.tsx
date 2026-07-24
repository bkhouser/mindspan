import { Crown, UserMinus } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { topicMastery } from "@/domain/mastery";
import { requireUser } from "@/lib/auth";
import { changeMemberRole, removeMember } from "../../groups/actions";

export default async function SharedProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, supabase } = await requireUser();
  const [
    { data: profile },
    { data: rows },
    { data: awards },
    { data: unlocks },
    { data: viewerAdminMemberships },
    { data: targetMemberships },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,avatar_path,created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_topic_mastery")
      .select("*,topics(name)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("user_achievements")
      .select("earned_at,achievements(name,description)")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false }),
    supabase
      .from("pack_unlocks")
      .select("unlocked_at,packs(name)")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("group_memberships")
      .select("group_id,role,groups(id,name)")
      .eq("user_id", user.id)
      .eq("role", "admin"),
    supabase
      .from("group_memberships")
      .select("group_id,role")
      .eq("user_id", userId),
  ]);
  if (!profile) notFound();

  const stats = (rows ?? []).map((row) => ({
    row,
    mastery: topicMastery({
      topicId: row.topic_id,
      weightedSuccesses: Number(row.weighted_successes),
      weightedEvidence: Number(row.weighted_evidence),
      uniqueQuestions: row.unique_questions,
      correctAttempts: row.correct_attempts,
      totalAttempts: row.total_attempts,
      assistedCorrectAttempts: row.assisted_correct_attempts,
    }),
  }));
  const attempts = stats.reduce(
    (sum, item) => sum + item.row.total_attempts,
    0,
  );
  const correct = stats.reduce(
    (sum, item) => sum + item.row.correct_attempts,
    0,
  );
  const points = stats.reduce(
    (sum, item) => sum + Number(item.row.lifetime_points),
    0,
  );
  const targetMembershipByGroup = new Map(
    (targetMemberships ?? []).map((membership) => [
      membership.group_id,
      membership,
    ]),
  );
  const manageableGroups =
    user.id === userId
      ? []
      : (viewerAdminMemberships ?? [])
          .flatMap((membership) => {
            const targetMembership = targetMembershipByGroup.get(
              membership.group_id,
            );
            const group = Array.isArray(membership.groups)
              ? membership.groups[0]
              : membership.groups;
            return targetMembership && group
              ? [
                  {
                    groupId: membership.group_id,
                    groupName: group.name,
                    role: targetMembership.role,
                  },
                ]
              : [];
          })
          .sort((left, right) => left.groupName.localeCompare(right.groupName));

  return (
    <>
      <header>
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Shared profile
        </p>
        <h1 className="mt-2 text-4xl font-black">{profile.display_name}</h1>
        <p className="mt-3 text-[var(--muted)]">
          Playing since {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <b className="text-3xl">{points.toLocaleString()}</b>
          <p className="mt-1 text-sm text-[var(--muted)]">Lifetime points</p>
        </Card>
        <Card className="p-5">
          <b className="text-3xl">
            {attempts ? Math.round((correct / attempts) * 100) : 0}%
          </b>
          <p className="mt-1 text-sm text-[var(--muted)]">Raw accuracy</p>
        </Card>
        <Card className="p-5">
          <b className="text-3xl">
            {stats.reduce((sum, item) => sum + item.row.unique_questions, 0)}
          </b>
          <p className="mt-1 text-sm text-[var(--muted)]">Unique questions</p>
        </Card>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6">
          <h2 className="text-xl font-black">Topic history</h2>
          <div className="mt-5 space-y-4">
            {stats.map(({ row, mastery }) => {
              const topic = Array.isArray(row.topics)
                ? row.topics[0]
                : row.topics;
              return (
                <div
                  className="rounded-2xl bg-white/[.035] p-4"
                  key={row.topic_id}
                >
                  <div className="flex justify-between">
                    <b>{topic?.name ?? "Topic"}</b>
                    <b>{Math.round(mastery.proficiency * 100)}%</b>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {mastery.tier} · {row.unique_questions} unique ·{" "}
                    {Math.round(mastery.accuracy * 100)}% accuracy ·{" "}
                    {Number(row.lifetime_points).toLocaleString()} pts
                  </p>
                </div>
              );
            })}
            {!stats.length ? (
              <p className="text-sm text-[var(--muted)]">
                No topic history yet.
              </p>
            ) : null}
          </div>
        </Card>
        <div className="space-y-6">
          {manageableGroups.length ? (
            <Card className="p-6">
              <h2 className="text-lg font-black">Group management</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Controls are shown only for groups you administer.
              </p>
              <div className="mt-4 divide-y divide-white/10">
                {manageableGroups.map((membership) => (
                  <div className="py-4" key={membership.groupId}>
                    <div className="flex items-center justify-between gap-3">
                      <b className="text-sm">{membership.groupName}</b>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
                        {membership.role}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={changeMemberRole}>
                        <input
                          name="groupId"
                          type="hidden"
                          value={membership.groupId}
                        />
                        <input name="userId" type="hidden" value={userId} />
                        <input
                          name="role"
                          type="hidden"
                          value={
                            membership.role === "admin" ? "member" : "admin"
                          }
                        />
                        <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-bold hover:border-amber-200/40 hover:text-amber-100">
                          <Crown aria-hidden="true" size={15} />
                          {membership.role === "admin"
                            ? "Make member"
                            : "Make admin"}
                        </button>
                      </form>
                      <form action={removeMember}>
                        <input
                          name="groupId"
                          type="hidden"
                          value={membership.groupId}
                        />
                        <input name="userId" type="hidden" value={userId} />
                        <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rose-300/20 px-4 text-xs font-bold text-rose-200 hover:border-rose-300/50">
                          <UserMinus aria-hidden="true" size={15} />
                          Remove from group
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          <Card className="p-6">
            <h2 className="text-lg font-black">Achievements</h2>
            {awards?.map((award) => {
              const achievement = Array.isArray(award.achievements)
                ? award.achievements[0]
                : award.achievements;
              return (
                <div
                  className="mt-3"
                  key={`${award.earned_at}-${achievement?.name}`}
                >
                  <b className="text-sm">{achievement?.name}</b>
                  <p className="text-xs text-[var(--muted)]">
                    {achievement?.description}
                  </p>
                </div>
              );
            })}
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-black">Packs</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {unlocks?.map((unlock) => {
                const pack = Array.isArray(unlock.packs)
                  ? unlock.packs[0]
                  : unlock.packs;
                return (
                  <span
                    className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold"
                    key={`${unlock.unlocked_at}-${pack?.name}`}
                  >
                    {pack?.name}
                  </span>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
