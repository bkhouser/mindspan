import { describe, expect, it } from "vitest";
import { difficultyDistribution, nextReviewAt, recurrenceWeight, shouldUseNovelPool, targetDifficulty } from "../scheduling";

describe("question scheduling", () => {
  it("targets difficulty from proficiency", () => {
    expect(targetDifficulty(0)).toBe(1);
    expect(targetDifficulty(0.5)).toBe(3);
    expect(targetDifficulty(1)).toBe(5);
  });

  it("preserves a full probability distribution at the boundaries", () => {
    expect([...difficultyDistribution(1).values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect([...difficultyDistribution(5).values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("substantially reduces recurrence after every correct answer", () => {
    expect(recurrenceWeight(2, true)).toBeCloseTo(0.04);
    expect(recurrenceWeight(0, false)).toBe(1);
  });

  it("prefers novel questions three quarters of the time", () => {
    const selected = Array.from({ length: 100 }, (_, i) => shouldUseNovelPool(i / 100, true, true)).filter(Boolean);
    expect(selected).toHaveLength(75);
  });

  it("schedules the first correct review seven days later", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(nextReviewAt(0, true, from).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});
