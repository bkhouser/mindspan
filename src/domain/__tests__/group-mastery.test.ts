import { describe, expect, it } from "vitest";
import {
  compareOverallPointStandings,
  compareTopicPointStandings,
  groupLeaderboardSummary,
} from "@/domain/group-mastery";
import type { TopicMastery } from "@/domain/types";

function mastery(
  topicId: string,
  uniqueQuestions: number,
  proficiency: number,
  rankScore: number | null,
): TopicMastery {
  return {
    topicId,
    proficiency,
    rankScore,
    accuracy: 0.5,
    assistedRate: 0,
    weightedSuccesses: 1,
    weightedEvidence: uniqueQuestions,
    uniqueQuestions,
    tier: rankScore === null ? "unrated" : "developing",
  };
}

describe("groupLeaderboardSummary", () => {
  it("reports proficiency across attempted topics", () => {
    const result = groupLeaderboardSummary([
      mastery("science", 2, 0.58, null),
      mastery("music", 3, 0.64, null),
    ]);

    expect(result.rankedTopicCount).toBe(0);
    expect(result.proficiency).toBeCloseTo(0.61);
  });

  it("retains the count of confidence-qualified topics as context", () => {
    const result = groupLeaderboardSummary([
      mastery("science", 5, 0.7, 0.4),
      mastery("music", 3, 0.6, null),
    ]);

    expect(result.rankedTopicCount).toBe(1);
    expect(result.proficiency).toBeCloseTo(0.65);
  });

  it("ranks more points ahead of higher proficiency", () => {
    const standings = [
      {
        totalPoints: 900,
        rankedTopicCount: 8,
        unique: 100,
        proficiency: 0.9,
      },
      {
        totalPoints: 1_000,
        rankedTopicCount: 1,
        unique: 20,
        proficiency: 0.5,
      },
    ].sort(compareOverallPointStandings);

    expect(standings[0]?.totalPoints).toBe(1_000);
  });

  it("ranks topic standings by points before supporting evidence", () => {
    const standings = [
      { points: 200, uniqueQuestions: 20, proficiency: 0.9 },
      { points: 300, uniqueQuestions: 5, proficiency: 0.5 },
    ].sort(compareTopicPointStandings);

    expect(standings[0]?.points).toBe(300);
  });
});
