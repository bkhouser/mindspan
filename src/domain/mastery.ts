import type { Difficulty, MasteryTier, TopicMastery } from "./types";

const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = { 1: 0.6, 2: 0.8, 3: 1, 4: 1.25, 5: 1.5 };
const REPEAT_EVIDENCE = [1, 0.5, 0.25, 0.1] as const;
const WILSON_Z_80 = 1.281551565545;

export interface MasteryState {
  topicId: string;
  weightedSuccesses: number;
  weightedEvidence: number;
  uniqueQuestions: number;
  correctAttempts: number;
  totalAttempts: number;
  assistedCorrectAttempts: number;
}

export interface MasteryAttempt {
  difficulty: Difficulty;
  priorCorrectCount: number;
  correct: boolean;
  assisted: boolean;
  remainingRatio: number;
  isUnique: boolean;
}

export function skillEstimate(state: Pick<MasteryState, "weightedSuccesses" | "weightedEvidence">) {
  return Math.min(
    1,
    Math.max(
      0,
      (state.weightedSuccesses + 2) / (state.weightedEvidence + 4),
    ),
  );
}

export function accuracy(
  state: Pick<MasteryState, "correctAttempts" | "totalAttempts">,
) {
  if (state.totalAttempts <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, state.correctAttempts / state.totalAttempts),
  );
}

export function wilsonLowerBound(successes: number, evidence: number) {
  if (evidence <= 0) return 0;
  const p = Math.min(1, Math.max(0, successes / evidence));
  const z2 = WILSON_Z_80 ** 2;
  return (
    (p + z2 / (2 * evidence) - WILSON_Z_80 * Math.sqrt((p * (1 - p) + z2 / (4 * evidence)) / evidence)) /
    (1 + z2 / evidence)
  );
}

export function masteryTier(rankScore: number | null, uniqueQuestions: number): MasteryTier {
  if (rankScore === null || uniqueQuestions < 5) return "unrated";
  if (rankScore >= 0.85 && uniqueQuestions >= 30) return "master";
  if (rankScore >= 0.7) return "expert";
  if (rankScore >= 0.5) return "proficient";
  return "developing";
}

export function applyMasteryAttempt(state: MasteryState, attempt: MasteryAttempt): MasteryState {
  const repeatWeight = REPEAT_EVIDENCE[Math.max(0, Math.floor(attempt.priorCorrectCount))] ?? 0;
  const evidence = DIFFICULTY_WEIGHTS[attempt.difficulty] * repeatWeight;
  const speedQuality = 0.9 + 0.1 * Math.min(1, Math.max(0, attempt.remainingRatio));
  const baseOutcome = attempt.correct ? (attempt.assisted ? 0.6 : 1) : 0;
  const outcome = baseOutcome * (attempt.correct ? speedQuality : 1);

  return {
    ...state,
    weightedSuccesses: state.weightedSuccesses + evidence * outcome,
    weightedEvidence: state.weightedEvidence + evidence,
    uniqueQuestions: state.uniqueQuestions + (attempt.isUnique ? 1 : 0),
    correctAttempts: state.correctAttempts + (attempt.correct ? 1 : 0),
    totalAttempts: state.totalAttempts + 1,
    assistedCorrectAttempts: state.assistedCorrectAttempts + (attempt.correct && attempt.assisted ? 1 : 0),
  };
}

export function topicMastery(state: MasteryState): TopicMastery {
  const rankScore = state.uniqueQuestions >= 5 ? wilsonLowerBound(state.weightedSuccesses, state.weightedEvidence) : null;
  const rawAccuracy = accuracy(state);
  return {
    topicId: state.topicId,
    proficiency: rawAccuracy,
    rankScore,
    accuracy: rawAccuracy,
    assistedRate: state.correctAttempts ? state.assistedCorrectAttempts / state.correctAttempts : 0,
    weightedSuccesses: state.weightedSuccesses,
    weightedEvidence: state.weightedEvidence,
    uniqueQuestions: state.uniqueQuestions,
    tier: masteryTier(rankScore, state.uniqueQuestions),
  };
}
