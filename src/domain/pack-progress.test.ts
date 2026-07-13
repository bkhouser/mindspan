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
        { question_id: "question-1", attempt_count: 4, correct_count: 2 },
        { question_id: "question-2", attempt_count: 3, correct_count: 0 },
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
      [{ question_id: "shared", attempt_count: 1, correct_count: 1 }],
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
