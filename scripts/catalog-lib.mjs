import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  normalizeQuestionTaxonomy,
  TAXONOMY_AREAS,
} from "./taxonomy.mjs";

const root = resolve(import.meta.dirname, "..");
const catalogDirectory = resolve(root, "content", "catalog");
const questionDirectory = resolve(catalogDirectory, "questions");
const enrichmentDirectory = resolve(catalogDirectory, "enrichments");
const revisionDirectory = resolve(catalogDirectory, "revisions");
const amendmentDirectory = resolve(catalogDirectory, "amendments");
const personSurnameAliasPath = resolve(
  catalogDirectory,
  "person-surname-aliases.json",
);
const editorialApprovalPath = resolve(
  catalogDirectory,
  "editorial-approvals.json",
);

const exactYearLimits = new Map([
  ["history-starter", 5],
  ["space-and-beyond", 2],
  ["world-turning-points", 3],
]);

const battleLocationLimits = new Map([
  ["history-starter", 3],
  ["world-turning-points", 2],
]);

const varietyGuardedPacks = new Set([
  "body-of-knowledge",
  "wild-world",
  "how-it-works",
  "ancient-worlds",
  "american-story",
  "myth-and-legend",
  "at-the-table",
  "bookshelf-essentials",
]);

const questionSchema = z.object({
  catalogKey: z.string().trim().min(3).max(160),
  replacesCatalogKey: z.string().trim().min(3).max(160).optional(),
  replacementRootCatalogKey: z.string().trim().min(3).max(160).optional(),
  topicSlug: z.string().trim().min(1),
  packSlugs: z.array(z.string().trim().min(1)).min(1),
  subtopics: z.array(z.string().trim().min(2).max(80)).length(1),
  detailTags: z.array(z.string().trim().min(2).max(80)).max(8),
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

const editorialApprovalSchema = z.object({
  schemaVersion: z.literal(1),
  approvals: z.record(
    z.string().trim().min(3).max(200),
    z.array(z.string().regex(/^[a-f0-9]{32}$/)).min(1),
  ),
});

const personSurnameAliasSchema = z.record(
  z.string().trim().min(3).max(160),
  z.string().trim().min(2).max(100),
);

export function loadPersonSurnameAliases(path = personSurnameAliasPath) {
  if (!existsSync(path)) return new Map();
  return new Map(
    Object.entries(
      personSurnameAliasSchema.parse(JSON.parse(readFileSync(path, "utf8"))),
    ),
  );
}

export function loadEditorialApprovals(path = editorialApprovalPath) {
  if (!existsSync(path)) return [];
  const parsed = editorialApprovalSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
  return Object.entries(parsed.approvals)
    .flatMap(([editorialKey, hashes]) =>
      [...new Set(hashes)].map((contentHash) => ({
        editorialKey,
        contentHash,
      })),
    )
    .sort(
      (left, right) =>
        left.editorialKey.localeCompare(right.editorialKey) ||
        left.contentHash.localeCompare(right.contentHash),
    );
}

function normalized(value, removeLeadingArticles = false) {
  let result = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}\s]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (removeLeadingArticles)
    result = result.replace(/^(?:a|an|the)\s+/i, "");
  return result.replaceAll(/\s+/g, "");
}

function withoutRedundantAliases(question) {
  const accepted = new Set([
    normalized(question.canonicalAnswer, question.removeLeadingArticles),
  ]);
  return {
    ...question,
    aliases: question.aliases.filter((alias) => {
      const key = normalized(alias, question.removeLeadingArticles);
      if (accepted.has(key)) return false;
      accepted.add(key);
      return true;
    }),
  };
}

function localizedSportsTerm(value) {
  const protectedLeague = "__MINDSPAN_AAF_LEAGUE__";
  return value
    .replaceAll(/Alliance of American Football/gi, protectedLeague)
    .replaceAll(/association football/gi, (match) =>
      /^[A-Z]/.test(match) ? "Soccer" : "soccer",
    )
    .replaceAll(/American football/gi, (match) =>
      /^[A-Z]/.test(match) ? "Football" : "football",
    )
    .replaceAll(/gridiron football/gi, (match) =>
      /^[A-Z]/.test(match) ? "Football" : "football",
    )
    .replaceAll(protectedLeague, "Alliance of American Football");
}

