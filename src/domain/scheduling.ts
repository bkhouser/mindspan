import type { Difficulty } from "./types";

const REVIEW_DAYS = [7, 30, 90, 180] as const;

export function targetDifficulty(proficiency: number): Difficulty {
  return Math.min(5, Math.max(1, Math.round(1 + 4 * Math.min(1, Math.max(0, proficiency))))) as Difficulty;
}

export function difficultyDistribution(target: Difficulty) {
  const result = new Map<Difficulty, number>();
  const add = (difficulty: Difficulty, probability: number) => result.set(difficulty, (result.get(difficulty) ?? 0) + probability);
  add(target, 0.6);
  add(Math.max(1, target - 1) as Difficulty, 0.2);
  add(Math.min(5, target + 1) as Difficulty, 0.2);
  return result;
}

export function nextReviewAt(correctCount: number, correct: boolean, from = new Date()) {
  if (!correct) return from;
  const index = Math.min(REVIEW_DAYS.length - 1, Math.max(0, correctCount));
  return new Date(from.getTime() + REVIEW_DAYS[index] * 86_400_000);
}

export function recurrenceWeight(correctCount: number, lastAttemptCorrect: boolean) {
  if (!lastAttemptCorrect) return 1;
  return 0.2 ** Math.max(1, correctCount);
}

export function shouldUseNovelPool(randomValue: number, novelAvailable: boolean, reviewAvailable: boolean) {
  if (!reviewAvailable) return true;
  if (!novelAvailable) return false;
  return randomValue < 0.75;
}
