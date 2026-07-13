import { describe, expect, it } from "vitest";
import { remainingScoringRatio, scaleQuestionTimer } from "../timer-rules";

describe("timer rules", () => {
  it("preserves authored question lengths at the default baseline", () => {
    expect(scaleQuestionTimer(30, 30)).toBe(30);
    expect(scaleQuestionTimer(60, 30)).toBe(60);
  });

  it("scales authored question lengths proportionally", () => {
    expect(scaleQuestionTimer(30, 45)).toBe(45);
    expect(scaleQuestionTimer(60, 45)).toBe(90);
    expect(scaleQuestionTimer(15, 20)).toBe(10);
  });

  it("normalizes scoring to its independent clock", () => {
    expect(remainingScoringRatio(15_000, 30)).toBe(0.5);
    expect(remainingScoringRatio(30_000, 30)).toBe(0);
    expect(remainingScoringRatio(45_000, 30)).toBe(0);
  });
});
