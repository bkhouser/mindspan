import { requireUser } from "@/lib/auth";
import type { PlayMode } from "@/domain/types";
import { PlayGame } from "./play-game";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; packId?: string; start?: string }>;
}) {
  const { user, profile, supabase } = await requireUser();
  const params = await searchParams;
  const initialMode: PlayMode =
    params.mode === "topic" || params.mode === "pack" ? params.mode : "mixed";
  const [{ data: topics }, { data: unlocks }, { data: settings }] =
    await Promise.all([
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
  const initialSelectedId =
    initialMode === "pack" && packs.some((pack) => pack.id === params.packId)
      ? params.packId
      : undefined;
  return (
    <PlayGame
      autoStart={params.start === "1" && Boolean(initialSelectedId)}
      immediateChoiceSubmit={profile.immediate_choice_submit}
      initialMode={initialMode}
      initialSelectedId={initialSelectedId}
      packs={packs}
      showPlayIntro={profile.show_play_intro}
      standardTimerSeconds={settings?.default_timer_seconds ?? 30}
      topics={topics ?? []}
    />
  );
}
