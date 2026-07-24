import { describe, expect, it } from "vitest";
import {
  calculatePackAverageDifficulty,
  calculatePackProgress,
} from "./pack-progress";

describe("calculatePackProgress", () => {
  it("counts unique questions rather than repeat attempts", () => {
    const progress = calculatePackProgress(
      [
        { pack_id: "pack-1", question_id: "question-1" },
        { pack_id: "pack-1", question_id: "question-2" },
        { pack_id: "pack-1", question_id: "question-2" },
        { pack_id: "pack-1", question_id: "question-3" },
      ],
      [
        { question_id: "question-1", correct: false, created_at: "2026-07-01" },
        { question_id: "question-1", correct: true, created_at: "2026-07-02" },
        { question_id: "question-1", correct: true, created_at: "2026-07-03" },
        { question_id: "question-2", correct: false, created_at: "2026-07-04" },
      ],
    );

    expect(progress.get("pack-1")).toEqual({
      total: 3,
      answered: 2,
      correct: 1,
    });
  });

  it("credits a question in every pack containing it", () => {
    const progress = calculatePackProgress(
      [
        { pack_id: "pack-1", question_id: "shared" },
        { pack_id: "pack-2", question_id: "shared" },
      ],
      [{ question_id: "shared", correct: true, created_at: "2026-07-01" }],
    );

    expect(progress.get("pack-1")).toEqual({
      total: 1,
      answered: 1,
      correct: 1,
    });
    expect(progress.get("pack-2")).toEqual({
      total: 1,
      answered: 1,
      correct: 1,
    });
  });

  it("does not carry answers from before a pack was unlocked into its progress", () => {
    const progress = calculatePackProgress(
      [{ pack_id: "trivia-101", question_id: "moved-question" }],
      [
        {
          question_id: "moved-question",
          correct: true,
          created_at: "2026-07-15T12:00:00Z",
        },
      ],
      [
        {
          pack_id: "trivia-101",
          unlocked_at: "2026-07-21T12:00:00Z",
        },
      ],
    );

    expect(progress.get("trivia-101")).toEqual({
      total: 1,
      answered: 0,
      correct: 0,
    });
  });

  it("counts answers submitted after the pack was unlocked", () => {
    const progress = calculatePackProgress(
      [{ pack_id: "trivia-101", question_id: "question-1" }],
      [
        {
          question_id: "question-1",
          correct: false,
          created_at: "2026-07-22T12:00:00Z",
        },
        {
          question_id: "question-1",
          correct: true,
          created_at: "2026-07-23T12:00:00Z",
        },
      ],
      [
        {
          pack_id: "trivia-101",
          unlocked_at: "2026-07-21T12:00:00Z",
        },
      ],
    );

    expect(progress.get("trivia-101")).toEqual({
      total: 1,
      answered: 1,
      correct: 1,
    });
  });
});

describe("calculatePackAverageDifficulty", () => {
  it("averages each distinct playable question in a pack", () => {
    const averages = calculatePackAverageDifficulty(
      [
        { pack_id: "pack-1", question_id: "easy" },
        { pack_id: "pack-1", question_id: "hard" },
        { pack_id: "pack-1", question_id: "hard" },
        { pack_id: "pack-1", question_id: "unpublished" },
      ],
      [
        { question_id: "easy", difficulty: 1 },
        { question_id: "hard", difficulty: 5 },
      ],
    );

    expect(averages.get("pack-1")).toBe(3);
  });
});
