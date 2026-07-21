import { createClient } from "@supabase/supabase-js";

import { readLocalEnv } from "./catalog-lib.mjs";

const STOPWORDS = new Set(
  "a an and are as at be by did do does for from had has have how in into is it its of on or that the this to was were what when where which who whose why with".split(
    " ",
  ),
);

function normalize(value) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replaceAll(/\p{M}/gu, "")
    .replaceAll(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replaceAll(/\s+/g, " ");
}

function meaningfulTokens(value) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

function intersectionSize(left, right) {
  let count = 0;
  for (const value of left) if (right.has(value)) count += 1;
  return count;
}

function similarity(left, right) {
  const shared = intersectionSize(left, right);
  const union = new Set([...left, ...right]).size;
  return {
    shared,
    jaccard: union ? shared / union : 0,
    containment: Math.min(left.size, right.size)
      ? shared / Math.min(left.size, right.size)
      : 0,
  };
}

function isKnownTemplateFamily(left, right) {
  const templates = [
    /^which astronomical body does .+ orbit$/,
    /^which body of water does .+ flow into$/,
    /^into what body of water does .+ flow$/,
    /^which agency operates the shenzhou .+ mission$/,
    /^which organization operated shenzhou .+$/,
    /^which country is monarch .+ associated with$/,
    /^which country did athlete .+ represent or hold citizenship in$/,
    /^in which country is .+ located$/,
    /^which country contains the landmark .+$/,
    /^on which continent is .+ located$/,
    /^which sport is contested in .+$/,
    /^the .+ is contested in which sport$/,
    /^which scientific field is most closely associated with .+$/,
  ];
  const a = normalize(left);
  const b = normalize(right);
  return templates.some((pattern) => pattern.test(a) && pattern.test(b));
}

function groupBy(values, selector) {
  const groups = new Map();
  for (const value of values) {
    const key = selector(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

async function fetchAll(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await buildQuery(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) return rows;
  }
}

const env = readLocalEnv();
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const versions = await fetchAll((from, to) =>
  admin
    .from("question_versions")
    .select(
      "id,prompt,canonical_answer,answer_aliases(answer),questions(id,catalog_key,pack_questions(packs(slug,name)))",
    )
    .eq("status", "published")
    .order("id")
    .range(from, to),
);

const records = versions.map((version) => {
  const question = version.questions;
  const packs = question.pack_questions
    .map((link) => link.packs)
    .filter(Boolean)
    .map((pack) => ({ slug: pack.slug, name: pack.name }));
  return {
    key: question.catalog_key ?? `seed:${question.id}`,
    prompt: version.prompt,
    canonicalAnswer: version.canonical_answer,
    acceptedAnswers: [
      version.canonical_answer,
      ...version.answer_aliases.map((alias) => alias.answer),
    ],
    packs,
    normalizedPrompt: normalize(version.prompt),
    tokens: meaningfulTokens(version.prompt),
  };
});

const exactGroups = [...groupBy(records, (record) => record.normalizedPrompt)]
  .filter(([, group]) => group.length > 1)
  .map(([, group]) => group);

const answerIndex = new Map();
for (const record of records) {
  for (const answer of new Set(record.acceptedAnswers.map(normalize))) {
    const entries = answerIndex.get(answer) ?? [];
    entries.push(record);
    answerIndex.set(answer, entries);
  }
}

const pairKeys = new Set();
const candidates = [];
for (const [sharedAnswer, group] of answerIndex) {
  if (group.length < 2 || group.length > 25) continue;
  for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
      const left = group[leftIndex];
      const right = group[rightIndex];
      if (left.normalizedPrompt === right.normalizedPrompt) continue;
      const pairKey = [left.key, right.key].sort().join("|");
      if (pairKeys.has(pairKey)) continue;
      pairKeys.add(pairKey);
      const scores = similarity(left.tokens, right.tokens);
      if (
        scores.shared < 2 ||
        (scores.jaccard < 0.34 && scores.containment < 0.58)
      )
        continue;
      candidates.push({
        sharedAnswer,
        ...scores,
        templateFamily: isKnownTemplateFamily(left.prompt, right.prompt),
        left,
        right,
      });
    }
  }
}

candidates.sort(
  (left, right) =>
    Number(left.templateFamily) - Number(right.templateFamily) ||
    right.jaccard - left.jaccard ||
    right.containment - left.containment,
);

const simplify = (record) => ({
  key: record.key,
  packs: record.packs.map((pack) => pack.slug),
  prompt: record.prompt,
  answer: record.canonicalAnswer,
});

const report = {
  generatedAt: new Date().toISOString(),
  questionCount: records.length,
  exactPromptGroups: exactGroups.map((group) => group.map(simplify)),
  semanticCandidates: candidates.map((candidate) => ({
    sharedAnswer: candidate.sharedAnswer,
    jaccard: Number(candidate.jaccard.toFixed(3)),
    containment: Number(candidate.containment.toFixed(3)),
    templateFamily: candidate.templateFamily,
    left: simplify(candidate.left),
    right: simplify(candidate.right),
  })),
};

if (
  process.argv.includes("--fail-on-exact") &&
  report.exactPromptGroups.length > 0
) {
  process.exitCode = 1;
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `Audited ${report.questionCount} current questions: ${report.exactPromptGroups.length} exact duplicate group(s), ${report.semanticCandidates.length} semantic candidate pair(s).`,
  );
  for (const group of report.exactPromptGroups) {
    console.log("\nEXACT");
    for (const question of group)
      console.log(`- ${question.key} [${question.packs.join(", ")}]: ${question.prompt}`);
  }
  const crossPackOnly = process.argv.includes("--cross-pack");
  if (process.argv.includes("--answer-groups")) {
    const groups = [...answerIndex.entries()]
      .map(([answer, entries]) => [
        answer,
        [...new Map(entries.map((entry) => [entry.key, entry])).values()],
      ])
      .filter(([, entries]) => entries.length > 1 && entries.length <= 8)
      .filter(
        ([, entries]) =>
          !crossPackOnly ||
          new Set(entries.flatMap((entry) => entry.packs.map((pack) => pack.slug)))
            .size > 1,
      )
      .sort((left, right) => left[0].localeCompare(right[0]));
    console.log(`\n${groups.length} repeated accepted-answer group(s):`);
    for (const [answer, entries] of groups) {
      console.log(`\nANSWER: ${answer}`);
      for (const entry of entries)
        console.log(
          `- ${entry.key} [${entry.packs.map((pack) => pack.slug).join(", ")}]: ${entry.prompt}`,
        );
    }
    process.exit(0);
  }
  const likely = report.semanticCandidates.filter((candidate) => {
    if (candidate.templateFamily) return false;
    if (!crossPackOnly) return true;
    return candidate.left.packs.some(
      (pack) => !candidate.right.packs.includes(pack),
    );
  });
  console.log(`\n${likely.length} non-template semantic candidate pair(s):`);
  for (const candidate of likely) {
    console.log(
      `\n${candidate.sharedAnswer} (J=${candidate.jaccard}, C=${candidate.containment})`,
    );
    console.log(
      `- ${candidate.left.key} [${candidate.left.packs.join(", ")}]: ${candidate.left.prompt}`,
    );
    console.log(
      `- ${candidate.right.key} [${candidate.right.packs.join(", ")}]: ${candidate.right.prompt}`,
    );
  }
}
