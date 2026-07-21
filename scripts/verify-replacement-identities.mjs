import { createClient } from "@supabase/supabase-js";

import { loadCatalog, readLocalEnv } from "./catalog-lib.mjs";

const values = readLocalEnv();
if (
  !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::|\/)/.test(
    values.NEXT_PUBLIC_SUPABASE_URL,
  )
)
  throw new Error("Replacement identity verification is local-only");

const admin = createClient(
  values.NEXT_PUBLIC_SUPABASE_URL,
  values.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const replacements = loadCatalog().questions.filter(
  (question) => question.replacesCatalogKey,
);
if (!replacements.length) throw new Error("No replacement identities found");
const chainedReplacements = replacements.filter(
  (question) => question.replacementRootCatalogKey,
);
if (chainedReplacements.length !== 6)
  throw new Error(
    `Expected 6 chained replacements, found ${chainedReplacements.length}`,
  );

const replacement = chainedReplacements[0];
const immediateReplacement = replacements.find(
  (question) => !question.replacementRootCatalogKey,
);
if (!immediateReplacement)
  throw new Error("No immediate replacement identity found");
let userId;
let insertedRootSubtopicId;
let rootQuestionId;
let insertedImmediateSubtopicId;
let immediateRootQuestionId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const chainedKeys = chainedReplacements.flatMap((question) => [
    question.catalogKey,
    question.replacementRootCatalogKey,
  ]);
  const { data: chainedRows, error: chainedError } = await admin
    .from("questions")
    .select("catalog_key,retired_at")
    .in("catalog_key", chainedKeys);
  if (chainedError) throw chainedError;
  for (const chained of chainedReplacements) {
    const root = chainedRows.find(
      (question) => question.catalog_key === chained.replacementRootCatalogKey,
    );
    const successor = chainedRows.find(
      (question) => question.catalog_key === chained.catalogKey,
    );
    assert(
      root?.retired_at,
      `Chained root remains active: ${chained.catalogKey}`,
    );
    assert(
      successor && !successor.retired_at,
      `Chained successor is not active: ${chained.catalogKey}`,
    );
  }

  const { data: immediateRows, error: immediateRowsError } = await admin
    .from("questions")
    .select("id,catalog_key")
    .in("catalog_key", [
      immediateReplacement.catalogKey,
      immediateReplacement.replacesCatalogKey,
    ]);
  if (immediateRowsError) throw immediateRowsError;
  const immediateRoot = immediateRows.find(
    (question) =>
      question.catalog_key === immediateReplacement.replacesCatalogKey,
  );
  const immediateSuccessor = immediateRows.find(
    (question) => question.catalog_key === immediateReplacement.catalogKey,
  );
  assert(immediateRoot, "Missing immediate predecessor question");
  assert(immediateSuccessor, "Missing immediate replacement question");
  immediateRootQuestionId = immediateRoot.id;

  let { data: immediateRootSubtopics, error: immediateRootSubtopicsError } =
    await admin
      .from("question_subtopics")
      .select("subtopic_id")
      .eq("question_id", immediateRoot.id);
  if (immediateRootSubtopicsError) throw immediateRootSubtopicsError;
  if (!immediateRootSubtopics?.length) {
    const { data: immediateSuccessorSubtopic, error: immediateSubtopicError } =
      await admin
        .from("question_subtopics")
        .select("subtopic_id")
        .eq("question_id", immediateSuccessor.id)
        .limit(1)
        .single();
    if (immediateSubtopicError) throw immediateSubtopicError;
    const { error: attachImmediateError } = await admin
      .from("question_subtopics")
      .insert({
        question_id: immediateRoot.id,
        subtopic_id: immediateSuccessorSubtopic.subtopic_id,
      });
    if (attachImmediateError) throw attachImmediateError;
    insertedImmediateSubtopicId = immediateSuccessorSubtopic.subtopic_id;
    immediateRootSubtopics = [
      { subtopic_id: immediateSuccessorSubtopic.subtopic_id },
    ];
  }

  const { error: immediateSyncError } = await admin.rpc(
    "sync_published_catalog_v6",
    { payload: [immediateReplacement] },
  );
  if (immediateSyncError) throw immediateSyncError;
  const { data: immediateSubtopicsAfter, error: immediateSubtopicsAfterError } =
    await admin
      .from("question_subtopics")
      .select("subtopic_id")
      .eq("question_id", immediateRoot.id);
  if (immediateSubtopicsAfterError) throw immediateSubtopicsAfterError;
  assert(
    JSON.stringify(
      immediateSubtopicsAfter.map((row) => row.subtopic_id).sort(),
    ) ===
      JSON.stringify(
        immediateRootSubtopics.map((row) => row.subtopic_id).sort(),
      ),
    "Immediate predecessor subtopic links changed",
  );

  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("id,catalog_key,retired_at")
    .in("catalog_key", [
      replacement.catalogKey,
      replacement.replacementRootCatalogKey,
    ]);
  if (questionError) throw questionError;
  const predecessor = questionRows.find(
    (question) =>
      question.catalog_key === replacement.replacementRootCatalogKey,
  );
  const successor = questionRows.find(
    (question) => question.catalog_key === replacement.catalogKey,
  );
  assert(predecessor, "Missing retired predecessor question");
  rootQuestionId = predecessor.id;
  assert(successor, "Missing active replacement question");
  assert(predecessor.id !== successor.id, "Replacement reused predecessor ID");
  assert(predecessor.retired_at, "Predecessor is not retired");
  assert(!successor.retired_at, "Replacement is unexpectedly retired");

  let { data: rootSubtopics, error: rootSubtopicsError } = await admin
    .from("question_subtopics")
    .select("subtopic_id")
    .eq("question_id", predecessor.id);
  if (rootSubtopicsError) throw rootSubtopicsError;

  // A developer database may already have evaluated the superseded rc.4
  // candidate. Attach one existing primary subtopic temporarily so this test
  // still proves that the corrected finalizer preserves historical taxonomy.
  if (!rootSubtopics?.length) {
    const { data: successorSubtopic, error: successorSubtopicError } =
      await admin
        .from("question_subtopics")
        .select("subtopic_id")
        .eq("question_id", successor.id)
        .limit(1)
        .single();
    if (successorSubtopicError) throw successorSubtopicError;
    const { error: attachError } = await admin
      .from("question_subtopics")
      .insert({
        question_id: predecessor.id,
        subtopic_id: successorSubtopic.subtopic_id,
      });
    if (attachError) throw attachError;
    insertedRootSubtopicId = successorSubtopic.subtopic_id;
    rootSubtopics = [{ subtopic_id: successorSubtopic.subtopic_id }];
  }

  const { data: rootDetailTags, error: rootDetailTagsError } = await admin
    .from("question_detail_tags")
    .select("detail_tag_id")
    .eq("question_id", predecessor.id);
  if (rootDetailTagsError) throw rootDetailTagsError;

  const { data: oldVersion, error: versionError } = await admin
    .from("question_versions")
    .select("id,topic_id")
    .eq("question_id", predecessor.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (versionError) throw versionError;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: `replacement-${crypto.randomUUID()}@mindspan.local`,
      email_confirm: true,
      password: `Replacement-${crypto.randomUUID()}!`,
    });
  if (createError) throw createError;
  userId = created.user.id;

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
      algorithm_version: "replacement-verification",
      expires_at: new Date(now.getTime() + 30_000).toISOString(),
      prior_correct_count: 3,
      proficiency_snapshot: 0.5,
      question_version_id: oldVersion.id,
      sequence_number: 1,
      session_id: session.id,
      starting_points: 75,
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
    question_version_id: oldVersion.id,
    remaining_ratio: 0.8,
    score_snapshot: {},
    submitted_answer: "Historical answer",
    timed_out: false,
    user_id: userId,
  });
  if (attemptError) throw attemptError;

  const { error: stateError } = await admin.from("user_question_state").insert({
    attempt_count: 4,
    correct_count: 4,
    last_correct: true,
    question_id: predecessor.id,
    user_id: userId,
  });
  if (stateError) throw stateError;

  const { error: masteryError } = await admin
    .from("user_topic_mastery")
    .insert({
      correct_attempts: 1,
      lifetime_points: 75,
      tier: "developing",
      topic_id: oldVersion.topic_id,
      total_attempts: 1,
      unique_questions: 1,
      user_id: userId,
      weighted_evidence: 1,
      weighted_successes: 1,
    });
  if (masteryError) throw masteryError;

  const { error: syncError } = await admin.rpc("sync_published_catalog_v6", {
    payload: [replacement],
  });
  if (syncError) throw syncError;

  const { error: taxonomyError } = await admin.rpc(
    "finalize_normalized_taxonomy_v1",
  );
  if (taxonomyError) throw taxonomyError;

  const [
    attemptResult,
    oldStateResult,
    newStateResult,
    masteryResult,
    rootSubtopicsResult,
    rootDetailTagsResult,
    subtopicStateResult,
    subtopicMasteryResult,
  ] = await Promise.all([
    admin
      .from("attempts")
      .select("earned_points")
      .eq("user_id", userId)
      .single(),
    admin
      .from("user_question_state")
      .select("correct_count")
      .eq("user_id", userId)
      .eq("question_id", predecessor.id)
      .single(),
    admin
      .from("user_question_state")
      .select("question_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("question_id", successor.id),
    admin
      .from("user_topic_mastery")
      .select(
        "weighted_successes,weighted_evidence,unique_questions,correct_attempts,total_attempts,assisted_correct_attempts,lifetime_points,tier",
      )
      .eq("user_id", userId)
      .eq("topic_id", oldVersion.topic_id)
      .single(),
    admin
      .from("question_subtopics")
      .select("subtopic_id")
      .eq("question_id", predecessor.id),
    admin
      .from("question_detail_tags")
      .select("detail_tag_id")
      .eq("question_id", predecessor.id),
    admin
      .from("user_subtopic_question_state")
      .select("subtopic_id,question_id")
      .eq("user_id", userId)
      .eq("question_id", predecessor.id),
    admin
      .from("user_subtopic_mastery")
      .select(
        "subtopic_id,unique_questions,correct_attempts,total_attempts,assisted_correct_attempts,lifetime_points",
      )
      .eq("user_id", userId),
  ]);
  if (attemptResult.error) throw attemptResult.error;
  if (oldStateResult.error) throw oldStateResult.error;
  if (newStateResult.error) throw newStateResult.error;
  if (masteryResult.error) throw masteryResult.error;
  if (rootSubtopicsResult.error) throw rootSubtopicsResult.error;
  if (rootDetailTagsResult.error) throw rootDetailTagsResult.error;
  if (subtopicStateResult.error) throw subtopicStateResult.error;
  if (subtopicMasteryResult.error) throw subtopicMasteryResult.error;

  assert(attemptResult.data.earned_points === 75, "Historical points changed");
  assert(oldStateResult.data.correct_count === 4, "Old repeat state changed");
  assert(newStateResult.count === 0, "Replacement inherited repeat state");
  assert(
    Number(masteryResult.data.lifetime_points) === 75,
    "Lifetime points changed",
  );
  assert(
    JSON.stringify(
      rootSubtopicsResult.data.map((row) => row.subtopic_id).sort(),
    ) === JSON.stringify(rootSubtopics.map((row) => row.subtopic_id).sort()),
    "Retired root subtopic links changed",
  );
  assert(
    JSON.stringify(
      rootDetailTagsResult.data.map((row) => row.detail_tag_id).sort(),
    ) === JSON.stringify(rootDetailTags.map((row) => row.detail_tag_id).sort()),
    "Retired root detail-tag links changed",
  );
  assert(
    subtopicStateResult.data.length === rootSubtopics.length,
    "Historical subtopic question state was not rebuilt",
  );
  assert(
    subtopicMasteryResult.data.length === rootSubtopics.length &&
      subtopicMasteryResult.data.every(
        (row) =>
          row.unique_questions === 1 &&
          row.correct_attempts === 1 &&
          row.total_attempts === 1 &&
          row.assisted_correct_attempts === 0 &&
          Number(row.lifetime_points) === 75,
      ),
    "Historical subtopic mastery changed",
  );

  console.log(
    `Verified ${replacements.length} distinct replacement identities, including ${chainedReplacements.length} durable roots; historical points, topic/subtopic mastery, taxonomy, and old repeat state remain, while the replacement starts fresh.`,
  );
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
  if (insertedRootSubtopicId && rootQuestionId) {
    const { error } = await admin
      .from("question_subtopics")
      .delete()
      .eq("question_id", rootQuestionId)
      .eq("subtopic_id", insertedRootSubtopicId);
    if (error) throw error;
  }
  if (insertedImmediateSubtopicId && immediateRootQuestionId) {
    const { error } = await admin
      .from("question_subtopics")
      .delete()
      .eq("question_id", immediateRootQuestionId)
      .eq("subtopic_id", insertedImmediateSubtopicId);
    if (error) throw error;
  }
}
