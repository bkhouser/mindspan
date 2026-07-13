import { describe, expect, it } from "vitest";
import { applyMasteryAttempt, proficiency, topicMastery, wilsonLowerBound, type MasteryState } from "../mastery";

const initial: MasteryState = { topicId: "science", weightedSuccesses: 0, weightedEvidence: 0, uniqueQuestions: 0, correctAttempts: 0, totalAttempts: 0, assistedCorrectAttempts: 0 };

describe("mastery", () => {
  it("starts at a neutral proficiency", () => expect(proficiency(initial)).toBe(0.5));

  it("never displays proficiency outside zero to one", () => {
    expect(
      proficiency({ weightedSuccesses: 12, weightedEvidence: 2 }),
    ).toBe(1);
    expect(
      proficiency({ weightedSuccesses: -12, weightedEvidence: 2 }),
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
