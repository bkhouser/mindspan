import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scoreAttempt } from "../scoring";
import type { Difficulty } from "../types";

describe("scoreAttempt", () => {
  it("matches the published example factors", () => {
    const score = scoreAttempt({ difficulty: 3, proficiency: 0.5, priorCorrectCount: 0, remainingRatio: 1, assisted: false, correct: true });
    expect(score.startingPoints).toBe(263);
    expect(score.earnedPoints).toBe(263);
  });

  it("retires competitive value after four correct recalls", () => {
    expect(scoreAttempt({ difficulty: 5, proficiency: 0, priorCorrectCount: 4, remainingRatio: 1, assisted: false, correct: true }).earnedPoints).toBe(0);
  });

  it("never returns negative points", () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 5 }), fc.double({ min: -2, max: 3, noNaN: true }), fc.integer({ min: 0, max: 20 }), fc.double({ min: -2, max: 3, noNaN: true }), fc.boolean(), fc.boolean(),
      (difficulty, proficiency, repeats, time, assisted, correct) => {
        const result = scoreAttempt({ difficulty: difficulty as Difficulty, proficiency, priorCorrectCount: repeats, remainingRatio: time, assisted, correct });
        expect(result.earnedPoints).toBeGreaterThanOrEqual(0);
      },
    ));
  });

  it("cannot increase as proficiency, repeats, assistance, or elapsed time increases", () => {
    const base = { difficulty: 4 as Difficulty, proficiency: 0.2, priorCorrectCount: 0, remainingRatio: 0.9, assisted: false, correct: true };
    const original = scoreAttempt(base).earnedPoints;
    expect(scoreAttempt({ ...base, proficiency: 0.8 }).earnedPoints).toBeLessThanOrEqual(original);
    expect(scoreAttempt({ ...base, priorCorrectCount: 1 }).earnedPoints).toBeLessThanOrEqual(original);
    expect(scoreAttempt({ ...base, assisted: true }).earnedPoints).toBeLessThanOrEqual(original);
    expect(scoreAttempt({ ...base, remainingRatio: 0.2 }).earnedPoints).toBeLessThanOrEqual(original);
  });
});
