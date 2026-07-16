import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const root = resolve(import.meta.dirname, "..");
const catalogDirectory = resolve(root, "content", "catalog");
const questionDirectory = resolve(catalogDirectory, "questions");
const enrichmentDirectory = resolve(catalogDirectory, "enrichments");
const revisionDirectory = resolve(catalogDirectory, "revisions");

const exactYearLimits = new Map([
  ["history-starter", 5],
  ["space-and-beyond", 2],
  ["world-turning-points", 3],
]);

const battleLocationLimits = new Map([
  ["history-starter", 3],
  ["world-turning-points", 2],
]);

const questionSchema = z.object({
  catalogKey: z.string().trim().min(3).max(160),
  topicSlug: z.string().trim().min(1),
  packSlugs: z.array(z.string().trim().min(1)).min(1),
  subtopics: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  prompt: z.string().trim().min(5).max(1000),
  answerMode: z.enum(["recall", "required_choice"]),
  canonicalAnswer: z.string().trim().min(1).max(300),
  aliases: z.array(z.string().trim().min(1)),
  distractors: z.array(z.string().trim().min(1)).length(3),
  explanation: z.string().trim().min(10).max(1000),
  details: z.string().trim().min(10).max(4000),
  difficulty: z.number().int().min(1).max(5),
  timeLimitSeconds: z.number().int().min(15).max(90),
  removeLeadingArticles: z.boolean(),
  source: z.object({
    label: z.string().trim().min(1),
    url: z.string().url().startsWith("https://"),
  }),
  expiresAt: z.string().datetime().nullable(),
});

