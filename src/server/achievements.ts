import { eligibleAchievementEvaluators } from "@/domain/achievements";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function evaluateAchievementsForUser(
  admin: AdminClient,
  userId: string,
) {
  const [
    { data: profile },
    { count: attempts },
    { count: hardCorrect },
    { data: mastery },
    { count: loginDays },
    { data: earnedAchievements },
    { data: ledger },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .single(),
    admin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("attempts")
      .select("id,question_versions!inner(difficulty)", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("correct", true)
      .gte("question_versions.difficulty", 4),
    admin
      .from("user_topic_mastery")
      .select("tier,unique_questions,topics(slug)")
      .eq("user_id", userId),
    admin
      .from("user_login_days")
      .select("login_date", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("user_achievements")
      .select("achievements(evaluator_key)")
      .eq("user_id", userId),
    admin.from("insight_ledger").select("amount").eq("user_id", userId),
  ]);
  const proficientTopicSlugs =
    mastery?.flatMap((row) => {
      if (!["proficient", "expert", "master"].includes(row.tier)) return [];
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
      return topic?.slug ? [topic.slug] : [];
    }) ?? [];
  const earnedEvaluatorKeys = new Set(
    earnedAchievements?.flatMap((row) => {
      const achievement = Array.isArray(row.achievements)
        ? row.achievements[0]
        : row.achievements;
      return achievement?.evaluator_key ? [achievement.evaluator_key] : [];
    }) ?? [],
  );
  const eligible = eligibleAchievementEvaluators({
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    totalAttempts: attempts ?? 0,
    attemptedTopics:
      mastery?.filter((row) => row.unique_questions > 0).length ?? 0,
    proficientTopicSlugs,
    hardCorrect: hardCorrect ?? 0,
    rankedTopics:
      mastery?.filter((row) => row.unique_questions >= 5).length ?? 0,
    loginDays: loginDays ?? 0,
  }).filter((evaluator) => !earnedEvaluatorKeys.has(evaluator));
  const awardedRows: Array<{
    slug: string;
    name: string;
    insightAwarded: number;
  }> = [];
  for (const evaluator of eligible) {
    const { data } = await admin.rpc("award_achievement_v1", {
      target_user: userId,
      evaluator,
    });
    if (data?.[0])
      awardedRows.push({
        slug: data[0].slug,
        name: data[0].name,
        insightAwarded: data[0].insight_awarded,
      });
  }
  const { data: awardedDefinitions } = awardedRows.length
    ? await admin
        .from("achievements")
        .select("slug,description")
        .in(
          "slug",
          awardedRows.map((award) => award.slug),
        )
    : { data: [] };
  const descriptions = new Map(
    awardedDefinitions?.map((achievement) => [
      achievement.slug,
      achievement.description,
    ]),
  );
  const awards = awardedRows.map((award) => ({
    ...award,
    description: descriptions.get(award.slug) ?? "",
  }));
  return {
    awards,
    insightBalance:
      (ledger?.reduce((sum, row) => sum + row.amount, 0) ?? 0) +
      awardedRows.reduce((sum, award) => sum + award.insightAwarded, 0),
  };
}
