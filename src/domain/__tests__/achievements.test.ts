import { describe, expect, it } from "vitest";
import { eligibleAchievementEvaluators } from "../achievements";

const baseMetrics = {
  onboardingCompleted: false,
  assessmentCompleted: false,
  totalAttempts: 0,
  attemptedTopics: 0,
  proficientTopicSlugs: [],
  hardCorrect: 0,
  rankedTopics: 0,
  loginDays: 0,
};

describe("achievement evaluation", () => {
  it("returns cumulative question and login milestones", () => {
    expect(
      eligibleAchievementEvaluators({
        ...baseMetrics,
        totalAttempts: 100,
        loginDays: 30,
      }),
    ).toEqual([
      "attempts_10",
      "attempts_25",
      "attempts_50",
      "attempts_100",
      "login_days_3",
      "login_days_7",
      "login_days_30",
    ]);
  });

  it("awards only the proficient main topics", () => {
    expect(
      eligibleAchievementEvaluators({
        ...baseMetrics,
        proficientTopicSlugs: ["science-nature", "music", "bonus-topic"],
      }),
    ).toEqual([
      "tier_proficient",
      "topic_proficient:science-nature",
      "topic_proficient:music",
    ]);
  });

  it("keeps the original onboarding and breadth evaluators", () => {
    expect(
      eligibleAchievementEvaluators({
        ...baseMetrics,
        onboardingCompleted: true,
        totalAttempts: 10,
        attemptedTopics: 5,
      }),
    ).toEqual(["onboarding_complete", "attempts_10", "topics_5"]);
  });
});