function normalized(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function isExactYearRecall(question) {
  return (
    /^\d{4}$/.test(question.canonicalAnswer.trim()) &&
    /\b(?:what|which) year\b|\bwhen (?:was|did|were)\b/i.test(question.prompt)
  );
}

function isBattleLocationRecall(question) {
  return (
    /\bbattle\b/i.test(question.prompt) && /\bfought\b/i.test(question.prompt)
  );
}

export function loadCatalog() {
  const manifest = JSON.parse(
    readFileSync(resolve(catalogDirectory, "manifest.json"), "utf8"),
  );
  const files = readdirSync(questionDirectory)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const enrichments = new Map();
  for (const file of readdirSync(enrichmentDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    const entries = JSON.parse(
      readFileSync(resolve(enrichmentDirectory, file), "utf8"),
    );
    for (const [catalogKey, copy] of Object.entries(entries)) {
      if (enrichments.has(catalogKey))
        throw new Error(`Duplicate enrichment: ${catalogKey}`);
      enrichments.set(catalogKey, copy);
    }
  }
  const revisions = new Map();
  for (const file of readdirSync(revisionDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    const entries = JSON.parse(
      readFileSync(resolve(revisionDirectory, file), "utf8"),
    );
    for (const [catalogKey, copy] of Object.entries(entries)) {
      if (revisions.has(catalogKey))
        throw new Error(`Duplicate revision: ${catalogKey}`);
      revisions.set(catalogKey, copy);
    }
  }
  const questions = files.flatMap((file) => {
    const parsed = JSON.parse(
      readFileSync(resolve(questionDirectory, file), "utf8"),
    );
    if (!Array.isArray(parsed))
      throw new Error(`${file} must contain an array`);
    return parsed.map((question) => {
      const enrichment = enrichments.get(question.catalogKey) ?? {};
      const revision = revisions.get(question.catalogKey) ?? {};
      const prompt = revision.prompt ?? enrichment.prompt ?? question.prompt;
      return {
        ...question,
        ...enrichment,
        ...revision,
        answerMode:
          revision.answerMode ??
          enrichment.answerMode ??
          question.answerMode ??
          (/which (?:of (?:the following|these)|one of (?:the following|these))/i.test(
            prompt,
          )
            ? "required_choice"
            : "recall"),
        __file: file,
      };
    });
  });

  const issues = [];
  const validQuestions = [];
  for (const raw of questions) {
    const { __file, ...candidate } = raw;
    const parsed = questionSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push(
          `${__file} ${candidate.catalogKey ?? "unknown"}: ${issue.path.join(".")} ${issue.message}`,
        );
      continue;
    }
    const question = parsed.data;
    const accepted = new Set(
      [question.canonicalAnswer, ...question.aliases].map(normalized),
    );
    if (accepted.size !== question.aliases.length + 1)
      issues.push(
        `${__file} ${question.catalogKey}: duplicate normalized accepted answer`,
      );
    const distractors = question.distractors.map(normalized);
    if (new Set(distractors).size !== 3)
      issues.push(`${__file} ${question.catalogKey}: duplicate distractors`);
    if (distractors.some((answer) => accepted.has(answer)))
      issues.push(
        `${__file} ${question.catalogKey}: accepted answer appears as a distractor`,
      );
    const authoredText = [
      question.prompt,
      question.canonicalAnswer,
      ...question.aliases,
      ...question.distractors,
      question.explanation,
      question.details,
    ];
    if (authoredText.some((value) => /(?:^|\s)Q\d+(?:$|\s)/.test(value)))
      issues.push(`${__file} ${question.catalogKey}: unresolved Wikidata id`);
    if (
      authoredText.some((value) => /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value))
    )
      issues.push(`${__file} ${question.catalogKey}: undecoded HTML entity`);
    if (/^The correct answer is\b/i.test(question.explanation))
      issues.push(
        `${__file} ${question.catalogKey}: placeholder answer explanation`,
      );
    if (
      /(?:key fact the prompt is asking for|remember the association in this)/i.test(
        question.details,
      )
    )
      issues.push(
        `${__file} ${question.catalogKey}: placeholder answer details`,
      );
    if (
      question.subtopics.some(
        (subtopic) =>
          subtopic.trim().toLocaleLowerCase("en-US") === "general knowledge",
      )
    )
      issues.push(
        `${__file} ${question.catalogKey}: General Knowledge must be replaced with a specific subtopic`,
      );
    validQuestions.push(question);
  }

  const keys = new Set();
  const prompts = new Set();
  for (const question of validQuestions) {
    if (keys.has(question.catalogKey))
      issues.push(`Duplicate catalog key: ${question.catalogKey}`);
    keys.add(question.catalogKey);
    const promptKey = `${question.topicSlug}|${normalized(question.prompt)}`;
    if (prompts.has(promptKey))
      issues.push(`Duplicate prompt: ${question.prompt}`);
    prompts.add(promptKey);
  }

  for (const pack of manifest.packs) {
    const entries = validQuestions.filter((question) =>
      question.packSlugs.includes(pack.slug),
    );
    const exactYearCount = entries.filter(isExactYearRecall).length;
    const exactYearLimit = exactYearLimits.get(pack.slug) ?? 2;
    if (exactYearCount > exactYearLimit)
      issues.push(
        `${pack.slug}: exact-year recall limit is ${exactYearLimit}, found ${exactYearCount}`,
      );

    const battleLocationCount = entries.filter(isBattleLocationRecall).length;
    const battleLocationLimit = battleLocationLimits.get(pack.slug) ?? 2;
    if (battleLocationCount > battleLocationLimit)
      issues.push(
        `${pack.slug}: battle-location recall limit is ${battleLocationLimit}, found ${battleLocationCount}`,
      );
  }

  const summaries = manifest.packs.map((pack) => {
    const entries = validQuestions.filter((question) =>
      question.packSlugs.includes(pack.slug),
    );
    const difficulty = [1, 2, 3, 4, 5].map(
      (value) =>
        entries.filter((question) => question.difficulty === value).length,
    );
    if (entries.length !== pack.generatedTarget)
      issues.push(
        `${pack.slug}: expected ${pack.generatedTarget} generated questions, found ${entries.length}`,
      );
    if (difficulty.some((count, index) => count !== pack.difficulty[index]))
      issues.push(
        `${pack.slug}: expected difficulty ${pack.difficulty.join("/")}, found ${difficulty.join("/")}`,
      );
    return {
      slug: pack.slug,
      generated: entries.length,
      total: entries.length + pack.existingSeedCount,
      difficulty,
    };
  });

  if (issues.length) throw new Error(issues.join("\n"));
  return { manifest, questions: validQuestions, summaries };
}

export function readLocalEnv(envPath = resolve(root, ".env.local")) {
  const fileValues = existsSync(envPath)
    ? Object.fromEntries(
        readFileSync(envPath, "utf8")
          .split(/\r?\n/)
          .filter((line) => line && !line.startsWith("#"))
          .map((line) => {
            const separator = line.indexOf("=");
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      )
    : {};
  return { ...fileValues, ...process.env };
}
