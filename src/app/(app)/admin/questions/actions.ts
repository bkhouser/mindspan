"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeAnswer } from "@/domain/answers";
import { requireSysAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createQuestion(formData: FormData) {
  const { user } = await requireSysAdmin();
  const parsed = z
    .object({
      topicId: z.string().uuid(),
      packId: z.string().uuid(),
      subtopics: z.string().default(""),
      prompt: z.string().trim().min(5).max(1000),
      answer: z.string().trim().min(1),
      aliases: z.string().default(""),
      distractor1: z.string().trim().min(1),
      distractor2: z.string().trim().min(1),
      distractor3: z.string().trim().min(1),
      explanation: z.string().trim().min(10),
      details: z.string().trim().min(10),
      difficulty: z.coerce.number().int().min(1).max(5),
      timeLimit: z.coerce.number().int().min(15).max(90),
      sourceLabel: z.string().trim().min(1),
      sourceUrl: z.string().url().startsWith("https://"),
    })
    .parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const { data: question, error } = await admin
    .from("questions")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  const { data: version, error: versionError } = await admin
    .from("question_versions")
    .insert({
      question_id: question.id,
      topic_id: parsed.topicId,
      version_number: 1,
      status: "review",
      prompt: parsed.prompt,
      canonical_answer: parsed.answer,
      explanation: parsed.explanation,
      details: parsed.details,
      difficulty: parsed.difficulty,
      time_limit_seconds: parsed.timeLimit,
      remove_leading_articles: true,
      verified_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw versionError;
  const aliases = [
    parsed.answer,
    ...parsed.aliases
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  ];
  const subtopics = [
    ...new Set(
      parsed.subtopics
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  await Promise.all([
    admin.from("answer_aliases").insert(
      [...new Set(aliases)].map((answer) => ({
        question_version_id: version.id,
        answer,
        normalized_answer: normalizeAnswer(answer, {
          removeLeadingArticles: true,
        }),
      })),
    ),
    admin.from("distractors").insert(
      [parsed.distractor1, parsed.distractor2, parsed.distractor3].map(
        (answer, index) => ({
          question_version_id: version.id,
          answer,
          sort_order: index + 1,
        }),
      ),
    ),
    admin.from("question_citations").insert({
      question_version_id: version.id,
      label: parsed.sourceLabel,
      url: parsed.sourceUrl,
    }),
    admin
      .from("pack_questions")
      .insert({ pack_id: parsed.packId, question_id: question.id }),
    admin.from("admin_audit_log").insert({
      actor_user_id: user.id,
      action: "question.created",
      target_table: "question_versions",
      target_id: version.id,
      after_data: { status: "review" },
    }),
  ]);
  if (subtopics.length) {
    const { error: subtopicError } = await admin.rpc(
      "assign_question_subtopics_v1",
      {
        target_question: question.id,
        target_topic: parsed.topicId,
        subtopic_names: subtopics,
        target_admin: user.id,
      },
    );
    if (subtopicError) throw subtopicError;
  }
  revalidatePath("/admin/questions");
}

export async function publishQuestion(formData: FormData) {
  const { user } = await requireSysAdmin();
  const versionId = z.string().uuid().parse(formData.get("versionId"));
  const admin = createAdminClient();
  const [{ count: aliases }, { count: distractors }, { count: citations }] =
    await Promise.all([
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
    ]);
  if (!aliases || distractors !== 3 || !citations)
    throw new Error("Question is missing publish requirements");
  await admin
    .from("question_versions")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", versionId)
    .eq("status", "review");
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: "question.published",
    target_table: "question_versions",
    target_id: versionId,
    after_data: { status: "published" },
  });
  revalidatePath("/admin/questions");
}

export async function updateQuestionSubtopics(formData: FormData) {
  const { user } = await requireSysAdmin();
  const input = z
    .object({
      questionId: z.string().uuid(),
      topicId: z.string().uuid(),
      subtopics: z.string().default(""),
    })
    .parse(Object.fromEntries(formData));
  const subtopics = [
    ...new Set(
      input.subtopics
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const admin = createAdminClient();
  const { error } = await admin.rpc("replace_question_subtopics_v1", {
    target_question: input.questionId,
    target_topic: input.topicId,
    subtopic_names: subtopics,
    target_admin: user.id,
  });
  if (error) throw error;
  await admin.from("admin_audit_log").insert({
    actor_user_id: user.id,
    action: "question.subtopics_changed",
    target_table: "questions",
    target_id: input.questionId,
    after_data: { subtopics },
  });
  revalidatePath("/admin/questions");
}
