import { createClient } from "@supabase/supabase-js";
import { readLocalEnv } from "./catalog-lib.mjs";

const values = readLocalEnv();
const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
let userId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: `taxonomy-${crypto.randomUUID()}@mindspan.local`,
      email_confirm: true,
      password: `Taxonomy-${crypto.randomUUID()}!`,
    });
  if (createError) throw createError;
  userId = created.user.id;

  const { data: version, error: versionError } = await admin
    .from("question_versions")
    .select("id,question_id")
    .eq("status", "published")
    .limit(1)
    .single();
  if (versionError) throw versionError;

  const { data: session, error: sessionError } = await admin
    .from("play_sessions")
    .insert({ mode: "mixed", user_id: userId })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  const now = new Date();
  const { data: presentation, error: presentationError } = await admin
    .from("question_presentations")
    .insert({
      activated_at: now.toISOString(),
      algorithm_version: "taxonomy-verification",
      expires_at: new Date(now.getTime() + 30_000).toISOString(),
      prior_correct_count: 0,
      proficiency_snapshot: 0,
      question_version_id: version.id,
      sequence_number: 1,
      session_id: session.id,
      starting_points: 100,
      user_id: userId,
    })
    .select("id")
    .single();
  if (presentationError) throw presentationError;

  const { error: attemptError } = await admin.from("attempts").insert({
    assisted: false,
    correct: true,
    earned_points: 75,
    elapsed_ms: 5_000,
    idempotency_key: crypto.randomUUID(),
    presentation_id: presentation.id,
    question_version_id: version.id,
    remaining_ratio: 0.8,
    score_snapshot: {
      masteryEvidenceDelta: 1,
      masterySuccessDelta: 1,
    },
    submitted_answer: "Synthetic verification answer",
    timed_out: false,
    user_id: userId,
  });
  if (attemptError) throw attemptError;

  const { data: beforeMastery, error: beforeMasteryError } = await admin
    .from("user_subtopic_mastery")
    .select("weighted_successes,weighted_evidence,unique_questions,total_attempts,lifetime_points")
    .eq("user_id", userId)
    .single();
  if (beforeMasteryError) throw beforeMasteryError;

  const { error: finalizeError } = await admin.rpc(
    "finalize_normalized_taxonomy_v1",
  );
  if (finalizeError) throw finalizeError;

  const [{ count: attempts, error: attemptCountError }, afterMasteryResult] =
    await Promise.all([
      admin
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      admin
        .from("user_subtopic_mastery")
        .select("weighted_successes,weighted_evidence,unique_questions,total_attempts,lifetime_points")
        .eq("user_id", userId)
        .single(),
    ]);
  if (attemptCountError) throw attemptCountError;
  if (afterMasteryResult.error) throw afterMasteryResult.error;
  assert(attempts === 1, "taxonomy finalization must preserve attempts");
  assert(
    JSON.stringify(afterMasteryResult.data) === JSON.stringify(beforeMastery),
    "taxonomy finalization must rebuild equivalent subtopic mastery",
  );
  console.log(
    "Taxonomy finalization preserved the synthetic attempt and rebuilt equivalent subtopic mastery",
  );
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}
