import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataDirectory = resolve(import.meta.dirname, "hidden-expansions");
const outputDirectory = resolve(root, "content", "catalog", "questions");
const manifest = JSON.parse(
  readFileSync(resolve(root, "content", "catalog", "manifest.json"), "utf8"),
);

mkdirSync(outputDirectory, { recursive: true });

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "");
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

const files = readdirSync(dataDirectory)
  .filter((name) => name.endsWith(".mjs"))
  .sort();

if (!files.length) throw new Error("No hidden expansion data modules found.");

let total = 0;
for (const file of files) {
  const packModule = await import(`./hidden-expansions/${file}`);
  const { packSlug, topicSlug, sources, facts } = packModule.default;
  const expected = manifest.packs.find((pack) => pack.slug === packSlug);
  if (!expected) throw new Error(`${file}: pack ${packSlug} is not in the manifest`);
  if (facts.length !== expected.generatedTarget)
    throw new Error(
      `${file}: expected ${expected.generatedTarget} facts, found ${facts.length}`,
    );

  const keySet = new Set();
  const stemCounts = new Map();
  const subtopicCounts = new Map();
  const questions = facts.map((fact) => {
    const {
      id,
      subtopics,
      prompt,
      answer,
      aliases = [],
      distractors,
      explanation,
      details,
      difficulty,
      source,
      answerMode = "recall",
      timeLimitSeconds = answer.length > 28 ? 45 : 30,
    } = fact;
    const catalogKey = `${packSlug}.${id}`;
    if (keySet.has(catalogKey)) throw new Error(`${file}: duplicate key ${catalogKey}`);
    keySet.add(catalogKey);
    if (!sources[source]) throw new Error(`${catalogKey}: unknown source ${source}`);
    if (distractors.length !== 3)
      throw new Error(`${catalogKey}: exactly three distractors are required`);
    const accepted = new Set([answer, ...aliases].map(normalize));
    if (accepted.size !== aliases.length + 1)
      throw new Error(`${catalogKey}: duplicate normalized answer or alias`);
    if (distractors.some((item) => accepted.has(normalize(item))))
      throw new Error(`${catalogKey}: distractor collides with an accepted answer`);
    if (new Set(distractors.map(normalize)).size !== 3)
      throw new Error(`${catalogKey}: duplicate normalized distractor`);
    if (explanation.length < 20 || details.length < 40)
      throw new Error(`${catalogKey}: explanation or context is too short`);

    const stem = promptStem(prompt);
    stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
    for (const subtopic of subtopics)
      subtopicCounts.set(subtopic, (subtopicCounts.get(subtopic) ?? 0) + 1);

    return {
      catalogKey,
      topicSlug,
      packSlugs: [packSlug],
      subtopics,
      prompt,
      answerMode,
      canonicalAnswer: answer,
      aliases,
      distractors,
      explanation,
      details,
      difficulty,
      timeLimitSeconds,
      removeLeadingArticles: true,
      source: sources[source],
      expiresAt: null,
    };
  });

  const difficulty = [1, 2, 3, 4, 5].map(
    (level) => questions.filter((question) => question.difficulty === level).length,
  );
  if (JSON.stringify(difficulty) !== JSON.stringify(expected.difficulty))
    throw new Error(
      `${file}: difficulty ${JSON.stringify(difficulty)} does not match ${JSON.stringify(expected.difficulty)}`,
    );
  const repeatedStems = [...stemCounts].filter(([, count]) => count > 2);
  if (repeatedStems.length)
    throw new Error(`${file}: repeated prompt stems ${JSON.stringify(repeatedStems)}`);
  const concentrated = [...subtopicCounts].filter(([, count]) => count > 10);
  if (concentrated.length)
    throw new Error(`${file}: concentrated subtopics ${JSON.stringify(concentrated)}`);

  const outputPath = resolve(outputDirectory, `${packSlug}.json`);
  writeFileSync(outputPath, `${JSON.stringify(questions, null, 2)}\n`);
  total += questions.length;
  console.log(
    `${packSlug}: ${questions.length} questions, difficulty ${difficulty.join("/")}`,
  );
}

const expectedHidden = manifest.packs
  .filter((pack) => files.some((file) => file === `${pack.slug}.mjs`))
  .reduce((sum, pack) => sum + pack.generatedTarget, 0);
if (total !== expectedHidden)
  throw new Error(`Expected ${expectedHidden} generated questions, wrote ${total}`);

console.log(`Generated ${total} hidden expansion questions.`);
