import { AppNav } from "@/components/app-nav";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { ReleaseUpdateNotice } from "@/components/release-update-notice";
import { canReviewQuestions } from "@/domain/authorization";
import {
  CURRENT_RELEASE,
  releasesNewerThan,
  visibleRelease,
} from "@/domain/release-notes";
import { APP_VERSION } from "@/lib/app-version";
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
  const isAdmin = profile.role === "sys_admin";
  const hasQuestionReviewAccess = canReviewQuestions(profile.role);
  const previousVersion = profile.last_app_version;
  const newerReleases = releasesNewerThan(previousVersion);
  const releaseCount =
    previousVersion && previousVersion !== APP_VERSION
      ? Math.max(newerReleases.length, 1)
      : 0;
  const updateNotice = releaseCount
    ? visibleRelease(CURRENT_RELEASE, isAdmin)
    : null;
  if (previousVersion !== APP_VERSION) {
    await supabase
      .from("profiles")
      .update({ last_app_version: APP_VERSION })
      .eq("id", user.id);
  }
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
      <AppNav canReviewQuestions={hasQuestionReviewAccess} isAdmin={isAdmin} />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:ml-64 lg:px-10 lg:py-10">
        {children}
      </main>
      <AchievementCelebration achievements={unseenAchievements} />
      <ReleaseUpdateNotice release={updateNotice} releaseCount={releaseCount} />
    </div>
  );
}
