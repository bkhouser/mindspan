import { describe, expect, it } from "vitest";
import { canReviewQuestions } from "@/domain/authorization";

describe("question review authorization", () => {
  it("allows question reviewers and system administrators", () => {
    expect(canReviewQuestions("question_reviewer")).toBe(true);
    expect(canReviewQuestions("sys_admin")).toBe(true);
  });

  it("does not grant review access to normal users", () => {
    expect(canReviewQuestions("user")).toBe(false);
  });
});
