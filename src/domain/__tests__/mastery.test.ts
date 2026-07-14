import { describe, expect, it } from "vitest";
import { accuracy, applyMasteryAttempt, skillEstimate, topicMastery, wilsonLowerBound, type MasteryState } from "../mastery";

const initial: MasteryState = { topicId: "science", weightedSuccesses: 0, weightedEvidence: 0, uniqueQuestions: 0, correctAttempts: 0, totalAttempts: 0, assistedCorrectAttempts: 0 };

describe("mastery", () => {
  it("starts displayed proficiency at zero", () => {
    expect(accuracy(initial)).toBe(0);
    expect(topicMastery(initial).proficiency).toBe(0);
  });

  it("displays the literal correct-answer percentage", () => {
    const state = { ...initial, correctAttempts: 1, totalAttempts: 2 };
    expect(accuracy(state)).toBe(0.5);
    expect(topicMastery(state).proficiency).toBe(0.5);
  });

  it("keeps a neutral estimate for internal game adaptation", () => {
    expect(skillEstimate(initial)).toBe(0.5);
  });

  it("never displays proficiency outside zero to one", () => {
    expect(
      skillEstimate({ weightedSuccesses: 12, weightedEvidence: 2 }),
    ).toBe(1);
    expect(
      skillEstimate({ weightedSuccesses: -12, weightedEvidence: 2 }),
    ).toBe(0);
  });

  it("weights unassisted evidence more strongly than assisted evidence", () => {
    const full = applyMasteryAttempt(initial, { difficulty: 3, priorCorrectCount: 0, correct: true, assisted: false, remainingRatio: 1, isUnique: true });
    const assisted = applyMasteryAttempt(initial, { difficulty: 3, priorCorrectCount: 0, correct: true, assisted: true, remainingRatio: 1, isUnique: true });
    expect(full.weightedSuccesses).toBeGreaterThan(assisted.weightedSuccesses);
  });

  it("ranks sustained 80% performance above a tiny perfect sample", () => {
    expect(wilsonLowerBound(80, 100)).toBeGreaterThan(wilsonLowerBound(3, 3));
  });

  it("keeps users unranked before five unique questions", () => {
    const state = { ...initial, weightedSuccesses: 4, weightedEvidence: 4, uniqueQuestions: 4, correctAttempts: 4, totalAttempts: 4 };
    expect(topicMastery(state).rankScore).toBeNull();
  });
});
