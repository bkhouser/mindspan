import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeHTML } from "entities";

const outputDirectory = resolve(
  import.meta.dirname,
  "..",
  "content",
  "catalog",
  "questions",
);
const dumpCachePath = resolve(
  import.meta.dirname,
  "..",
  "content",
  "catalog",
  "cache",
  "opentdb-2024-12-27.json",
);

const categoryMeta = {
  10: { topic: "arts-literature", subtopic: "Literature" },
  11: { topic: "film-television", subtopic: "Film" },
  12: { topic: "music", subtopic: "Popular Music" },
  13: { topic: "arts-literature", subtopic: "Musical Theatre" },
  14: { topic: "film-television", subtopic: "Television" },
  17: { topic: "science-nature", subtopic: "Science" },
  20: { topic: "lifestyle-culture", subtopic: "Mythology" },
  21: { topic: "sports", subtopic: "Sports" },
  22: { topic: "geography", subtopic: "World Geography" },
  23: { topic: "history", subtopic: "World History" },
  25: { topic: "arts-literature", subtopic: "Visual Art" },
  27: { topic: "lifestyle-culture", subtopic: "Animals" },
  28: { topic: "lifestyle-culture", subtopic: "Transportation" },
};

const packs = [
  {
    slug: "arts-literature-starter",
    difficulty: [14, 19, 29, 19, 14],
    sources: [
      [25, null, 25],
      [10, null, 45],
      [13, null, 25],
    ],
  },
  {
    slug: "film-television-starter",
    difficulty: [14, 19, 29, 19, 14],
    sources: [
      [11, null, 55],
      [14, null, 40],
    ],
  },
  {
    slug: "music-starter",
    difficulty: [14, 19, 29, 19, 14],
    sources: [[12, null, 95]],
  },
  {
    slug: "lifestyle-culture-starter",
    difficulty: [14, 19, 29, 19, 14],
    sources: [
      [20, null, 35],
      [27, null, 35],
      [28, null, 25],
    ],
  },
  {
    slug: "masterworks",
    difficulty: [5, 10, 20, 10, 5],
    sources: [
      [10, null, 31],
      [12, null, 19],
    ],
  },
  {
    slug: "sound-and-song",
    difficulty: [5, 10, 20, 10, 5],
    sources: [[12, null, 50]],
  },
  {
    slug: "easy-does-it",
    difficulty: [25, 15, 10, 0, 0],
    sources: [10, 17, 22, 23, 21, 20, 11, 12, 14, 27].map((category) => [
      category,
      "easy",
      5,
    ]),
  },
  {
    slug: "trivia-101",
    difficulty: [20, 18, 10, 2, 0],
    sources: [10, 17, 22, 23, 21, 28, 11, 12, 14, 25].flatMap((category) => [
      [category, "easy", 4],
      [category, "medium", 1],
    ]),
  },
];

const numberWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

function decodeEntities(value) {
  const decoded = decodeHTML(value);
  // Decode any uncommon named entities left by older snapshots.
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };
  return decoded
    .replaceAll(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "");
}

function isLowValueRecall(prompt, answer) {
  const exactYear =
    /^\d{4}$/.test(answer.trim()) &&
    /\b(?:what|which) year\b|\bwhen (?:was|did|were)\b/i.test(prompt);
  const battleLocation =
    /\bbattle\b/i.test(prompt) && /\bfought\b/i.test(prompt);
  return exactYear || battleLocation;
}

function aliases(answer) {
  const result = [];
  if (/^\d+$/.test(answer)) {
    const value = Number(answer);
    if (value >= 0 && value <= 20) result.push(numberWords[value]);
  }
  const ascii = answer.normalize("NFKD").replaceAll(/[\u0300-\u036f]/g, "");
  if (ascii !== answer) result.push(ascii);
  return [...new Set(result)];
}

function difficultySequence(distribution) {
  return distribution.flatMap((count, index) =>
    Array.from({ length: count }, () => index + 1),
  );
}

const seenPrompts = new Set();
const generatedPackFiles = new Set(packs.map((pack) => `${pack.slug}.json`));
for (const file of readdirSync(outputDirectory).filter(
  (name) => name.endsWith(".json") && !generatedPackFiles.has(name),
)) {
  for (const question of JSON.parse(
    readFileSync(resolve(outputDirectory, file), "utf8"),
  ))
    seenPrompts.add(normalize(question.prompt));
}

const categoryNames = {
  9: "General Knowledge",
  10: "Entertainment: Books",
  11: "Entertainment: Film",
  12: "Entertainment: Music",
  13: "Entertainment: Musicals & Theatres",
  14: "Entertainment: Television",
  17: "Science & Nature",
  20: "Mythology",
  21: "Sports",
  22: "Geography",
  23: "History",
  25: "Art",
  27: "Animals",
  28: "Vehicles",
};

