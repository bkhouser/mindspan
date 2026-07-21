import { describe, expect, it } from "vitest";
import {
  achievementProgress,
  eligibleAchievementEvaluators,
} from "../achievements";

const baseMetrics = {
  onboardingCompleted: false,
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

  it("reports progress toward question and login milestones", () => {
    const metrics = {
      ...baseMetrics,
      totalAttempts: 565,
      loginDays: 12,
    };

    expect(achievementProgress("attempts_1000", metrics)).toEqual({
      current: 565,
      target: 1000,
    });
    expect(achievementProgress("attempts_100", metrics)).toEqual({
      current: 100,
      target: 100,
    });
    expect(achievementProgress("login_days_30", metrics)).toEqual({
      current: 12,
      target: 30,
    });
  });

  it("reports progress toward breadth and difficulty achievements", () => {
    const metrics = {
      ...baseMetrics,
      attemptedTopics: 3,
      hardCorrect: 7,
      rankedTopics: 4,
    };

    expect(achievementProgress("topics_5", metrics)).toEqual({
      current: 3,
      target: 5,
    });
    expect(achievementProgress("hard_correct_10", metrics)).toEqual({
      current: 7,
      target: 10,
    });
    expect(achievementProgress("ranked_topics_5", metrics)).toEqual({
      current: 4,
      target: 5,
    });
  });

  it("leaves binary achievements to their achieved or locked status", () => {
    const metrics = {
      ...baseMetrics,
      proficientTopicSlugs: ["music"],
    };

    expect(achievementProgress("onboarding_complete", metrics)).toBeNull();
    expect(achievementProgress("tier_proficient", metrics)).toBeNull();
    expect(achievementProgress("topic_proficient:music", metrics)).toBeNull();
    expect(achievementProgress("unknown_evaluator", metrics)).toBeNull();
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
