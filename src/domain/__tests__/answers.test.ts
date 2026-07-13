import { describe, expect, it } from "vitest";
import { isAnswerAccepted, normalizeAnswer } from "../answers";

describe("answer matching", () => {
  it("normalizes punctuation, case, and optional articles", () => {
    expect(
      normalizeAnswer("  The Lord’s  Rings! ", { removeLeadingArticles: true }),
    ).toBe("lords rings");
  });

  it("accepts authored aliases and conservative typos", () => {
    expect(isAnswerAccepted("Einsten", ["Albert Einstein", "Einstein"])).toBe(
      true,
    );
    expect(
      isAnswerAccepted("Shakespear", ["William Shakespeare", "Shakespeare"]),
    ).toBe(true);
    expect(isAnswerAccepted("Antartica", ["Antarctica", "Antarctica"])).toBe(
      true,
    );
  });

  it("does not fuzz numeric or short answers", () => {
    expect(isAnswerAccepted("1946", ["1945"])).toBe(false);
    expect(isAnswerAccepted("Marz", ["Mars"])).toBe(false);
  });

  it("does not autocorrect a known plausible wrong answer", () => {
    const policy = { rejectedAnswers: ["Proton"] };
    expect(isAnswerAccepted("proton", ["Photon"], policy)).toBe(false);
    expect(isAnswerAccepted("photn", ["Photon"], policy)).toBe(true);
  });
});
