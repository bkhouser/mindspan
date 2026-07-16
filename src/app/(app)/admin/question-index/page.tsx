import { ArrowRight, Download, Flag, ListChecks } from "lucide-react";
import Link from "next/link";
import { DifficultyStars } from "@/components/difficulty-stars";
import { Card } from "@/components/ui/card";
import { requireQuestionReviewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function related<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function comparableAnswer(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

const verdictLabels: Record<string, string> = {
  approved: "Approved",
  needs_revision: "Needs revision",
  rejected: "Rejected",
};

const verdictClasses: Record<string, string> = {
  approved: "bg-emerald-300/10 text-emerald-100",
  needs_revision: "bg-amber-200/10 text-amber-100",
  rejected: "bg-rose-300/10 text-rose-100",
  unreviewed: "bg-white/5 text-[var(--muted)]",
};

export default async function QuestionIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { supabase: authClient } = await requireQuestionReviewer();
  const query = await searchParams;
  const { data: packSummaries, error: summaryError } = await authClient.rpc(
    "question_quality_pack_summary_v1",
  );
  if (summaryError) throw summaryError;
  const selectedPack =
    packSummaries?.find((pack) => pack.pack_id === query.pack) ??
    packSummaries?.find((pack) => pack.total_questions > 0);

  if (!selectedPack) {
    return (
      <Card className="p-8">
        <h1 className="text-3xl font-black">Question index</h1>
        <p className="mt-3 text-[var(--muted)]">
          No published question packs are available.
        </p>
      </Card>
    );
  }

  const admin = createAdminClient();
  const { data: packQuestionRows, error: packQuestionError } = await admin
    .from("pack_questions")
    .select("question_id,sort_order,questions(catalog_key)")
    .eq("pack_id", selectedPack.pack_id)
    .order("sort_order");
  if (packQuestionError) throw packQuestionError;
  const questionIds = packQuestionRows?.map((row) => row.question_id) ?? [];
  const { data: versionRows, error: versionError } = questionIds.length
    ? await admin
        .from("question_versions")
        .select(
          "id,question_id,version_number,prompt,canonical_answer,answer_mode,difficulty,topic:topics(name),answer_aliases(answer),questions(question_subtopics(subtopics(name)))",
        )
        .eq("status", "published")
        .in("question_id", questionIds)
    : { data: [], error: null };
  if (versionError) throw versionError;
  const versionIds = versionRows?.map((version) => version.id) ?? [];
  const [
    { data: reviewRows, error: reviewError },
    { data: feedbackRows, error: feedbackError },
    { data: reportRows, error: reportError },
    { data: attemptRows, error: attemptError },
  ] = versionIds.length
    ? await Promise.all([
        admin
          .from("question_editorial_reviews")
          .select(
            "question_version_id,verdict,player_feedback_reviewed_at,updated_at",
          )
          .in("question_version_id", versionIds),
        admin
          .from("question_feedback")
          .select("question_version_id,updated_at")
          .eq("sentiment", "down")
          .in("question_version_id", versionIds),
        admin
          .from("question_reports")
          .select("question_version_id")
          .eq("status", "open")
          .in("question_version_id", versionIds),
        authClient.rpc("question_quality_pack_attempt_summary_v1", {
          p_pack_id: selectedPack.pack_id,
        }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (reviewError) throw reviewError;
  if (feedbackError) throw feedbackError;
  if (reportError) throw reportError;
  if (attemptError) throw attemptError;

  const versionsByQuestion = new Map(
    versionRows?.map((version) => [version.question_id, version]),
  );
  const reviewsByVersion = new Map(
    reviewRows?.map((review) => [review.question_version_id, review]),
  );
  const feedbackByVersion = new Map<string, string[]>();
  for (const feedback of feedbackRows ?? []) {
    const timestamps =
      feedbackByVersion.get(feedback.question_version_id) ?? [];
    timestamps.push(feedback.updated_at);
    feedbackByVersion.set(feedback.question_version_id, timestamps);
  }
  const reportCountByVersion = new Map<string, number>();
  for (const report of reportRows ?? [])
    reportCountByVersion.set(
      report.question_version_id,
      (reportCountByVersion.get(report.question_version_id) ?? 0) + 1,
    );
  const attemptsByVersion = new Map(
    attemptRows?.map((attempt) => [attempt.question_version_id, attempt]),
  );

  const rows = (packQuestionRows ?? []).flatMap((link, index) => {
    const version = versionsByQuestion.get(link.question_id);
    if (!version) return [];
    const review = reviewsByVersion.get(version.id);
    const reviewedAt = review?.player_feedback_reviewed_at
      ? new Date(review.player_feedback_reviewed_at).getTime()
      : 0;
    const playerFeedback = feedbackByVersion.get(version.id) ?? [];
    const feedbackFlags = playerFeedback.length;
    const unreviewedFeedbackFlags = playerFeedback.filter(
      (timestamp) => new Date(timestamp).getTime() > reviewedAt,
    ).length;
    const reportFlags = reportCountByVersion.get(version.id) ?? 0;
    const attemptSummary = attemptsByVersion.get(version.id);
    const topic = related(version.topic);
    const question = related(version.questions);
    const subtopics = (question?.question_subtopics ?? []).flatMap((link) => {
      const subtopic = related(link.subtopics);
      return subtopic?.name ? [subtopic.name] : [];
    });
    const aliases = version.answer_aliases
      .map((alias) => alias.answer)
      .filter(
        (alias) =>
          comparableAnswer(alias) !==
          comparableAnswer(version.canonical_answer),
      );
    return [
      {
        aliases,
        attemptCount: attemptSummary?.attempt_count ?? 0,
        catalogKey: related(link.questions)?.catalog_key ?? "database-seed",
        correctCount: attemptSummary?.correct_count ?? 0,
        feedbackFlags,
        index: link.sort_order || index + 1,
        reportFlags,
        review,
        subtopics,
        topicName: topic?.name ?? "Topic",
        unreviewedFeedbackFlags,
        version,
      },
    ];
  });
  const reviewed =
    selectedPack.approved_questions +
    selectedPack.needs_revision_questions +
    selectedPack.rejected_questions;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            className="text-sm font-bold text-[var(--brand)]"
            href={`/admin/question-quality?pack=${selectedPack.pack_id}&view=all`}
          >
            ← Question Quality
          </Link>
          <p className="mt-3 text-sm font-black uppercase tracking-[.2em] text-sky-200">
            Content review
          </p>
          <h1 className="mt-1 text-4xl font-black">Question index</h1>
          <p className="mt-2 max-w-3xl leading-7 text-[var(--muted)]">
            Scan a complete pack, then open any question directly in its
            pack-scoped editorial review workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black"
            href="/api/admin/question-quality/export"
          >
            <Download aria-hidden="true" size={16} /> Export action items
          </a>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--brand)] px-4 text-sm font-black text-slate-950"
            href={`/admin/question-quality?pack=${selectedPack.pack_id}&view=unreviewed`}
          >
            Continue unreviewed <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </header>

      <Card className="mt-6 p-4">
        <form
          action="/admin/question-index"
          className="flex flex-wrap items-end gap-3"
          method="get"
        >
          <label className="min-w-64 flex-1 text-sm font-black">
            Question pack
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3"
              defaultValue={selectedPack.pack_id}
              name="pack"
            >
              {packSummaries?.map((pack) => (
                <option key={pack.pack_id} value={pack.pack_id}>
                  {pack.pack_name} ({pack.total_questions})
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded-xl bg-white/10 px-5 font-black">
            Open pack
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <b className="text-white">{selectedPack.pack_name}</b>
          <span>
            {reviewed}/{selectedPack.total_questions} reviewed
          </span>
          <span>{selectedPack.unreviewed_questions} unreviewed</span>
          {selectedPack.flagged_questions ? (
            <span className="inline-flex items-center gap-1 font-black text-rose-200">
              <Flag aria-hidden="true" size={14} />
              {selectedPack.flagged_questions} flagged
            </span>
          ) : null}
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Questions in {selectedPack.pack_name}
            </caption>
            <thead className="bg-white/[.04] text-[11px] font-black uppercase tracking-[.13em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3" scope="col">
                  #
                </th>
                <th className="px-4 py-3" scope="col">
                  Question
                </th>
                <th className="px-4 py-3" scope="col">
                  Answer
                </th>
                <th className="px-4 py-3" scope="col">
                  Classification
                </th>
                <th className="px-4 py-3 text-center" scope="col">
                  Difficulty
                </th>
                <th className="px-4 py-3" scope="col">
                  Mode
                </th>
                <th className="px-4 py-3" scope="col">
                  Player results
                </th>
                <th className="px-4 py-3" scope="col">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => {
                const verdict = row.review?.verdict ?? "unreviewed";
                const reviewUrl = `/admin/question-quality?pack=${selectedPack.pack_id}&view=all&question=${row.version.question_id}`;
                return (
                  <tr
                    className="align-top hover:bg-white/[.025]"
                    key={row.version.id}
                  >
                    <td className="px-4 py-4 font-black text-[var(--muted)]">
                      {row.index}
                    </td>
                    <th className="max-w-md px-4 py-4" scope="row">
                      <Link
                        className="font-black leading-6 text-white hover:text-[var(--brand)]"
                        href={reviewUrl}
                      >
                        {row.version.prompt}
                      </Link>
                      <code className="mt-2 block truncate text-[10px] font-normal text-[var(--muted)]">
                        {row.catalogKey} · v{row.version.version_number}
                      </code>
                    </th>
                    <td className="max-w-xs px-4 py-4">
                      <b>{row.version.canonical_answer}</b>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                        {row.aliases.length
                          ? `Also: ${row.aliases.join(" · ")}`
                          : "No additional aliases"}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-4">
                      <b>{row.topicName}</b>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                        {row.subtopics.join(" · ") || "No subtopics"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <DifficultyStars difficulty={row.version.difficulty} />
                    </td>
                    <td className="px-4 py-4 text-xs font-bold">
                      {row.version.answer_mode === "required_choice"
                        ? "Required choice"
                        : "Typed answer"}
                    </td>
                    <td className="px-4 py-4">
                      {row.attemptCount ? (
                        <>
                          <b className="whitespace-nowrap text-sm">
                            {row.attemptCount} attempts · {row.correctCount}{" "}
                            correct
                          </b>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {Math.round(
                              (row.correctCount / row.attemptCount) * 100,
                            )}
                            % accuracy
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          No attempts
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black ${verdictClasses[verdict]}`}
                        >
                          {verdictLabels[verdict] ?? "Unreviewed"}
                        </span>
                        {row.feedbackFlags ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-300/10 px-2.5 py-1 text-xs font-black text-rose-200">
                            <Flag aria-hidden="true" size={12} /> Player flagged
                            · {row.feedbackFlags}
                            {row.unreviewedFeedbackFlags
                              ? ` (${row.unreviewedFeedbackFlags} unreviewed)`
                              : ""}
                          </span>
                        ) : null}
                        {row.reportFlags ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/10 px-2.5 py-1 text-xs font-black text-amber-100">
                            <Flag aria-hidden="true" size={12} /> Open reports ·{" "}
                            {row.reportFlags}
                          </span>
                        ) : null}
                      </div>
                      <Link
                        aria-label={`Review question ${row.index}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--brand)]"
                        href={reviewUrl}
                      >
                        <ListChecks aria-hidden="true" size={14} /> Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            This pack has no published questions.
          </p>
        ) : null}
      </Card>
    </>
  );
}
