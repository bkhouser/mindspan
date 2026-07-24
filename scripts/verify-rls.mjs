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
const createdUsers = [];
let groupId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createUser(label) {
  const emailLabel = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const email = `rls-${emailLabel}-${crypto.randomUUID()}@mindspan.local`;
  const password = `Test-${crypto.randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  await admin
    .from("profiles")
    .update({
      display_name: label,
      beta_access_granted_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);
  const client = createClient(
    values.NEXT_PUBLIC_SUPABASE_URL,
    values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

try {
  const owner = await createUser("Owner");
  const member = await createUser("Member");
  const outsider = await createUser("Outsider");
  const questionReviewer = await createUser("Question Reviewer");
  const systemAdmin = await createUser("System Admin");
  await admin
    .from("profiles")
    .update({ role: "sys_admin" })
    .eq("id", systemAdmin.id);
  const { error: reviewerRoleError } = await systemAdmin.client.rpc(
    "set_user_role_v1",
    {
      p_role: "question_reviewer",
      p_user_id: questionReviewer.id,
    },
  );
  assert(
    !reviewerRoleError,
    `a system admin must be able to assign the reviewer role${reviewerRoleError ? `: ${reviewerRoleError.message}` : ""}`,
  );
  const { data: roleAudit, error: roleAuditError } = await admin
    .from("admin_audit_log")
    .select("id")
    .eq("actor_user_id", systemAdmin.id)
    .eq("action", "user.role_changed")
    .eq("target_id", questionReviewer.id);
  assert(
    !roleAuditError && roleAudit?.length === 1,
    "a global role change must create its audit record transactionally",
  );
  const { error: unauthorizedRoleError } = await owner.client.rpc(
    "set_user_role_v1",
    {
      p_role: "question_reviewer",
      p_user_id: outsider.id,
    },
  );
  assert(
    Boolean(unauthorizedRoleError),
    "a normal player must not assign global roles",
  );

  const { error: suspendAccessError } = await systemAdmin.client.rpc(
    "set_user_access_v1",
    {
      p_disabled: true,
      p_reason: "RLS support-action verification",
      p_user_id: member.id,
    },
  );
  assert(
    !suspendAccessError,
    `a system admin must be able to suspend an account${suspendAccessError ? `: ${suspendAccessError.message}` : ""}`,
  );
  const { data: suspendedMember } = await admin
    .from("profiles")
    .select("disabled_at")
    .eq("id", member.id)
    .single();
  assert(
    Boolean(suspendedMember?.disabled_at),
    "suspending an account must set disabled_at",
  );
  const { data: accessAudit } = await admin
    .from("admin_audit_log")
    .select("id")
    .eq("actor_user_id", systemAdmin.id)
    .eq("action", "user.access_suspended")
    .eq("target_id", member.id);
  assert(
    accessAudit?.length === 1,
    "suspending an account must create an immutable audit record",
  );
  const { error: restoreAccessError } = await systemAdmin.client.rpc(
    "set_user_access_v1",
    {
      p_disabled: false,
      p_reason: "RLS support-action cleanup",
      p_user_id: member.id,
    },
  );
  assert(
    !restoreAccessError,
    `a system admin must be able to restore an account${restoreAccessError ? `: ${restoreAccessError.message}` : ""}`,
  );
  const { error: unauthorizedAccessError } = await owner.client.rpc(
    "set_user_access_v1",
    {
      p_disabled: true,
      p_reason: "Unauthorized attempt",
      p_user_id: outsider.id,
    },
  );
  assert(
    Boolean(unauthorizedAccessError),
    "a normal player must not change another account's access",
  );

  const { data: group, error: groupError } = await admin
    .from("groups")
    .insert({ name: "RLS verification group", created_by: owner.id })
    .select("id")
    .single();
  if (groupError) throw groupError;
  groupId = group.id;
  const { error: membershipError } = await admin
    .from("group_memberships")
    .insert([
      { group_id: groupId, user_id: owner.id, role: "admin" },
      { group_id: groupId, user_id: member.id, role: "member" },
    ]);
  if (membershipError) throw membershipError;

  const { data: shared } = await owner.client
    .from("profiles")
    .select("id")
    .eq("id", member.id);
  assert(
    shared?.length === 1,
    "a group member must see a shared aggregate profile",
  );
  const { data: hidden } = await outsider.client
    .from("profiles")
    .select("id")
    .eq("id", member.id);
  assert(hidden?.length === 0, "an outsider must not see another profile");

  const { data: visibleGroup } = await member.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(visibleGroup?.length === 1, "a member must see their group");
  const { data: hiddenGroup } = await outsider.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(hiddenGroup?.length === 0, "an outsider must not see a private group");
  const { data: globalProfiles } = await systemAdmin.client
    .from("profiles")
    .select("id")
    .in("id", [owner.id, member.id, outsider.id]);
  assert(
    globalProfiles?.length === 3,
    "a system admin must have global operational visibility",
  );
  const { data: reviewerProfiles } = await questionReviewer.client
    .from("profiles")
    .select("id")
    .in("id", [owner.id, member.id, outsider.id]);
  assert(
    reviewerProfiles?.length === 0,
    "a question reviewer must not gain user-administration visibility",
  );

  const { data: qualityVersion, error: qualityVersionError } = await admin
    .from("question_versions")
    .select("id,question_id,topic_id,difficulty")
    .eq("status", "published")
    .limit(1)
    .single();
  if (qualityVersionError) throw qualityVersionError;
  const { error: memberQualitySummaryError } = await member.client.rpc(
    "question_quality_pack_summary_v1",
  );
  assert(
    Boolean(memberQualitySummaryError),
    "a normal player must not read the editorial quality summary",
  );
  const { data: reviewerQualitySummary, error: reviewerQualitySummaryError } =
    await questionReviewer.client.rpc("question_quality_pack_summary_v1");
  assert(
    !reviewerQualitySummaryError && (reviewerQualitySummary?.length ?? 0) > 0,
    "a question reviewer must see pack editorial progress",
  );
  const { data: adminQualitySummary, error: adminQualitySummaryError } =
    await systemAdmin.client.rpc("question_quality_pack_summary_v1");
  assert(
    !adminQualitySummaryError && (adminQualitySummary?.length ?? 0) > 0,
    "a system admin must see pack editorial progress",
  );
  const { error: memberAnswerSummaryError } = await member.client.rpc(
    "question_quality_answer_summary_v1",
    { p_question_version_id: qualityVersion.id },
  );
  assert(
    Boolean(memberAnswerSummaryError),
    "a normal player must not read aggregated answers from other players",
  );
  const { error: reviewerAnswerSummaryError } =
    await questionReviewer.client.rpc(
      "question_quality_answer_summary_v1",
      { p_question_version_id: qualityVersion.id },
    );
  assert(
    !reviewerAnswerSummaryError,
    "a question reviewer must be able to read privacy-safe answer aggregates",
  );
  const { error: adminAnswerSummaryError } = await systemAdmin.client.rpc(
    "question_quality_answer_summary_v1",
    { p_question_version_id: qualityVersion.id },
  );
  assert(
    !adminAnswerSummaryError,
    "a system admin must be able to read privacy-safe answer aggregates",
  );
  const qualityPackId = reviewerQualitySummary[0].pack_id;
  const { error: memberPackAttemptSummaryError } = await member.client.rpc(
    "question_quality_pack_attempt_summary_v1",
    { p_pack_id: qualityPackId },
  );
  assert(
    Boolean(memberPackAttemptSummaryError),
    "a normal player must not read pack-level attempt aggregates",
  );
  const { error: reviewerPackAttemptSummaryError } =
    await questionReviewer.client.rpc(
      "question_quality_pack_attempt_summary_v1",
      { p_pack_id: qualityPackId },
    );
  assert(
    !reviewerPackAttemptSummaryError,
    "a question reviewer must be able to read pack-level attempt aggregates",
  );
  const { error: adminPackAttemptSummaryError } =
    await systemAdmin.client.rpc(
      "question_quality_pack_attempt_summary_v1",
      { p_pack_id: qualityPackId },
    );
  assert(
    !adminPackAttemptSummaryError,
    "a system admin must be able to read pack-level attempt aggregates",
  );
  const { data: hiddenDetailTags, error: hiddenDetailTagsError } =
    await member.client.from("detail_tags").select("id").limit(1);
  assert(
    !hiddenDetailTagsError && hiddenDetailTags?.length === 0,
    "a normal player must not see reviewer-only detail tags",
  );
  const { data: hiddenQuestionDetailTags, error: hiddenQuestionDetailTagsError } =
    await member.client
      .from("question_detail_tags")
      .select("detail_tag_id")
      .eq("question_id", qualityVersion.question_id);
  assert(
    !hiddenQuestionDetailTagsError && hiddenQuestionDetailTags?.length === 0,
    "a normal player must not see reviewer-only question detail classifications",
  );
  const { data: visibleDetailTags, error: visibleDetailTagsError } =
    await questionReviewer.client.from("detail_tags").select("id").limit(1);
  assert(
    !visibleDetailTagsError && (visibleDetailTags?.length ?? 0) === 1,
    "a question reviewer must see detail tags",
  );
  const { error: directFeedbackError } = await member.client
    .from("question_feedback")
    .insert({
      question_version_id: qualityVersion.id,
      user_id: member.id,
      attempt_id: crypto.randomUUID(),
      sentiment: "up",
      answer_correct: true,
      assisted: false,
      timed_out: false,
    });
  assert(
    Boolean(directFeedbackError),
    "question feedback writes must go through the validated server endpoint",
  );

  const { data: creditSession, error: creditSessionError } = await admin
    .from("play_sessions")
    .insert({ user_id: member.id, mode: "mixed" })
    .select("id")
    .single();
  if (creditSessionError) throw creditSessionError;
  const now = new Date();
  const { data: creditPresentation, error: creditPresentationError } =
    await admin
      .from("question_presentations")
      .insert({
        session_id: creditSession.id,
        user_id: member.id,
        question_version_id: qualityVersion.id,
        activated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 30_000).toISOString(),
        starting_points: 320,
        proficiency_snapshot: 0.5,
        prior_correct_count: 0,
        algorithm_version: "mindspan-score-v1",
        sequence_number: 1,
        timer_limit_seconds: 30,
        scoring_timer_seconds: 30,
      })
      .select("id")
      .single();
  if (creditPresentationError) throw creditPresentationError;
  const creditSnapshot = {
    algorithmVersion: "mindspan-score-v1",
    correct: false,
    assisted: false,
    earnedPoints: 0,
    startingPoints: 320,
    timeFactor: 0.625,
    masteryEvidenceDelta: 1,
    masterySuccessDelta: 0,
    masteryUniqueDelta: 1,
  };
  const { data: creditAttemptId, error: creditAttemptError } = await admin.rpc(
    "finalize_attempt_v1",
    {
      target_presentation: creditPresentation.id,
      target_user: member.id,
      target_question: qualityVersion.question_id,
      target_topic: qualityVersion.topic_id,
      submitted: "A valid missing alias",
      was_correct: false,
      was_assisted: false,
      was_timeout: false,
      elapsed: 15_000,
      remaining: 0.5,
      points: 0,
      snapshot: creditSnapshot,
      request_key: crypto.randomUUID(),
      success_delta: 0,
      evidence_delta: 1,
      unique_delta: 1,
      new_correct_count: 0,
      next_review: now.toISOString(),
      new_tier: "unrated",
    },
  );
  if (creditAttemptError) throw creditAttemptError;
  const { data: acceptanceFeedback, error: acceptanceFeedbackError } =
    await admin
      .from("question_feedback")
      .insert({
        question_version_id: qualityVersion.id,
        user_id: member.id,
        attempt_id: creditAttemptId,
        sentiment: "down",
        reasons: ["should_have_been_accepted"],
        comment: "This response should receive credit.",
        answer_correct: false,
        assisted: false,
        timed_out: false,
      })
      .select("id")
      .single();
  if (acceptanceFeedbackError) throw acceptanceFeedbackError;
  const { error: unauthorizedCreditError } = await member.client.rpc(
    "award_reviewed_answer_credit_for_reviewer_v1",
    { p_question_feedback_id: acceptanceFeedback.id },
  );
  assert(
    Boolean(unauthorizedCreditError),
    "a normal player must not award answer credit",
  );
  const { data: awardedCredit, error: awardedCreditError } =
    await questionReviewer.client.rpc(
      "award_reviewed_answer_credit_for_reviewer_v1",
      { p_question_feedback_id: acceptanceFeedback.id },
    );
  assert(
    !awardedCreditError &&
      awardedCredit?.[0]?.result_corrected === true &&
      awardedCredit[0].result_points_awarded === 200,
    `a reviewer must award the recorded attempt value exactly once${awardedCreditError ? `: ${awardedCreditError.message}` : ""}`,
  );
  const { data: repeatedCredit, error: repeatedCreditError } =
    await questionReviewer.client.rpc(
      "award_reviewed_answer_credit_for_reviewer_v1",
      { p_question_feedback_id: acceptanceFeedback.id },
    );
  assert(
    !repeatedCreditError &&
      repeatedCredit?.[0]?.result_corrected === false &&
      repeatedCredit[0].result_points_awarded === 200,
    "repeating an answer-credit action must be idempotent",
  );
  const [
    { data: correctedAttempt },
    { data: correctedQuestionState },
    { data: correctedTopicMastery },
    { data: correctedSubtopicMastery },
    { data: correctionRows },
    { data: correctionReview },
    { data: correctionAudit },
  ] = await Promise.all([
    admin
      .from("attempts")
      .select("correct,earned_points,score_snapshot")
      .eq("id", creditAttemptId)
      .single(),
    admin
      .from("user_question_state")
      .select("attempt_count,correct_count,last_correct")
      .eq("user_id", member.id)
      .eq("question_id", qualityVersion.question_id)
      .single(),
    admin
      .from("user_topic_mastery")
      .select(
        "weighted_successes,weighted_evidence,correct_attempts,total_attempts,lifetime_points",
      )
      .eq("user_id", member.id)
      .eq("topic_id", qualityVersion.topic_id)
      .single(),
    admin
      .from("user_subtopic_mastery")
      .select(
        "weighted_successes,weighted_evidence,correct_attempts,total_attempts,lifetime_points",
      )
      .eq("user_id", member.id),
    admin
      .from("attempt_credit_corrections")
      .select("points_awarded,mastery_success_delta")
      .eq("attempt_id", creditAttemptId),
    admin
      .from("question_editorial_reviews")
      .select("verdict,notes,player_feedback_reviewed_at")
      .eq("question_version_id", qualityVersion.id)
      .single(),
    admin
      .from("admin_audit_log")
      .select("id")
      .eq("actor_user_id", questionReviewer.id)
      .eq("action", "question.answer_credit_awarded")
      .eq("target_id", creditAttemptId),
  ]);
  assert(
    correctedAttempt?.correct && correctedAttempt.earned_points === 200,
    "the corrected attempt must become correct and receive its original timed value",
  );
  assert(
    correctedQuestionState?.attempt_count === 1 &&
      correctedQuestionState.correct_count === 1 &&
      correctedQuestionState.last_correct === true,
    "question state must gain one correct answer without another attempt",
  );
  assert(
    correctedTopicMastery?.total_attempts === 1 &&
      correctedTopicMastery.correct_attempts === 1 &&
      correctedTopicMastery.lifetime_points === 200 &&
      Number(correctedTopicMastery.weighted_evidence) === 1 &&
      Number(correctedTopicMastery.weighted_successes) === 0.95,
    "topic mastery must add only the missing success and points deltas",
  );
  assert(
    (correctedSubtopicMastery?.length ?? 0) > 0 &&
      correctedSubtopicMastery.every(
        (row) =>
          row.total_attempts === 1 &&
          row.correct_attempts === 1 &&
          row.lifetime_points === 200 &&
          Number(row.weighted_evidence) === 1 &&
          Number(row.weighted_successes) === 0.95,
      ),
    "subtopic mastery must receive the same missing deltas",
  );
  assert(
    correctionRows?.length === 1 &&
      correctionRows[0].points_awarded === 200 &&
      Number(correctionRows[0].mastery_success_delta) === 0.95,
    "the correction must have one immutable accounting record",
  );
  assert(
    correctionReview?.verdict === "needs_revision" &&
      Boolean(correctionReview.player_feedback_reviewed_at) &&
      correctionReview.notes?.includes("A valid missing alias"),
    "awarding credit must mark the question for an accepted-answer revision",
  );
  assert(
    correctionAudit?.length === 1,
    "awarding answer credit must create one admin audit record",
  );
  const { data: ownCorrection } = await member.client
    .from("attempt_credit_corrections")
    .select("attempt_id")
    .eq("attempt_id", creditAttemptId);
  const { data: hiddenCorrection } = await outsider.client
    .from("attempt_credit_corrections")
    .select("attempt_id")
    .eq("attempt_id", creditAttemptId);
  assert(
    ownCorrection?.length === 1 && hiddenCorrection?.length === 0,
    "players may see only their own awarded-credit record",
  );

  const { error: memberEditorialError } = await member.client.rpc(
    "save_question_editorial_review_v1",
    {
      p_notes: "This unauthorized review must not be saved.",
      p_question_version_id: qualityVersion.id,
      p_verdict: "rejected",
    },
  );
  assert(
    Boolean(memberEditorialError),
    "a normal player must not record an editorial review",
  );
  const { error: editorialSaveError } = await questionReviewer.client.rpc(
    "save_question_editorial_review_v1",
    {
      p_notes: "RLS verification review.",
      p_question_version_id: qualityVersion.id,
      p_verdict: "approved",
    },
  );
  assert(
    !editorialSaveError,
    `a question reviewer must be able to save an audited decision${editorialSaveError ? `: ${editorialSaveError.message}` : ""}`,
  );
  const { data: editorialAudit, error: editorialAuditError } = await admin
    .from("admin_audit_log")
    .select("id")
    .eq("actor_user_id", questionReviewer.id)
    .eq("action", "question.editorial_approved")
    .eq("target_id", qualityVersion.id);
  assert(
    !editorialAuditError && editorialAudit?.length === 1,
    "a reviewer decision must create its audit record transactionally",
  );
  const { data: hiddenEditorial } = await member.client
    .from("question_editorial_reviews")
    .select("question_version_id")
    .eq("question_version_id", qualityVersion.id);
  assert(
    hiddenEditorial?.length === 0,
    "a normal player must not see editorial decisions",
  );
  const { data: visibleEditorial } = await systemAdmin.client
    .from("question_editorial_reviews")
    .select("question_version_id")
    .eq("question_version_id", qualityVersion.id);
  assert(
    visibleEditorial?.length === 1,
    "a system admin must see editorial decisions",
  );
  const { data: hiddenReviewerEditorial } = await questionReviewer.client
    .from("question_editorial_reviews")
    .select("question_version_id")
    .eq("question_version_id", qualityVersion.id);
  assert(
    hiddenReviewerEditorial?.length === 0,
    "a question reviewer must receive editorial data only through trusted review pages",
  );
  const { data: reviewerDirectUpdate, error: reviewerDirectUpdateError } =
    await questionReviewer.client
      .from("question_editorial_reviews")
      .update({ verdict: "rejected" })
      .eq("question_version_id", qualityVersion.id)
      .select("question_version_id");
  assert(
    Boolean(reviewerDirectUpdateError) || reviewerDirectUpdate?.length === 0,
    "a reviewer must record decisions through the audited server action",
  );
  await admin
    .from("question_editorial_reviews")
    .delete()
    .eq("question_version_id", qualityVersion.id);

  await admin
    .from("profiles")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", questionReviewer.id);
  const { error: disabledReviewerError } = await questionReviewer.client.rpc(
    "question_quality_pack_summary_v1",
  );
  assert(
    Boolean(disabledReviewerError),
    "a disabled question reviewer must immediately lose review access",
  );
  await admin
    .from("profiles")
    .update({ disabled_at: null, role: "user" })
    .eq("id", questionReviewer.id);
  const { error: revokedReviewerError } = await questionReviewer.client.rpc(
    "question_quality_pack_summary_v1",
  );
  assert(
    Boolean(revokedReviewerError),
    "a revoked question reviewer must immediately lose review access",
  );

  const { data: feedback, error: feedbackError } = await member.client
    .from("feedback_reports")
    .insert({
      reporter_user_id: member.id,
      category: "bug",
      impact: "annoying",
      description: "The feedback RLS verification report.",
      page_path: "/play",
    })
    .select("id")
    .single();
  assert(
    !feedbackError && Boolean(feedback),
    `an active player must be able to submit feedback${feedbackError ? `: ${feedbackError.message}` : ""}`,
  );
  const { data: hiddenFeedback } = await outsider.client
    .from("feedback_reports")
    .select("id")
    .eq("id", feedback.id);
  assert(
    hiddenFeedback?.length === 0,
    "another player must not see private feedback",
  );
  const { data: spoofedFeedback, error: spoofedFeedbackError } =
    await member.client
      .from("feedback_reports")
      .insert({
        reporter_user_id: owner.id,
        category: "other",
        impact: "minor",
        description: "This reporter identity must be rejected.",
        page_path: "/home",
      })
      .select("id");
  assert(
    Boolean(spoofedFeedbackError) || spoofedFeedback?.length === 0,
    "a player must not submit feedback as another user",
  );
  const { data: adminFeedback } = await systemAdmin.client
    .from("feedback_reports")
    .update({ status: "reviewing" })
    .eq("id", feedback.id)
    .select("id,status");
  assert(
    adminFeedback?.[0]?.status === "reviewing",
    "a system admin must be able to review feedback",
  );
  const { data: memberFeedbackUpdate, error: memberFeedbackUpdateError } =
    await member.client
      .from("feedback_reports")
      .update({ status: "resolved" })
      .eq("id", feedback.id)
      .select("id");
  assert(
    Boolean(memberFeedbackUpdateError) || memberFeedbackUpdate?.length === 0,
    "a normal player must not change feedback status",
  );

  const { data: settings } = await member.client
    .from("system_settings")
    .select("default_timer_seconds")
    .eq("id", true)
    .single();
  assert(
    settings?.default_timer_seconds >= 10,
    "an active player must see the global timer setting",
  );
  const { data: memberSettingsUpdate, error: memberSettingsError } =
    await member.client
      .from("system_settings")
      .update({ default_timer_seconds: 45 })
      .eq("id", true)
      .select("id");
  assert(
    Boolean(memberSettingsError) || memberSettingsUpdate?.length === 0,
    "a normal player must not change the global timer",
  );
  const { data: memberMaintenanceUpdate, error: memberMaintenanceError } =
    await member.client
      .from("system_settings")
      .update({ maintenance_mode: true })
      .eq("id", true)
      .select("id");
  assert(
    Boolean(memberMaintenanceError) || memberMaintenanceUpdate?.length === 0,
    "a normal player must not begin an update drain",
  );
  const { error: maintenanceStartError } = await systemAdmin.client
    .from("system_settings")
    .update({
      maintenance_mode: true,
      maintenance_started_at: new Date().toISOString(),
      maintenance_message: "RLS verification drain",
    })
    .eq("id", true);
  assert(
    !maintenanceStartError,
    "a system admin must be able to begin an update drain",
  );
  const { error: maintenanceEndError } = await systemAdmin.client
    .from("system_settings")
    .update({
      maintenance_mode: false,
      maintenance_started_at: null,
      maintenance_message: null,
    })
    .eq("id", true);
  assert(
    !maintenanceEndError,
    "a system admin must be able to end an update drain",
  );

  const { data: memberSession, error: memberSessionError } = await member.client
    .from("play_sessions")
    .insert({ user_id: member.id, mode: "mixed", group_id: groupId })
    .select("id")
    .single();
  assert(
    !memberSessionError && Boolean(memberSession),
    "a group member must be able to start group-scoped play",
  );
  const { data: outsiderSession, error: outsiderSessionError } =
    await outsider.client
      .from("play_sessions")
      .insert({ user_id: outsider.id, mode: "mixed", group_id: groupId })
      .select("id");
  assert(
    Boolean(outsiderSessionError) || outsiderSession?.length === 0,
    "an outsider must not start play under a private group's rules",
  );

  const { data: memberUpdate, error: memberUpdateError } = await member.client
    .from("groups")
    .update({ name: "Unauthorized edit" })
    .eq("id", groupId)
    .select("id");
  assert(
    Boolean(memberUpdateError) || memberUpdate?.length === 0,
    "a normal member must not edit group identity",
  );
  const { data: ownerUpdate, error: ownerUpdateError } = await owner.client
    .from("groups")
    .update({ description: "Authorized edit" })
    .eq("id", groupId)
    .select("id");
  assert(
    !ownerUpdateError && ownerUpdate?.length === 1,
    "a group admin must be able to edit group identity",
  );
  const { data: timerUpdate, error: timerUpdateError } = await owner.client
    .from("groups")
    .update({ timer_seconds_override: 45 })
    .eq("id", groupId)
    .select("timer_seconds_override");
  assert(
    !timerUpdateError && timerUpdate?.[0]?.timer_seconds_override === 45,
    "a group admin must be able to set the group timer override",
  );

  const { error: roleEscalationError } = await owner.client
    .from("profiles")
    .update({ role: "sys_admin" })
    .eq("id", owner.id);
  assert(
    Boolean(roleEscalationError),
    "a user must not promote their global role",
  );
  const { error: finalAdminError } = await owner.client
    .from("group_memberships")
    .update({ role: "member" })
    .eq("group_id", groupId)
    .eq("user_id", owner.id);
  assert(Boolean(finalAdminError), "the final group admin must not be demoted");

  await admin
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", member.id);
  const { data: formerMemberGroup } = await member.client
    .from("groups")
    .select("id")
    .eq("id", groupId);
  assert(
    formerMemberGroup?.length === 0,
    "a former member must immediately lose group visibility",
  );
  await admin
    .from("profiles")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", outsider.id);
  const { data: disabledTopics } = await outsider.client
    .from("topics")
    .select("id");
  assert(
    disabledTopics?.length === 0,
    "a disabled account token must not retain catalog access",
  );

  console.log(
    "RLS personas: owner, member, outsider, question reviewer, former member, disabled user, and system admin passed",
  );
  console.log(
    "Role escalation, immediate revocation, and final-admin protection passed",
  );
  console.log(
    "Question feedback write isolation and reviewer editorial boundaries passed",
  );
} finally {
  if (groupId) {
    const { error } = await admin.from("groups").delete().eq("id", groupId);
    if (error) throw error;
  }
  if (createdUsers.length) {
    const { error } = await admin
      .from("admin_audit_log")
      .delete()
      .in("actor_user_id", createdUsers);
    if (error) throw error;
  }
  for (const id of createdUsers.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
}
