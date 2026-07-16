import { NextResponse } from "next/server";
import { canReviewQuestions } from "@/domain/authorization";
import { ApiError, apiContext, errorResponse } from "@/lib/api";
import { fetchAllPages } from "@/lib/supabase-pagination";

export async function GET() {
  try {
    const { admin, profile } = await apiContext();
    if (!canReviewQuestions(profile.role))
      throw new ApiError("QUESTION_REVIEWER_REQUIRED", 403);

    const [versions, feedback, reviews, reports] = await Promise.all([
      fetchAllPages((from, to) =>
        admin
          .from("question_versions")
          .select(
            "id,question_id,version_number,prompt,canonical_answer,answer_mode,explanation,details,difficulty,time_limit_seconds,remove_leading_articles,verified_at,expires_at,topic:topics(slug,name),answer_aliases(answer),distractors(answer,sort_order),question_citations(label,url,sort_order),questions(catalog_key,pack_questions(packs(slug,name)),question_subtopics(subtopics(name)))",
          )
          .eq("status", "published")
          .order("question_id")
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        admin
          .from("question_feedback")
          .select(
            "question_version_id,sentiment,reasons,comment,answer_correct,assisted,timed_out,created_at,updated_at",
          )
          .order("updated_at", { ascending: false })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        admin
          .from("question_editorial_reviews")
          .select(
            "question_version_id,verdict,notes,player_feedback_reviewed_at,created_at,updated_at",
          )
          .order("updated_at", { ascending: false })
          .range(from, to),
      ),
      fetchAllPages((from, to) =>
        admin
          .from("question_reports")
          .select(
            "question_version_id,category,details,status,created_at,resolved_at",
          )
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
    ]);
    const reviewByVersion = new Map(
      reviews.map((review) => [review.question_version_id, review]),
    );
    const feedbackByVersion = new Map<string, typeof feedback>();
    for (const item of feedback) {
      const rows = feedbackByVersion.get(item.question_version_id) ?? [];
      rows.push(item);
      feedbackByVersion.set(item.question_version_id, rows);
    }
    const reportsByVersion = new Map<string, typeof reports>();
    for (const report of reports) {
      const rows = reportsByVersion.get(report.question_version_id) ?? [];
      rows.push(report);
      reportsByVersion.set(report.question_version_id, rows);
    }
    const hasUnresolvedPlayerFlag = (versionId: string) => {
      const review = reviewByVersion.get(versionId);
      const reviewedAt = review?.player_feedback_reviewed_at
        ? new Date(review.player_feedback_reviewed_at).getTime()
        : 0;
      const newDownVote = (feedbackByVersion.get(versionId) ?? []).some(
        (item) =>
          item.sentiment === "down" &&
          new Date(item.updated_at).getTime() > reviewedAt,
      );
      const openReport = (reportsByVersion.get(versionId) ?? []).some(
        (report) => report.status === "open",
      );
      return newDownVote || openReport;
    };
    const actionableVersions = versions.filter((version) => {
      const review = reviewByVersion.get(version.id);
      return (
        review?.verdict === "needs_revision" ||
        hasUnresolvedPlayerFlag(version.id)
      );
    });
    const exportedAt = new Date();
    const payload = {
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      selection: {
        needsRevision: true,
        unresolvedPlayerFlags: true,
      },
      instructions:
        "This export contains only questions marked needs revision or carrying unresolved player feedback. Use catalogKey to update content/catalog. Editorial decisions apply only to the exported immutable versionId.",
      questions: actionableVersions.map((version) => ({
        ...version,
        editorialReview: reviewByVersion.get(version.id) ?? null,
        playerFeedback: feedbackByVersion.get(version.id) ?? [],
        formalReports: reportsByVersion.get(version.id) ?? [],
      })),
    };
    const date = exportedAt.toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="mindspan-question-quality-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