async function fetchDump(retry = 0) {
  if (existsSync(dumpCachePath))
    return JSON.parse(readFileSync(dumpCachePath, "utf8"));
  try {
    const response = await fetch(
      "https://gist.githubusercontent.com/jbaranski/a3c10856b750441663eec71739d49e43/raw/66aff001f2235db47b274215f285872e5e8d512f/db.json",
      {
        headers: { "user-agent": "MindspanCatalog/0.1 (private trivia beta)" },
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!response.ok) throw new Error(`bulk dump returned ${response.status}`);
    return response.json();
  } catch (error) {
    if (retry >= 4) throw error;
    await new Promise((resolvePromise) =>
      setTimeout(resolvePromise, (retry + 1) * 2_000),
    );
    return fetchDump(retry + 1);
  }
}

const dump = (await fetchDump())
  .map((raw) => ({
    ...raw,
    decodedCategory: decodeEntities(raw.category),
    sortKey: createHash("sha256").update(raw.question).digest("hex"),
  }))
  .sort((left, right) => left.sortKey.localeCompare(right.sortKey));

async function fetchQuestions(category, difficulty, count) {
  const accepted = [];
  const candidates = dump.filter(
    (raw) =>
      raw.type === "multiple" &&
      raw.decodedCategory === categoryNames[category] &&
      (!difficulty || raw.difficulty === difficulty),
  );
  for (const raw of candidates) {
    const prompt = decodeEntities(raw.question).trim();
    const canonicalAnswer = decodeEntities(raw.correct_answer).trim();
    const distractors = raw.incorrect_answers.map((answer) =>
      decodeEntities(answer).trim(),
    );
    if (
      seenPrompts.has(normalize(prompt)) ||
      isLowValueRecall(prompt, canonicalAnswer) ||
      distractors.length !== 3 ||
      new Set(distractors.map(normalize)).size !== 3 ||
      distractors.some(
        (distractor) => normalize(distractor) === normalize(canonicalAnswer),
      )
    )
      continue;
    seenPrompts.add(normalize(prompt));
    accepted.push({
      prompt,
      canonicalAnswer,
      distractors,
      apiDifficulty: raw.difficulty,
      apiCategory: decodeEntities(raw.category),
    });
    if (accepted.length === count) break;
  }
  if (accepted.length !== count)
    throw new Error(
      `Bulk dump has ${accepted.length}/${count} unused questions for ${category}/${difficulty ?? "any"}`,
    );
  return accepted;
}

for (const pack of packs) {
  const rawQuestions = [];
  for (const [category, difficulty, count] of pack.sources) {
    process.stdout.write(
      `Fetching ${pack.slug}/${category}/${difficulty} (${count})... `,
    );
    const results = await fetchQuestions(category, difficulty, count);
    rawQuestions.push(...results.map((result) => ({ ...result, category })));
    console.log(results.length);
  }

  const order = { easy: 0, medium: 1, hard: 2 };
  rawQuestions.sort(
    (a, b) =>
      order[a.apiDifficulty] - order[b.apiDifficulty] ||
      a.prompt.localeCompare(b.prompt),
  );
  const difficulties = difficultySequence(pack.difficulty);
  if (rawQuestions.length !== difficulties.length)
    throw new Error(`${pack.slug}: count mismatch`);

  const questions = rawQuestions.map((raw, index) => {
    const meta = categoryMeta[raw.category];
    const key = createHash("sha1")
      .update(`${raw.prompt}|${raw.canonicalAnswer}`)
      .digest("hex")
      .slice(0, 16);
    return {
      catalogKey: `${pack.slug}.opentdb.${key}`,
      topicSlug: meta.topic,
      packSlugs: [pack.slug],
      subtopics: [meta.subtopic],
      prompt: raw.prompt,
      canonicalAnswer: raw.canonicalAnswer,
      aliases: aliases(raw.canonicalAnswer),
      distractors: raw.distractors,
      explanation: `The correct answer is ${raw.canonicalAnswer}.`,
      details: `Remember the association in this ${raw.apiCategory} question: ${raw.canonicalAnswer} is the key fact the prompt is asking for.`,
      difficulty: difficulties[index],
      timeLimitSeconds: raw.canonicalAnswer.length > 28 ? 45 : 30,
      removeLeadingArticles: true,
      source: {
        label: "Open Trivia Database",
        url: "https://opentdb.com/",
      },
      expiresAt: null,
    };
  });

  writeFileSync(
    resolve(outputDirectory, `${pack.slug}.json`),
    `${JSON.stringify(questions, null, 2)}\n`,
  );
  console.log(`Wrote ${pack.slug}: ${questions.length}`);
}
