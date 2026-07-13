import { NextResponse } from "next/server";
import { questionBatchSchema } from "@/domain/content";
import { ApiError, apiContext, errorResponse } from "@/lib/api";
import type { Json } from "@/types/database.generated";

export async function POST(request: Request) {
  try {
    const { user, profile, admin } = await apiContext(); if (profile.role !== "sys_admin") throw new ApiError("ADMIN_REQUIRED", 403);
    const input = await request.json(); const parsed = questionBatchSchema.safeParse(input.questions);
    if (!parsed.success) return NextResponse.json({ valid: false, issues: parsed.error.issues }, { status: 422 });
    const batchKeys = new Set<string>(); const duplicates: string[] = [];
    for (const question of parsed.data) {
      const key = `${question.topicSlug}|${question.prompt.trim().toLocaleLowerCase()}|${question.canonicalAnswer.trim().toLocaleLowerCase()}`;
      if (batchKeys.has(key)) duplicates.push(question.prompt); else batchKeys.add(key);
    }
    const [{ data: topics }, { data: packs }, { data: existing }] = await Promise.all([
      admin.from("topics").select("slug"), admin.from("packs").select("slug"),
      admin.from("question_versions").select("prompt,canonical_answer,topics(slug)").in("status", ["draft", "review", "published"]),
    ]);
    const topicSlugs = new Set(topics?.map((topic) => topic.slug)); const packSlugs = new Set(packs?.map((pack) => pack.slug));
    const missingTopics = [...new Set(parsed.data.map((question) => question.topicSlug).filter((slug) => !topicSlugs.has(slug)))];
    const missingPacks = [...new Set(parsed.data.flatMap((question) => question.packSlugs).filter((slug) => !packSlugs.has(slug)))];
    const existingKeys = new Set((existing ?? []).map((question) => { const topic = Array.isArray(question.topics) ? question.topics[0] : question.topics; return `${topic?.slug}|${question.prompt.trim().toLocaleLowerCase()}|${question.canonical_answer.trim().toLocaleLowerCase()}`; }));
    for (const question of parsed.data) if (existingKeys.has(`${question.topicSlug}|${question.prompt.trim().toLocaleLowerCase()}|${question.canonicalAnswer.trim().toLocaleLowerCase()}`)) duplicates.push(question.prompt);
    const valid = !duplicates.length && !missingTopics.length && !missingPacks.length;
    if (input.dryRun !== false) return NextResponse.json({ valid, count: parsed.data.length, duplicates, missingTopics, missingPacks });
    if (!valid) return NextResponse.json({ error: { code: "IMPORT_CONFLICT", message: "Resolve duplicate or unknown catalog references before importing." }, duplicates, missingTopics, missingPacks }, { status: 409 });
    const { data, error } = await admin.rpc("import_question_batch_v1", { payload: parsed.data as unknown as Json, target_admin: user.id });
    if (error) throw error;
    return NextResponse.json({ imported: data?.length ?? 0, questions: data }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
