import { requireUser } from "@/lib/auth";
import type { PlayMode } from "@/domain/types";
import { PlayGame } from "./play-game";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user, profile, supabase } = await requireUser();
  const params = await searchParams;
  const initialMode: PlayMode =
    params.mode === "topic" || params.mode === "pack" ? params.mode : "mixed";
  const [
    { data: topics },
    { data: unlocks },
    { data: memberships },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("id,name")
      .eq("enabled", true)
      .order("sort_order"),
    supabase
      .from("pack_unlocks")
      .select("packs!inner(id,name,enabled)")
      .eq("user_id", user.id)
      .eq("packs.enabled", true),
    supabase
      .from("group_memberships")
      .select("group_id,groups!inner(id,name,timer_seconds_override)")
      .eq("user_id", user.id),
    supabase
      .from("system_settings")
      .select("default_timer_seconds")
      .eq("id", true)
      .single(),
  ]);
  const packs =
    unlocks
      ?.flatMap((row) => (Array.isArray(row.packs) ? row.packs : [row.packs]))
      .filter(Boolean)
      .map((pack) => ({ id: pack.id, name: pack.name })) ?? [];
  const groups =
    memberships?.flatMap((membership) => {
      const group = Array.isArray(membership.groups)
        ? membership.groups[0]
        : membership.groups;
      return group
        ? [
            {
              id: group.id,
              name: group.name,
              timerSecondsOverride: group.timer_seconds_override,
            },
          ]
        : [];
    }) ?? [];
  return (
    <PlayGame
      globalTimerSeconds={settings?.default_timer_seconds ?? 30}
      groups={groups}
      immediateChoiceSubmit={profile.immediate_choice_submit}
      initialMode={initialMode}
      packs={packs}
      topics={topics ?? []}
    />
  );
}
