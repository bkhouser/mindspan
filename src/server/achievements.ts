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
  ]);
  const proficientTopicSlugs =
    mastery?.flatMap((row) => {
      if (!["proficient", "expert", "master"].includes(row.tier)) return [];
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
      return topic?.slug ? [topic.slug] : [];
    }) ?? [];
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
  });
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
  const { data: ledger } = await admin
    .from("insight_ledger")
    .select("amount")
    .eq("user_id", userId);
  return {
    awards,
    insightBalance: ledger?.reduce((sum, row) => sum + row.amount, 0) ?? 0,
  };
}
