import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = new URL("../.env.local", import.meta.url);
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
const values = { ...fileValues, ...process.env };
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const email = `import-${crypto.randomUUID()}@mindspan.local`;
let userId;
let questionId;
let versionId;
const prompt = `Transactional import verification ${crypto.randomUUID()}?`;

try {
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password: `Test-${crypto.randomUUID()}!`,
    email_confirm: true,
  });
  if (userError) throw userError;
  userId = user.user.id;
  await admin
    .from("profiles")
    .update({
      role: "sys_admin",
      beta_access_granted_at: new Date().toISOString(),
    })
    .eq("id", userId);
  const payload = [
    {
      topicSlug: "science-nature",
      packSlugs: ["science-nature-starter"],
      subtopics: ["Import Verification"],
      prompt,
      canonicalAnswer: "Verification",
      aliases: ["Verified"],
      distractors: ["Alpha", "Beta", "Gamma"],
      explanation: "This question verifies the transactional import path.",
      details:
        "The record must enter review with all required relational content attached.",
      difficulty: 3,
      timeLimitSeconds: 30,
      removeLeadingArticles: false,
      source: {
        label: "Mindspan test",
        url: "https://example.com/mindspan-import-test",
      },
      expiresAt: null,
    },
  ];
  const { data, error } = await admin.rpc("import_question_batch_v1", {
    payload,
    target_admin: userId,
  });
  if (error) throw error;
  questionId = data[0].question_id;
  versionId = data[0].version_id;
  const [
    { count: aliases },
    { count: distractors },
    { count: citations },
    { count: subtopics },
    { count: packs },
    { data: version },
  ] = await Promise.all([
    admin
      .from("answer_aliases")
      .select("id", { count: "exact", head: true })
      .eq("question_version_id", versionId),
    admin
      .from("distractors")
      .select("id", { count: "exact", head: true })
      .eq("question_version_id", versionId),
    admin
      .from("question_citations")
      .select("id", { count: "exact", head: true })
      .eq("question_version_id", versionId),
    admin
      .from("question_subtopics")
      .select("subtopic_id", { count: "exact", head: true })
      .eq("question_id", questionId),
    admin
      .from("pack_questions")
      .select("pack_id", { count: "exact", head: true })
      .eq("question_id", questionId),
    admin
      .from("question_versions")
      .select("status")
      .eq("id", versionId)
      .single(),
  ]);
  if (
    aliases !== 2 ||
    distractors !== 3 ||
    citations !== 1 ||
    subtopics !== 1 ||
    packs !== 1 ||
    version?.status !== "review"
  )
    throw new Error("Imported question is incomplete");
  const duplicate = await admin.rpc("import_question_batch_v1", {
    payload,
    target_admin: userId,
  });
  if (!duplicate.error) throw new Error("Duplicate import should be rejected");
  console.log("Transactional review import and duplicate rejection passed");
} finally {
  if (questionId)
    await admin.from("pack_questions").delete().eq("question_id", questionId);
  if (versionId) {
    await admin
      .from("answer_aliases")
      .delete()
      .eq("question_version_id", versionId);
    await admin
      .from("distractors")
      .delete()
      .eq("question_version_id", versionId);
    await admin
      .from("question_citations")
      .delete()
      .eq("question_version_id", versionId);
    await admin.from("admin_audit_log").delete().eq("target_id", versionId);
    await admin.from("question_versions").delete().eq("id", versionId);
  }
  if (questionId) await admin.from("questions").delete().eq("id", questionId);
  await admin.from("subtopics").delete().eq("slug", "import-verification");
  if (userId) await admin.auth.admin.deleteUser(userId);
}
