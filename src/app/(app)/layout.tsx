import { AppNav } from "@/components/app-nav";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAchievementsForUser } from "@/server/achievements";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, supabase } = await requireUser();
  const { data: firstVisitToday } = await supabase.rpc("record_daily_login_v1");
  if (firstVisitToday) {
    await evaluateAchievementsForUser(createAdminClient(), user.id);
  }
  const { data: unseenRows } = await supabase
    .from("user_achievements")
    .select("earned_at,achievements(slug,name,description,insight_reward)")
    .eq("user_id", user.id)
    .is("notified_at", null)
    .order("earned_at", { ascending: false })
    .limit(10);
  const unseenAchievements =
    unseenRows?.flatMap((row) => {
      const achievement = Array.isArray(row.achievements)
        ? row.achievements[0]
        : row.achievements;
      return achievement
        ? [
            {
              slug: achievement.slug,
              name: achievement.name,
              description: achievement.description,
              insightAwarded: achievement.insight_reward,
            },
          ]
        : [];
    }) ?? [];
  return (
    <div>
      <AppNav isAdmin={profile.role === "sys_admin"} />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:ml-64 lg:px-10 lg:py-10">
        {children}
      </main>
      <AchievementCelebration achievements={unseenAchievements} />
    </div>
  );
}
