import type { Difficulty } from "./types";

export const SCORING_ALGORITHM_VERSION = "mindspan-score-v1";

const BASE_POINTS: Record<Difficulty, number> = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };
const REPEAT_FACTORS = [1, 0.45, 0.2, 0.08] as const;

export interface ScoreInputs {
  difficulty: Difficulty;
  proficiency: number;
  priorCorrectCount: number;
  remainingRatio: number;
  assisted: boolean;
  correct: boolean;
}

export interface ScoreSnapshot extends ScoreInputs {
  algorithmVersion: typeof SCORING_ALGORITHM_VERSION;
  basePoints: number;
  proficiencyFactor: number;
  repeatFactor: number;
  assistanceFactor: number;
  timeFactor: number;
  startingPoints: number;
  earnedPoints: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function repeatFactor(correctCount: number) {
  return REPEAT_FACTORS[Math.max(0, Math.floor(correctCount))] ?? 0;
}

export function scoreAttempt(inputs: ScoreInputs): ScoreSnapshot {
  const proficiency = clamp01(inputs.proficiency);
  const remainingRatio = clamp01(inputs.remainingRatio);
  const basePoints = BASE_POINTS[inputs.difficulty];
  const proficiencyFactor = 1.25 - 0.75 * proficiency;
  const repeat = repeatFactor(inputs.priorCorrectCount);
  const assistanceFactor = inputs.assisted ? 0.5 : 1;
  const timeFactor = 0.25 + 0.75 * remainingRatio;
  const startingPoints = Math.round(basePoints * proficiencyFactor * repeat * assistanceFactor);
  const earnedPoints = inputs.correct ? Math.round(startingPoints * timeFactor) : 0;

  return {
    ...inputs,
    proficiency,
    remainingRatio,
    algorithmVersion: SCORING_ALGORITHM_VERSION,
    basePoints,
    proficiencyFactor,
    repeatFactor: repeat,
    assistanceFactor,
    timeFactor,
    startingPoints,
    earnedPoints,
  };
}
