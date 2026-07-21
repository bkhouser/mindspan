import { describe, expect, it } from "vitest";
import {
  answersAreEquivalent,
  isAnswerAccepted,
  normalizeAnswer,
  numberAnswerKey,
} from "../answers";

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

  it("accepts numerical and written forms of the same number", () => {
    expect(isAnswerAccepted("ten", ["10"])).toBe(true);
    expect(isAnswerAccepted("10", ["ten"])).toBe(true);
    expect(isAnswerAccepted("one hundred and one", ["101"])).toBe(true);
    expect(
      isAnswerAccepted("one thousand seven hundred seventy-six", ["1,776"]),
    ).toBe(true);
    expect(isAnswerAccepted("three point one four", ["3.14"])).toBe(true);
    expect(isAnswerAccepted("negative twelve", ["-12"])).toBe(true);
    expect(answersAreEquivalent("ten", "10")).toBe(true);
  });

  it("does not treat number words embedded in phrases as bare numbers", () => {
    expect(numberAnswerKey("One Direction")).toBeNull();
    expect(numberAnswerKey("Apollo 11")).toBeNull();
    expect(numberAnswerKey("one two")).toBeNull();
    expect(isAnswerAccepted("one two", ["3"])).toBe(false);
  });

  it("does not autocorrect a known plausible wrong answer", () => {
    const policy = { rejectedAnswers: ["Proton"] };
    expect(isAnswerAccepted("proton", ["Photon"], policy)).toBe(false);
    expect(isAnswerAccepted("photn", ["Photon"], policy)).toBe(true);
  });
});
