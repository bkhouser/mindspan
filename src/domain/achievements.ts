const QUESTION_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;
const LOGIN_DAY_MILESTONES = [3, 7, 30, 100] as const;

export const MAIN_TOPIC_SLUGS = [
  "science-nature",
  "history",
  "geography",
  "sports",
  "arts-literature",
  "film-television",
  "music",
  "lifestyle-culture",
] as const;

export interface AchievementMetrics {
  onboardingCompleted: boolean;
  totalAttempts: number;
  attemptedTopics: number;
  proficientTopicSlugs: string[];
  hardCorrect: number;
  rankedTopics: number;
  loginDays: number;
}

export function eligibleAchievementEvaluators(metrics: AchievementMetrics) {
  const eligible: string[] = [];
  if (metrics.onboardingCompleted) eligible.push("onboarding_complete");
  for (const milestone of QUESTION_MILESTONES) {
    if (metrics.totalAttempts >= milestone)
      eligible.push(`attempts_${milestone}`);
  }
  if (metrics.attemptedTopics >= 5) eligible.push("topics_5");
  if (metrics.proficientTopicSlugs.length) eligible.push("tier_proficient");
  for (const topicSlug of MAIN_TOPIC_SLUGS) {
    if (metrics.proficientTopicSlugs.includes(topicSlug))
      eligible.push(`topic_proficient:${topicSlug}`);
  }
  if (metrics.hardCorrect >= 10) eligible.push("hard_correct_10");
  if (metrics.rankedTopics >= 5) eligible.push("ranked_topics_5");
  for (const milestone of LOGIN_DAY_MILESTONES) {
    if (metrics.loginDays >= milestone)
      eligible.push(`login_days_${milestone}`);
  }
  return eligible;
}
