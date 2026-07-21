import { describe, expect, it } from "vitest";
import { isQuestionQualityActionable } from "@/domain/question-quality";

describe("question quality action exports", () => {
  it.each(["needs_revision", "rejected"])(
    "includes the %s editorial verdict",
    (verdict) => {
      expect(isQuestionQualityActionable(verdict, false)).toBe(true);
    },
  );

  it("includes unresolved player feedback regardless of verdict", () => {
    expect(isQuestionQualityActionable("approved", true)).toBe(true);
    expect(isQuestionQualityActionable(null, true)).toBe(true);
  });

  it("omits reviewed questions with no outstanding action", () => {
    expect(isQuestionQualityActionable("approved", false)).toBe(false);
    expect(isQuestionQualityActionable(null, false)).toBe(false);
  });
});
