import { createClient } from "@supabase/supabase-js";

import { loadCatalog, readLocalEnv } from "./catalog-lib.mjs";

const env = readLocalEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const { manifest } = loadCatalog();

const { count: questionCount, error: questionError } = await supabase
  .from("questions")
  .select("id", { count: "exact", head: true });
if (questionError) throw questionError;
if (questionCount !== 1_100)
  throw new Error(`Expected 1100 published questions, found ${questionCount}`);

const { data: packs, error: packError } = await supabase
  .from("packs")
  .select("id, slug, is_starter, price_insight")
  .in(
    "slug",
    manifest.packs.map((pack) => pack.slug),
  );
if (packError) throw packError;

const results = [];
for (const expected of manifest.packs) {
  const pack = packs.find((candidate) => candidate.slug === expected.slug);
  if (!pack) throw new Error(`Missing pack ${expected.slug}`);
  const { count, error } = await supabase
    .from("pack_questions")
    .select("question_id", { count: "exact", head: true })
    .eq("pack_id", pack.id);
  if (error) throw error;
  const expectedTotal = expected.generatedTarget + expected.existingSeedCount;
  if (count !== expectedTotal)
    throw new Error(
      `${expected.slug}: expected ${expectedTotal}, found ${count}`,
    );
  results.push({
    pack: expected.slug,
    questions: count,
    initial: pack.is_starter,
    insight: pack.price_insight,
  });
}

const easyPack = packs.find((pack) => pack.slug === "easy-does-it");
const [{ data: betaProfiles }, { data: easyUnlocks }] = await Promise.all([
  supabase
    .from("profiles")
    .select("id")
    .not("beta_access_granted_at", "is", null),
  supabase.from("pack_unlocks").select("user_id").eq("pack_id", easyPack.id),
]);
const unlockedUsers = new Set(easyUnlocks?.map((unlock) => unlock.user_id));
const missingEasyUnlocks =
  betaProfiles?.filter((profile) => !unlockedUsers.has(profile.id)) ?? [];
if (missingEasyUnlocks.length)
  throw new Error(
    `Easy Does It missing for ${missingEasyUnlocks.length}/${betaProfiles?.length ?? 0} beta player(s)`,
  );

console.table(results);
console.log(
  `Verified ${questionCount} questions across ${results.length} packs; Easy Does It unlocked for ${betaProfiles?.length ?? 0} beta player(s).`,
);
