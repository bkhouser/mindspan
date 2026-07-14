import type { TopicMastery } from "@/domain/types";

interface OverallPointStanding {
  totalPoints: number;
  rankedTopicCount: number;
  unique: number;
  proficiency: number | null;
}

interface TopicPointStanding {
  points: number;
  uniqueQuestions: number;
  proficiency: number | null;
}

export function compareOverallPointStandings(
  a: OverallPointStanding,
  b: OverallPointStanding,
) {
  return (
    b.totalPoints - a.totalPoints ||
    b.rankedTopicCount - a.rankedTopicCount ||
    b.unique - a.unique ||
    (b.proficiency ?? 0) - (a.proficiency ?? 0)
  );
}

export function compareTopicPointStandings(
  a: TopicPointStanding,
  b: TopicPointStanding,
) {
  return (
    b.points - a.points ||
    b.uniqueQuestions - a.uniqueQuestions ||
    (b.proficiency ?? 0) - (a.proficiency ?? 0)
  );
}

export function groupLeaderboardSummary(mastery: TopicMastery[]) {
  const attemptedTopics = mastery.filter((entry) => entry.weightedEvidence > 0);
  const proficiency = attemptedTopics.length
    ? attemptedTopics.reduce((sum, entry) => sum + entry.proficiency, 0) /
      attemptedTopics.length
    : null;

  return {
    proficiency,
    rankedTopicCount: mastery.filter((entry) => entry.rankScore !== null)
      .length,
  };
}
