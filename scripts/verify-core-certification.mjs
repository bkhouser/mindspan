import { createClient } from "@supabase/supabase-js";

import { loadEditorialApprovals, readLocalEnv } from "./catalog-lib.mjs";

const CORE_PACK_SLUGS = [
  "science-nature-starter",
  "history-starter",
  "geography-starter",
  "sports-starter",
  "arts-literature-starter",
  "film-television-starter",
  "music-starter",
  "lifestyle-culture-starter",
  "easy-does-it",
  "trivia-101",
];
const BATCH_SIZE = 150;

function batches(values) {
  return Array.from(
    { length: Math.ceil(values.length / BATCH_SIZE) },
    (_, index) => values.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = readLocalEnv();
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data: packs, error: packError } = await admin
  .from("packs")
  .select("id,slug")
  .in("slug", CORE_PACK_SLUGS);
if (packError) throw packError;
assert(packs.length === CORE_PACK_SLUGS.length, "Core pack set is incomplete");

const { data: links, error: linkError } = await admin
  .from("pack_questions")
  .select("question_id")
  .in(
    "pack_id",
    packs.map((pack) => pack.id),
  );
if (linkError) throw linkError;
const questionIds = [...new Set(links.map((link) => link.question_id))];
assert(
  questionIds.length === 900,
  `Expected 900 current core questions, found ${questionIds.length}`,
);

const [questionResults, versionResults] = await Promise.all([
  Promise.all(
    batches(questionIds).map((ids) =>
      admin.from("questions").select("id,catalog_key,retired_at").in("id", ids),
    ),
  ),
  Promise.all(
    batches(questionIds).map((ids) =>
      admin
        .from("question_versions")
        .select("id,question_id,editorial_key,editorial_content_hash")
        .in("question_id", ids)
        .eq("status", "published"),
    ),
  ),
]);
for (const result of [...questionResults, ...versionResults])
  if (result.error) throw result.error;
const questions = questionResults.flatMap((result) => result.data ?? []);
const versions = versionResults.flatMap((result) => result.data ?? []);
assert(
  questions.length === 900 &&
    questions.every((question) => !question.retired_at),
  "Core pack links must resolve to exactly 900 active questions",
);
assert(
  versions.length === 900,
  `Expected one published version per core question, found ${versions.length}`,
);

const reviewResults = await Promise.all(
  batches(versions.map((version) => version.id)).map((ids) =>
    admin
      .from("question_editorial_reviews")
      .select("question_version_id")
      .in("question_version_id", ids)
      .eq("verdict", "approved"),
  ),
);
for (const result of reviewResults) if (result.error) throw result.error;
const approvedVersionIds = new Set(
  reviewResults
    .flatMap((result) => result.data ?? [])
    .map((review) => review.question_version_id),
);
assert(
  approvedVersionIds.size === 900,
  `Expected 900 approved core questions, found ${approvedVersionIds.size}`,
);

const questionById = new Map(
  questions.map((question) => [question.id, question]),
);
const seedVersions = versions.filter(
  (version) => questionById.get(version.question_id)?.catalog_key === null,
);
assert(
  seedVersions.length === 40,
  `Expected 40 current seed questions, found ${seedVersions.length}`,
);
const approvalFingerprints = new Set(
  loadEditorialApprovals().map(
    (approval) => `${approval.editorialKey}\u0000${approval.contentHash}`,
  ),
);
const matchingSeedFingerprints = seedVersions.filter(
  (version) =>
    version.editorial_key &&
    version.editorial_content_hash &&
    approvalFingerprints.has(
      `${version.editorial_key}\u0000${version.editorial_content_hash}`,
    ),
);
assert(
  matchingSeedFingerprints.length === 40,
  `Expected 40 seed fingerprints in the portable ledger, found ${matchingSeedFingerprints.length}`,
);

console.log(
  "Core certification verified: 900/900 approved, including 40/40 seed fingerprints matched to the portable ledger.",
);
