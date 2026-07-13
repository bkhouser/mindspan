import { Crown, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { topicMastery, type MasteryState } from "@/domain/mastery";
import type { TopicMastery } from "@/domain/types";
import { Card } from "@/components/ui/card";
import { GroupCoverage } from "@/components/group-coverage";
import { requireUser } from "@/lib/auth";
import {
  changeMemberRole,
  createGroupInvite,
  removeMember,
  revokeGroupInvite,
  updateGroup,
} from "../actions";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ invite?: string; cursor?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const { user, supabase } = await requireUser();
  let feedQuery = supabase
    .from("activity_events")
    .select("id,kind,payload,created_at,profiles(display_name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (query.cursor) feedQuery = feedQuery.lt("created_at", query.cursor);
  const [
    { data: group },
    { data: memberships },
    { data: topics },
    { data: feedRows },
    { data: invites },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,name,description,timer_seconds_override")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_memberships")
      .select("user_id,role,joined_at,profiles(display_name,avatar_path)")
      .eq("group_id", groupId)
      .order("joined_at"),
    supabase
      .from("topics")
      .select("id,name")
      .eq("enabled", true)
      .order("sort_order"),
    feedQuery,
    supabase
      .from("group_invites")
      .select("id,expires_at,use_count,max_uses,revoked_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("system_settings")
      .select("default_timer_seconds")
      .eq("id", true)
      .single(),
  ]);
  if (!group) notFound();
  const currentMembership = memberships?.find(
    (item) => item.user_id === user.id,
  );
  const isAdmin = currentMembership?.role === "admin";
  const userIds = memberships?.map((item) => item.user_id) ?? [];
  const { data: masteryRows } = userIds.length
    ? await supabase
        .from("user_topic_mastery")
        .select("*")
        .in("user_id", userIds)
    : { data: [] };
  const members = (memberships ?? [])
    .map((membership) => {
      const profile = Array.isArray(membership.profiles)
        ? membership.profiles[0]
        : membership.profiles;
      const rows = (masteryRows ?? []).filter(
        (row) => row.user_id === membership.user_id,
      );
      const mastery: TopicMastery[] = rows.map((row) =>
        topicMastery({
          topicId: row.topic_id,
          weightedSuccesses: Number(row.weighted_successes),
          weightedEvidence: Number(row.weighted_evidence),
          uniqueQuestions: row.unique_questions,
          correctAttempts: row.correct_attempts,
          totalAttempts: row.total_attempts,
          assistedCorrectAttempts: row.assisted_correct_attempts,
        } satisfies MasteryState),
      );
      const overall =
        (topics ?? []).reduce(
          (sum, topic) =>
            sum +
            (mastery.find((item) => item.topicId === topic.id)?.rankScore ?? 0),
          0,
        ) / Math.max(1, topics?.length ?? 0);
      const totalAttempts = rows.reduce(
        (sum, row) => sum + row.total_attempts,
        0,
      );
      const correct = rows.reduce((sum, row) => sum + row.correct_attempts, 0);
      return {
        id: membership.user_id,
        name: profile?.display_name ?? "Member",
        role: membership.role,
        mastery,
        overall,
        totalPoints: rows.reduce(
          (sum, row) => sum + Number(row.lifetime_points),
          0,
        ),
        unique: rows.reduce((sum, row) => sum + row.unique_questions, 0),
        accuracy: totalAttempts ? correct / totalAttempts : 0,
      };
    })
    .sort((a, b) => b.overall - a.overall);
  const feed = feedRows?.slice(0, 20);
  const nextCursor =
    feedRows && feedRows.length > 20 ? feedRows[19].created_at : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const inviteUrl = query.invite
    ? `${siteUrl}/login?invite=${encodeURIComponent(query.invite)}`
    : null;

  return (
    <>
      <header>
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Private group
        </p>
        <h1 className="mt-2 text-4xl font-black">{group.name}</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          {group.description}
        </p>
      </header>
      {inviteUrl ? (
        <Card className="mt-6 border-emerald-300/30 p-5">
          <b>Invitation ready</b>
          <div className="mt-3 flex items-center gap-3">
            <input
              aria-label="Group invitation link"
              className="min-h-11 min-w-0 flex-1 rounded-xl bg-slate-950/60 px-3 text-sm"
              readOnly
              value={inviteUrl}
            />
            <CopyButton value={inviteUrl} />
          </div>
        </Card>
      ) : null}
      {isAdmin ? (
        <details className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5">
          <summary className="cursor-pointer font-black">
            Group settings
          </summary>
          <form action={updateGroup} className="mt-5 grid gap-3">
            <input name="groupId" type="hidden" value={groupId} />
            <label className="text-sm font-bold">
              Name
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/50 px-3"
                defaultValue={group.name}
                name="name"
                required
              />
            </label>
            <label className="text-sm font-bold">
              Description
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-slate-950/50 p-3"
                defaultValue={group.description}
                name="description"
              />
            </label>
            <label className="text-sm font-bold">
              Answer timer override
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/50 px-3"
                defaultValue={group.timer_seconds_override ?? ""}
                max="120"
                min="10"
                name="timerOverride"
                placeholder={`Use global default (${settings?.default_timer_seconds ?? 30} seconds)`}
                type="number"
              />
              <span className="mt-2 block font-normal leading-5 text-[var(--muted)]">
                Leave blank to follow the global default. Points and speed
                mastery always use the global clock so group rankings stay fair.
              </span>
            </label>
            <button className="w-fit rounded-full bg-[var(--brand)] px-5 py-2.5 font-black text-slate-950">
              Save group
            </button>
          </form>
          <div className="mt-6">
            <b className="text-sm">Recent invitation links</b>
            {invites?.map((invite) => (
              <div
                className="mt-2 flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs"
                key={invite.id}
              >
                <span>
                  {invite.revoked_at
                    ? "Revoked"
                    : new Date(invite.expires_at) < new Date()
                      ? "Expired"
                      : `${invite.use_count}/${invite.max_uses} used`}
                </span>
                {!invite.revoked_at ? (
                  <form action={revokeGroupInvite}>
                    <input name="groupId" type="hidden" value={groupId} />
                    <input name="inviteId" type="hidden" value={invite.id} />
                    <button className="font-bold text-rose-300">Revoke</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Coverage map</h2>
              <span className="text-sm text-[var(--muted)]">
                {members.length} members
              </span>
            </div>
            <GroupCoverage members={members} topics={topics ?? []} />
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-black">Overall mastery</h2>
            <div className="mt-5 space-y-3">
              {members.map((member, index) => (
                <div
                  className="flex items-center gap-4 rounded-2xl bg-white/[.035] p-4"
                  key={member.id}
                >
                  <span className="w-6 text-center font-black text-[var(--accent)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-bold hover:text-[var(--brand)]"
                      href={`/profiles/${member.id}`}
                    >
                      {member.name}
                    </Link>
                    <small className="ml-2 text-[var(--muted)]">
                      {member.unique} unique ·{" "}
                      {Math.round(member.accuracy * 100)}% ·{" "}
                      {member.totalPoints.toLocaleString()} pts
                    </small>
                  </div>
                  <b>{Math.round(member.overall * 100)}%</b>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-black">Topic leaderboards</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {topics?.map((topic) => {
                const ranked = members
                  .map((member) => ({
                    member,
                    score:
                      member.mastery.find((entry) => entry.topicId === topic.id)
                        ?.rankScore ?? null,
                  }))
                  .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
                return (
                  <div
                    className="rounded-2xl bg-white/[.035] p-4"
                    key={topic.id}
                  >
                    <b>{topic.name}</b>
                    <ol className="mt-3 space-y-2">
                      {ranked.map(({ member, score }, index) => (
                        <li className="flex gap-2 text-sm" key={member.id}>
                          <span className="w-5 text-[var(--muted)]">
                            {score == null ? "—" : index + 1}
                          </span>
                          <Link
                            className="min-w-0 flex-1 truncate"
                            href={`/profiles/${member.id}`}
                          >
                            {member.name}
                          </Link>
                          <b>
                            {score == null
                              ? "Unranked"
                              : `${Math.round(score * 100)}%`}
                          </b>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Members</h2>
              {isAdmin ? (
                <form action={createGroupInvite}>
                  <input name="groupId" type="hidden" value={groupId} />
                  <button
                    aria-label="Create invitation"
                    className="rounded-full bg-emerald-300/10 p-2 text-emerald-200"
                  >
                    <UserPlus size={18} />
                  </button>
                </form>
              ) : null}
            </div>
            <div className="mt-4 divide-y divide-white/10">
              {members.map((member) => (
                <div className="flex items-center gap-3 py-3" key={member.id}>
                  {member.role === "admin" ? (
                    <Crown className="text-[var(--accent)]" size={17} />
                  ) : (
                    <span className="w-[17px]" />
                  )}
                  <Link
                    className="min-w-0 flex-1 truncate text-sm font-bold"
                    href={`/profiles/${member.id}`}
                  >
                    {member.name}
                  </Link>
                  {isAdmin && member.id !== user.id ? (
                    <div className="flex gap-1">
                      <form action={changeMemberRole}>
                        <input name="groupId" type="hidden" value={groupId} />
                        <input name="userId" type="hidden" value={member.id} />
                        <input
                          name="role"
                          type="hidden"
                          value={member.role === "admin" ? "member" : "admin"}
                        />
                        <button
                          className="p-2 text-xs text-[var(--muted)]"
                          title={member.role === "admin" ? "Demote" : "Promote"}
                        >
                          {member.role === "admin" ? "Member" : "Admin"}
                        </button>
                      </form>
                      <form action={removeMember}>
                        <input name="groupId" type="hidden" value={groupId} />
                        <input name="userId" type="hidden" value={member.id} />
                        <button
                          aria-label={`Remove ${member.name}`}
                          className="p-2 text-rose-300"
                        >
                          <UserMinus size={16} />
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-black">Activity</h2>
            <ol className="mt-4 space-y-4">
              {feed?.map((event) => {
                const actor = Array.isArray(event.profiles)
                  ? event.profiles[0]
                  : event.profiles;
                return (
                  <li className="text-sm leading-6" key={event.id}>
                    <b>{actor?.display_name ?? "A member"}</b>{" "}
                    {event.kind.replaceAll("_", " ")}
                    <time className="block text-xs text-[var(--muted)]">
                      {new Date(event.created_at).toLocaleDateString()}
                    </time>
                  </li>
                );
              })}
              {!feed?.length ? (
                <li className="text-sm text-[var(--muted)]">
                  Group activity will appear here.
                </li>
              ) : null}
            </ol>
            {nextCursor ? (
              <Link
                className="mt-5 inline-block text-sm font-bold text-[var(--brand)]"
                href={`/groups/${groupId}?cursor=${encodeURIComponent(nextCursor)}`}
              >
                Older activity
              </Link>
            ) : null}
          </Card>
        </div>
      </section>
    </>
  );
}
