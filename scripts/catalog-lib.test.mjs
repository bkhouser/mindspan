import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCatalog,
  loadEditorialApprovals,
  loadPersonSurnameAliases,
  readLocalEnv,
} from "./catalog-lib.mjs";

describe("readLocalEnv", () => {
  it("uses process environment values when .env.local is absent", () => {
    const missingEnvFile = resolve(
      import.meta.dirname,
      "definitely-missing.env.local",
    );
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production.example.test";

    try {
      expect(readLocalEnv(missingEnvFile).NEXT_PUBLIC_SUPABASE_URL).toBe(
        "https://production.example.test",
      );
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });
});

describe("loadEditorialApprovals", () => {
  it("deduplicates and sorts portable content approvals", () => {
    const directory = mkdtempSync(join(tmpdir(), "mindspan-approvals-"));
    const path = join(directory, "approvals.json");
    writeFileSync(
      path,
      JSON.stringify({
        schemaVersion: 1,
        approvals: {
          "question.two": ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
          "question.one": [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ],
        },
      }),
    );

    try {
      expect(loadEditorialApprovals(path)).toEqual([
        {
          editorialKey: "question.one",
          contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          editorialKey: "question.two",
          contentHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("replacement identities", () => {
  it("publishes full replacements under distinct durable catalog keys", () => {
    const replacements = loadCatalog().questions.filter(
      (question) => question.replacesCatalogKey,
    );
    expect(replacements).toHaveLength(300);
    expect(
      new Set(replacements.map((question) => question.catalogKey)).size,
    ).toBe(replacements.length);
    expect(
      replacements.every(
        (question) => question.catalogKey !== question.replacesCatalogKey,
      ),
    ).toBe(true);
  });

  it("applies completed-review amendments after earlier replacements", () => {
    const questions = new Map(
      loadCatalog().questions.map((question) => [question.catalogKey, question]),
    );
    const agulhas = questions.get(
      "geography-starter.replacement.20260718.agulhas",
    );
    expect(agulhas?.difficulty).toBe(2);
    expect(agulhas?.replacesCatalogKey).toBe(
      "geography-starter.mountain-country.huetstock",
    );

    const screamingLambs = questions.get(
      "arts-literature-starter.replacement.20260721.screaming-lambs",
    );
    expect(screamingLambs?.difficulty).toBe(2);

    expect(
      questions.get("lifestyle-culture-starter.opentdb.7706d5be21915542")
        ?.aliases,
    ).toContain("Miles");
    expect(
      questions.get("science-nature-starter.element-number.unquadoctium")
        ?.aliases,
    ).toEqual(["Avogadro constant", "Avogadro's constant"]);
    expect(
      questions.get("film-television-starter.opentdb.541573dc75788504")
        ?.answerMode,
    ).toBe("required_choice");
    expect(
      questions.get("arts-literature-starter.opentdb.7c3fbc243fd62cfe")
        ?.prompt,
    ).toBe("Which Scottish-born author created Sherlock Holmes?");

    const fluxCapacitor = questions.get(
      "trivia-101.replacement.20260721.flux-capacitor",
    );
    expect(fluxCapacitor?.canonicalAnswer).toBe("Flux capacitor");
    expect(fluxCapacitor?.replacesCatalogKey).toBe(
      "trivia-101.opentdb.7a5aaa8e5d0de34b",
    );

    expect(
      questions.get("trivia-101.replacement.20260721.force-awakens-rey")
        ?.difficulty,
    ).toBe(3);

    const reviewReplacements = [...questions.values()].filter((question) =>
      question.catalogKey.includes(".replacement.20260721."),
    );
    expect(reviewReplacements).toHaveLength(24);

    const rejectedReplacements = [
      "film-television-starter.replacement.20260721.storyboard",
      "history-starter.replacement.20260721.domesday-book",
      "lifestyle-culture-starter.replacement.20260721.spf",
      "lifestyle-culture-starter.replacement.20260721.qr-meaning",
      "lifestyle-culture-starter.replacement.20260721.rsvp",
      "lifestyle-culture-starter.replacement.20260721.hanami",
      "lifestyle-culture-starter.replacement.20260721.knit-purl",
      "lifestyle-culture-starter.replacement.20260721.laundry-drying-symbol",
      "science-nature-starter.replacement.20260721.mycology",
      "sports-starter.replacement.20260721.photo-finish-torso",
      "trivia-101.replacement.20260721.radarange",
    ];
    expect(
      rejectedReplacements.every((catalogKey) => questions.has(catalogKey)),
    ).toBe(true);
    for (const catalogKey of [
      "film-television-starter.opentdb.bc99ad379015885f",
      "history-starter.battle-location.marco-polo-bridge-incident",
      "lifestyle-culture-starter.opentdb.c3ae348a24629dd4",
      "lifestyle-culture-starter.replacement.20260721.playstation-3",
      "lifestyle-culture-starter.opentdb.397d5ff6d9f9e55b",
      "lifestyle-culture-starter.opentdb.89a5edbf8b556f33",
      "lifestyle-culture-starter.opentdb.01404181100db0d7",
      "lifestyle-culture-starter.opentdb.5ea4d8ee5f5e8268",
      "science-nature-starter.replacement.20260720.euler-polyhedron",
      "sports-starter.replacement.20260720.race-walking-contact",
      "trivia-101.opentdb.f6db4ba256b6052f",
    ])
      expect(questions.has(catalogKey), catalogKey).toBe(false);

    const waterPolo = questions.get(
      "sports-starter.team-venue.cn-atletic-barceloneta",
    );
    expect(waterPolo?.canonicalAnswer).toBe("7");
    expect(waterPolo?.distractors).toEqual(["6", "8", "9"]);

    const basketballRim = questions.get(
      "sports-starter.team-venue.amatori-lodi",
    );
    expect(basketballRim?.canonicalAnswer).toBe("10 feet");
    expect(basketballRim?.aliases).toContain("3.05 meters");

    expect(
      questions.get("lifestyle-culture-starter.opentdb.509505171a7e569c")
        ?.answerMode,
    ).toBe("recall");
    expect(
      questions.get("lifestyle-culture-starter.opentdb.27c0def3f0e90018")
        ?.aliases,
    ).not.toContain("High fashion");
  });
});

describe("catalog aliases", () => {
  it("omits aliases equivalent after leading-article normalization", () => {
    const questions = loadCatalog().questions;
    const normalize = (value) =>
      value
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(?:a|an|the)\s+/i, "");

    for (const question of questions) {
      const accepted = [question.canonicalAnswer, ...question.aliases].map(
        normalize,
      );
      expect(new Set(accepted).size, question.catalogKey).toBe(
        accepted.length,
      );
    }
  });

  it("applies the curated surname aliases for person answers", () => {
    const questions = new Map(
      loadCatalog().questions.map((question) => [
        question.catalogKey,
        question,
      ]),
    );
    const surnameAliases = loadPersonSurnameAliases();
    expect(surnameAliases.size).toBeGreaterThan(0);
    for (const [catalogKey, surname] of surnameAliases)
      expect(questions.get(catalogKey)?.aliases, catalogKey).toContain(surname);
  });
});

describe("catalog variety limits", () => {
  it("keeps season-count recall rare and separated across packs", () => {
    const seasonCountQuestions = loadCatalog().questions.filter((question) =>
      /\b(?:how many|number of) seasons\b|\bran for how many seasons\b/i.test(
        question.prompt,
      ),
    );
    expect(seasonCountQuestions.length).toBeLessThanOrEqual(3);
    const byPack = new Map();
    for (const question of seasonCountQuestions)
      for (const pack of question.packSlugs)
        byPack.set(pack, (byPack.get(pack) ?? 0) + 1);
    expect([...byPack.values()].every((count) => count <= 1)).toBe(true);
  });

  it("keeps the Science & Nature Starter pack broad rather than dominated by lookup templates", () => {
    const questions = loadCatalog().questions.filter((question) =>
      question.packSlugs.includes("science-nature-starter"),
    );
    const counts = new Map();
    for (const question of questions)
      counts.set(question.subtopics[0], (counts.get(question.subtopics[0]) ?? 0) + 1);

    expect(questions).toHaveLength(95);
    expect(counts.size).toBeGreaterThanOrEqual(14);
    expect(counts.get("Chemistry") ?? 0).toBeLessThanOrEqual(20);
    expect(counts.get("Astronomy & Space") ?? 0).toBeLessThanOrEqual(15);
    expect(
      questions.filter((question) =>
        /Which astronomical body does|Which scientific field is most closely associated|Which medical specialty most directly treats/i.test(
          question.prompt,
        ),
      ).length,
    ).toBeLessThanOrEqual(2);
  });

  it("keeps the Science & Nature Starter quality-pass replacements explanatory and sourced", () => {
    const replacements = loadCatalog().questions.filter((question) =>
      question.catalogKey.startsWith("science-nature-starter.replacement.20260720."),
    );

    expect(replacements).toHaveLength(37);
    for (const question of replacements) {
      expect(question.explanation.length, question.catalogKey).toBeGreaterThanOrEqual(45);
      expect(question.details.length, question.catalogKey).toBeGreaterThanOrEqual(140);
      expect(question.source.label, question.catalogKey).not.toBe("Wikidata");
    }
  });

  it("keeps the Music Starter pack broad rather than dominated by song and album lookups", () => {
    const questions = loadCatalog().questions.filter((question) =>
      question.packSlugs.includes("music-starter"),
    );
    const counts = new Map();
    for (const question of questions)
      counts.set(question.subtopics[0], (counts.get(question.subtopics[0]) ?? 0) + 1);

    expect(questions).toHaveLength(95);
    expect(counts.size).toBeGreaterThanOrEqual(12);
    expect(counts.get("Albums, Songs & Recording History") ?? 0).toBeLessThanOrEqual(25);
    for (const subtopic of [
      "Classical Music",
      "Jazz",
      "World Music",
      "Music Theory & Terminology",
      "Instruments",
    ])
      expect(counts.get(subtopic) ?? 0, subtopic).toBeGreaterThanOrEqual(5);
  });

  it("keeps the Music Starter quality-pass replacements explanatory and sourced", () => {
    const replacements = loadCatalog().questions.filter((question) =>
      question.catalogKey.startsWith("music-starter.replacement.20260720."),
    );

    expect(replacements).toHaveLength(52);
    for (const question of replacements) {
      expect(question.explanation.length, question.catalogKey).toBeGreaterThanOrEqual(45);
      expect(question.details.length, question.catalogKey).toBeGreaterThanOrEqual(140);
      expect(question.source.label, question.catalogKey).not.toBe("Open Trivia Database");
    }
  });

  it("keeps the Sports Starter pack broad rather than dominated by lookup templates", () => {
    const questions = loadCatalog().questions.filter((question) =>
      question.packSlugs.includes("sports-starter"),
    );
    const counts = new Map();
    for (const question of questions)
      counts.set(question.subtopics[0], (counts.get(question.subtopics[0]) ?? 0) + 1);

    expect(questions).toHaveLength(95);
    expect(counts.size).toBeGreaterThanOrEqual(15);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(10);
    expect(
      questions.filter((question) =>
        /Which sport does|Which sport is contested|Which country did|What is the home venue/i.test(
          question.prompt,
        ),
      ).length,
    ).toBeLessThanOrEqual(3);
  });

  it("keeps the Sports Starter quality-pass replacements explanatory and sourced", () => {
    const replacements = loadCatalog().questions.filter((question) =>
      question.catalogKey.startsWith("sports-starter.replacement.20260720."),
    );

    expect(replacements).toHaveLength(80);
    for (const question of replacements) {
      expect(question.explanation.length, question.catalogKey).toBeGreaterThanOrEqual(45);
      expect(question.details.length, question.catalogKey).toBeGreaterThanOrEqual(140);
      expect(question.source.label, question.catalogKey).not.toBe("Wikidata");
    }
  });
});

describe("American sports terminology", () => {
  it("uses soccer and football in player-facing sports copy", () => {
    const sportsQuestions = loadCatalog().questions.filter(
      (question) => question.topicSlug === "sports",
    );
    const visibleCopy = sportsQuestions.flatMap((question) => [
      question.prompt,
      question.canonicalAnswer,
      ...question.distractors,
      question.explanation,
      question.details.replaceAll("Alliance of American Football", ""),
    ]);
    expect(
      visibleCopy.some((value) => /\bassociation football\b/i.test(value)),
    ).toBe(false);
    expect(
      visibleCopy.some((value) => /\bAmerican football\b/i.test(value)),
    ).toBe(false);
    expect(sportsQuestions.some((question) => question.subtopics[0] === "Soccer"))
      .toBe(true);
    expect(
      sportsQuestions.some((question) => question.subtopics[0] === "Football"),
    ).toBe(true);
  });
});