function localizeSportsTerminology(question) {
  if (question.topicSlug !== "sports") return question;
  const originalCanonical = question.canonicalAnswer;
  const canonicalAnswer = localizedSportsTerm(originalCanonical);
  const formalAlias = /^association football$/i.test(originalCanonical)
    ? "association football"
    : /^american football$/i.test(originalCanonical)
      ? "American football"
      : null;
  return {
    ...question,
    prompt: localizedSportsTerm(question.prompt),
    canonicalAnswer,
    aliases: [
      ...question.aliases.map(localizedSportsTerm),
      ...(formalAlias ? [formalAlias] : []),
    ],
    distractors: question.distractors.map(localizedSportsTerm),
    explanation: localizedSportsTerm(question.explanation),
    details: localizedSportsTerm(question.details),
  };
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

function isSeasonCountRecall(question) {
  return /\b(?:how many|number of) seasons\b|\bran for how many seasons\b/i.test(
    question.prompt,
  );
}

function promptStem(prompt) {
  return prompt
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
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
  const amendmentLayers = [];
  const usedAmendments = new Set();
  const personSurnameAliases = loadPersonSurnameAliases();
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
  if (existsSync(amendmentDirectory)) {
    for (const file of readdirSync(amendmentDirectory)
      .filter((name) => name.endsWith(".json"))
      .sort()) {
      const entries = JSON.parse(
        readFileSync(resolve(amendmentDirectory, file), "utf8"),
      );
      amendmentLayers.push({ file, entries: new Map(Object.entries(entries)) });
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
      const replacementCatalogKey = revision.replacementCatalogKey;
      const revisedCatalogKey = replacementCatalogKey ?? question.catalogKey;
      const revisedPrompt = revision.prompt ?? enrichment.prompt ?? question.prompt;
      const revisedQuestion = {
        ...question,
        ...enrichment,
        ...revision,
        catalogKey: revisedCatalogKey,
        replacesCatalogKey: replacementCatalogKey
          ? question.catalogKey
          : undefined,
        answerMode:
          revision.answerMode ??
          enrichment.answerMode ??
          question.answerMode ??
          (/which (?:of (?:the following|these)|one of (?:the following|these))/i.test(
            revisedPrompt,
          )
            ? "required_choice"
            : "recall"),
      };
      let effectiveQuestion = revisedQuestion;
      for (const layer of amendmentLayers) {
        const targetCatalogKey = effectiveQuestion.catalogKey;
        const amendment = layer.entries.get(targetCatalogKey);
        if (!amendment) continue;
        usedAmendments.add(`${layer.file}\0${targetCatalogKey}`);
        const amendedCatalogKey =
          amendment.replacementCatalogKey ?? targetCatalogKey;
        effectiveQuestion = {
          ...effectiveQuestion,
          ...amendment,
          catalogKey: amendedCatalogKey,
          replacesCatalogKey: amendment.replacementCatalogKey
            ? targetCatalogKey
            : effectiveQuestion.replacesCatalogKey,
          replacementRootCatalogKey: amendment.replacementCatalogKey
            ? (effectiveQuestion.replacementRootCatalogKey ??
              effectiveQuestion.replacesCatalogKey)
            : effectiveQuestion.replacementRootCatalogKey,
          aliases: amendment.aliases ?? effectiveQuestion.aliases,
        };
      }
      effectiveQuestion = {
        ...effectiveQuestion,
        aliases: [
          ...effectiveQuestion.aliases,
          ...(personSurnameAliases.has(effectiveQuestion.catalogKey)
            ? [personSurnameAliases.get(effectiveQuestion.catalogKey)]
            : []),
        ],
      };
      const taxonomy = normalizeQuestionTaxonomy(effectiveQuestion);
      return {
        ...localizeSportsTerminology(effectiveQuestion),
        subtopics: [taxonomy.subtopic],
        detailTags: taxonomy.detailTags,
        __file: file,
      };
    });
  });

  const issues = [];
  for (const layer of amendmentLayers)
    for (const catalogKey of layer.entries.keys())
      if (!usedAmendments.has(`${layer.file}\0${catalogKey}`))
        issues.push(`Amendment target not found: ${catalogKey} (${layer.file})`);
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
    const question = withoutRedundantAliases(parsed.data);
    const accepted = new Set(
      [question.canonicalAnswer, ...question.aliases].map((answer) =>
        normalized(answer, question.removeLeadingArticles),
      ),
    );
    if (accepted.size !== question.aliases.length + 1)
      issues.push(
        `${__file} ${question.catalogKey}: duplicate normalized accepted answer`,
      );
    const distractors = question.distractors.map((answer) =>
      normalized(answer, question.removeLeadingArticles),
    );
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
    if (!TAXONOMY_AREAS[question.topicSlug].includes(question.subtopics[0]))
      issues.push(
        `${__file} ${question.catalogKey}: invalid canonical subtopic ${question.subtopics[0]}`,
      );
    if (
      question.detailTags.some(
        (tag) => normalized(tag) === normalized(question.subtopics[0]),
      )
    )
      issues.push(
        `${__file} ${question.catalogKey}: primary subtopic duplicated as a detail tag`,
      );
    validQuestions.push(question);
  }

  const keys = new Set();
  const replacedKeys = new Set();
  const replacementRootKeys = new Set();
  const prompts = new Set();
  for (const question of validQuestions) {
    if (keys.has(question.catalogKey))
      issues.push(`Duplicate catalog key: ${question.catalogKey}`);
    keys.add(question.catalogKey);
    if (question.replacesCatalogKey) {
      if (question.replacesCatalogKey === question.catalogKey)
        issues.push(
          `${question.catalogKey}: replacement identity must differ from its predecessor`,
        );
      if (replacedKeys.has(question.replacesCatalogKey))
        issues.push(
          `Duplicate replacement target: ${question.replacesCatalogKey}`,
        );
      replacedKeys.add(question.replacesCatalogKey);
    }
    if (question.replacementRootCatalogKey) {
      if (!question.replacesCatalogKey)
        issues.push(
          `${question.catalogKey}: replacement root requires an immediate predecessor`,
        );
      if (question.replacementRootCatalogKey === question.catalogKey)
        issues.push(
          `${question.catalogKey}: replacement root identity must differ from its successor`,
        );
      if (question.replacementRootCatalogKey === question.replacesCatalogKey)
        issues.push(
          `${question.catalogKey}: replacement root must precede the immediate predecessor`,
        );
      if (replacementRootKeys.has(question.replacementRootCatalogKey))
        issues.push(
          `Duplicate replacement root: ${question.replacementRootCatalogKey}`,
        );
      replacementRootKeys.add(question.replacementRootCatalogKey);
    }
    const promptKey = `${question.topicSlug}|${normalized(question.prompt)}`;
    if (prompts.has(promptKey))
      issues.push(`Duplicate prompt: ${question.prompt}`);
    prompts.add(promptKey);
  }
  for (const replacedKey of replacedKeys) {
    if (keys.has(replacedKey))
      issues.push(
        `Replacement target remains active in the catalog: ${replacedKey}`,
      );
  }
  for (const replacementRootKey of replacementRootKeys) {
    if (keys.has(replacementRootKey))
      issues.push(
        `Replacement root remains active in the catalog: ${replacementRootKey}`,
      );
  }
  for (const catalogKey of personSurnameAliases.keys()) {
    if (!keys.has(catalogKey))
      issues.push(`Surname alias targets an unknown question: ${catalogKey}`);
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

    const seasonCount = entries.filter(isSeasonCountRecall).length;
    if (seasonCount > 1)
      issues.push(
        `${pack.slug}: season-count recall limit is 1, found ${seasonCount}`,
      );

    if (pack.slug === "geography-starter") {
      const templateLimits = [
        ["capital lookup", /^What is the capital of\b/i, 4],
        ["river mouth", /^Into what body of water\b/i, 3],
        ["generic landmark country", /^Which country contains the landmark\b/i, 1],
        ["generic country location", /^In which country is .+ located\?$/i, 3],
      ];
      for (const [label, pattern, limit] of templateLimits) {
        const count = entries.filter((question) =>
          pattern.test(question.prompt),
        ).length;
        if (count > limit)
          issues.push(
            `${pack.slug}: ${label} template limit is ${limit}, found ${count}`,
          );
      }
      for (const question of entries.filter(
        (candidate) => candidate.replacesCatalogKey,
      ))
        if (question.explanation.length < 40 || question.details.length < 100)
          issues.push(
            `${pack.slug} ${question.catalogKey}: replacement explanation or context is too short`,
          );
    }

    if (varietyGuardedPacks.has(pack.slug)) {
      const stemCounts = new Map();
      const detailTagCounts = new Map();
      for (const question of entries) {
        const stem = promptStem(question.prompt);
        stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
        for (const detailTag of question.detailTags)
          detailTagCounts.set(
            detailTag,
            (detailTagCounts.get(detailTag) ?? 0) + 1,
          );
        if (question.explanation.length < 20 || question.details.length < 40)
          issues.push(
            `${pack.slug} ${question.catalogKey}: explanation or context is too short`,
          );
      }
      for (const [stem, count] of stemCounts)
        if (count > 2)
          issues.push(
            `${pack.slug}: prompt stem "${stem}" appears ${count} times; limit is 2`,
          );
      for (const [detailTag, count] of detailTagCounts)
        if (count > 10)
          issues.push(
            `${pack.slug}: detail tag "${detailTag}" appears ${count} times; limit is 10`,
          );
    }
  }

  const totalSeasonCount = validQuestions.filter(isSeasonCountRecall).length;
  if (totalSeasonCount > 3)
    issues.push(
      `Catalog season-count recall limit is 3, found ${totalSeasonCount}`,
    );

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
