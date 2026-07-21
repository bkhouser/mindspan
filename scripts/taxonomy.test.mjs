import { describe, expect, it } from "vitest";
import { loadCatalog } from "./catalog-lib.mjs";
import {
  normalizeQuestionTaxonomy,
  TAXONOMY_AREAS,
} from "./taxonomy.mjs";

describe("normalized question taxonomy", () => {
  it("assigns one stable area while retaining useful fine detail", () => {
    expect(
      normalizeQuestionTaxonomy({
        catalogKey: "test.blue-whale",
        topicSlug: "science-nature",
        subtopics: ["Animals", "Marine Biology", "Mammals"],
        prompt: "What is the largest animal on Earth?",
        canonicalAnswer: "Blue whale",
      }),
    ).toEqual({
      subtopic: "Zoology",
      detailTags: ["Marine Biology", "Mammals"],
    });
  });

  it("removes catch-all labels and classifies from the question itself", () => {
    expect(
      normalizeQuestionTaxonomy({
        catalogKey: "test.capital",
        topicSlug: "geography",
        subtopics: ["General Knowledge"],
        prompt: "What is the capital of Scotland?",
        canonicalAnswer: "Edinburgh",
      }),
    ).toEqual({ subtopic: "Capitals & Cities", detailTags: [] });
  });

  it("normalizes every generated question to one canonical area", () => {
    const { questions } = loadCatalog();
    expect(questions).toHaveLength(1460);
    for (const question of questions) {
      expect(question.subtopics).toHaveLength(1);
      expect(TAXONOMY_AREAS[question.topicSlug]).toContain(
        question.subtopics[0],
      );
      expect(question.detailTags).not.toContain(question.subtopics[0]);
    }
  });
});
