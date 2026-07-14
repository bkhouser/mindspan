import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Flag,
  MessageSquareWarning,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DifficultyStars } from "@/components/difficulty-stars";
import { requireSysAdmin } from "@/lib/auth";
import { EditorialReviewControls } from "./editorial-review-controls";

type ReviewView =
  | "unreviewed"
  | "flagged"
  | "needs_revision"
  | "all";

const views: Array<{ value: ReviewView; label: string }> = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "flagged", label: "Player flagged" },
  { value: "needs_revision", label: "Needs revision" },
  { value: "all", label: "All" },
];

function reviewView(value: string | undefined): ReviewView {
  return views.some((view) => view.value === value)
    ? (value as ReviewView)
    : "unreviewed";
}

function requestedPosition(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function related<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

const reasonLabels: Record<string, string> = {
  incorrect_answer: "Incorrect answer",
  should_have_been_accepted: "My answer should be accepted",
  unclear: "Unclear",
  difficulty: "Difficulty feels wrong",
  weak_explanation: "Weak explanation",
  poor_choices: "Poor choices",
  typo: "Typo or grammar",
  outdated: "Outdated",
  media: "Media problem",
  other: "Other",
};

export default async function QuestionQualityPage({
  searchParams,
}: {
  searchParams: Promise<{
    pack?: string;
    position?: string;
    view?: string;
  }>;
}) {
  const { supabase } = await requireSysAdmin();
  const query = await searchParams;
  const view = reviewView(query.view);
  const { data: packSummaries, error: summaryError } = await supabase.rpc(
    "question_quality_pack_summary_v1",
  );
  if (summaryError) throw summaryError;
  const requestedPack = packSummaries?.find(
    (pack) => pack.pack_id === query.pack,
  );
  const selectedPack =
    (view === "flagged" && !requestedPack?.flagged_questions
      ? packSummaries?.find((pack) => pack.flagged_questions > 0)
      : requestedPack) ??
    requestedPack ??
    packSummaries?.find((pack) => pack.total_questions > 0);

  if (!selectedPack) {
    return (
      <Card className="p-8">
        <h1 className="text-3xl font-black">Question quality</h1>
        <p className="mt-3 text-[var(--muted)]">
          No published question packs are available for review.
        </p>
      </Card>
    );
  }

  const { data: packQuestionRows } = await supabase
    .from("pack_questions")
    .select("question_id,sort_order,questions(catalog_key)")
    .eq("pack_id", selectedPack.pack_id)
    .order("sort_order");
  const questionIds = packQuestionRows?.map((row) => row.question_id) ?? [];
  const catalogKeyByQuestion = new Map(
    packQuestionRows?.map((row) => [
      row.question_id,
      related(row.questions)?.catalog_key ?? null,
    ]),
  );
  const sortOrderByQuestion = new Map(
    packQuestionRows?.map((row, index) => [
      row.question_id,
      row.sort_order || index,
    ]),
  );
  const { data: versionRows } = questionIds.length
    ? await supabase
        .from("question_versions")
        .select(
          "id,question_id,version_number,prompt,canonical_answer,explanation,details,difficulty,time_limit_seconds,answer_mode,verified_at,expires_at,topic:topics(name),answer_aliases(answer),distractors(answer,sort_order),question_citations(label,url,sort_order),questions(catalog_key,question_subtopics(subtopics(name)))",
        )
        .eq("status", "published")
        .in("question_id", questionIds)
    : { data: [] };
  const versions = [...(versionRows ?? [])].sort(
    (left, right) =>
      (sortOrderByQuestion.get(left.question_id) ?? 0) -
        (sortOrderByQuestion.get(right.question_id) ?? 0) ||
      (catalogKeyByQuestion.get(left.question_id) ?? left.prompt).localeCompare(
        catalogKeyByQuestion.get(right.question_id) ?? right.prompt,
      ),
  );
  const versionIds = versions.map((version) => version.id);
  const [{ data: editorialRows }, { data: feedbackRows }, { data: reportRows }] =
    versionIds.length
      ? await Promise.all([
          supabase
            .from("question_editorial_reviews")
            .select("*")
            .in("question_version_id", versionIds),
          supabase
            .from("question_feedback")
            .select(
              "question_version_id,sentiment,reasons,comment,answer_correct,assisted,timed_out,created_at,updated_at,reporter:profiles!question_feedback_user_id_fkey(display_name)",
            )
            .in("question_version_id", versionIds)
            .order("updated_at", { ascending: false }),
          supabase
            .from("question_reports")
            .select("id,question_version_id,category,details,status,created_at")
            .in("question_version_id", versionIds)
            .eq("status", "open")
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];
  const editorialByVersion = new Map(
    editorialRows?.map((review) => [review.question_version_id, review]),
  );
  type FeedbackRow = NonNullable<typeof feedbackRows>[number];
  const feedbackByVersion = new Map<string, FeedbackRow[]>();
  for (const feedback of feedbackRows ?? []) {
    const values: FeedbackRow[] =
      feedbackByVersion.get(feedback.question_version_id) ?? [];
    values.push(feedback);
    feedbackByVersion.set(feedback.question_version_id, values);
  }
  type ReportRow = NonNullable<typeof reportRows>[number];
  const reportsByVersion = new Map<string, ReportRow[]>();
  for (const report of reportRows ?? []) {
    const values: ReportRow[] =
      reportsByVersion.get(report.question_version_id) ?? [];
    values.push(report);
    reportsByVersion.set(report.question_version_id, values);
  }
  const isFlagged = (versionId: string) => {
    const review = editorialByVersion.get(versionId);
    const reviewedAt = review?.player_feedback_reviewed_at
      ? new Date(review.player_feedback_reviewed_at).getTime()
      : 0;
    const newDownVote = (feedbackByVersion.get(versionId) ?? []).some(
      (feedback) =>
        feedback.sentiment === "down" &&
        new Date(feedback.updated_at).getTime() > reviewedAt,
    );
    return newDownVote || Boolean(reportsByVersion.get(versionId)?.length);
  };
  const filteredVersions = versions.filter((version) => {
    const verdict = editorialByVersion.get(version.id)?.verdict;
    if (view === "all") return true;
    if (view === "unreviewed") return !verdict;
    if (view === "flagged") return isFlagged(version.id);
    return verdict === view;
  });
  const requested = requestedPosition(query.position);
  const position = Math.min(Math.max(1, requested), filteredVersions.length || 1);
  const current = filteredVersions[position - 1];
  const currentReview = current ? editorialByVersion.get(current.id) : null;
  const currentFeedback = current
    ? (feedbackByVersion.get(current.id) ?? [])
    : [];
  const currentReports = current
    ? (reportsByVersion.get(current.id) ?? [])
    : [];
  const baseUrl = `/admin/question-quality?pack=${selectedPack.pack_id}&view=${view}`;
  const nextPosition =
    view === "unreviewed"
      ? position
      : Math.min(position + 1, filteredVersions.length);
  const returnTo = `${baseUrl}&position=${nextPosition || 1}`;
  const [{ count: attempts }, { count: correct }, { count: assisted }] = current
    ? await Promise.all([
        supabase
          .from("attempts")
          .select("id", { count: "exact", head: true })
          .eq("question_version_id", current.id),
        supabase
          .from("attempts")
          .select("id", { count: "exact", head: true })
          .eq("question_version_id", current.id)
          .eq("correct", true),
        supabase
          .from("attempts")
          .select("id", { count: "exact", head: true })
          .eq("question_version_id", current.id)
          .eq("assisted", true),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="text-sm font-bold text-[var(--brand)]" href="/admin">
            ← Control room
          </Link>
          <h1 className="mt-3 text-4xl font-black">Question quality</h1>
          <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
            Player reactions identify possible problems. Editorial approve,
            revise, and reject decisions are the authoritative review of each
            immutable version.
          </p>
        </div>
        <a
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-black text-slate-950"
          href="/api/admin/question-quality/export"
        >
          <Download aria-hidden="true" size={17} /> Export action items
        </a>
      </header>

      <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packSummaries?.map((pack) => {
          const reviewed =
            pack.approved_questions +
            pack.needs_revision_questions +
            pack.rejected_questions;
          return (
            <Link
              className={`rounded-2xl border p-4 transition hover:bg-white/[.04] ${
                pack.pack_id === selectedPack.pack_id
                  ? "border-[var(--brand)] bg-[var(--brand)]/[.06]"
                  : "border-white/10"
              }`}
              href={`/admin/question-quality?pack=${pack.pack_id}&view=${view}&position=1`}
              key={pack.pack_id}
            >
              <div className="flex items-start justify-between gap-3">
                <b>{pack.pack_name}</b>
                {pack.flagged_questions ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-rose-200">
                    <Flag size={13} /> {pack.flagged_questions}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {reviewed}/{pack.total_questions} reviewed
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--brand)]"
                  style={{
                    width: `${pack.total_questions ? (reviewed / pack.total_questions) * 100 : 0}%`,
                  }}
                />
              </div>
            </Link>
          );
        })}
      </section>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Review filter">
        {views.map((item) => (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-black ${
              view === item.value
                ? "bg-white text-slate-950"
                : "bg-white/[.06] text-[var(--muted)]"
            }`}
            href={
              item.value === "flagged"
                ? "/admin/question-quality?view=flagged&position=1"
                : `/admin/question-quality?pack=${selectedPack.pack_id}&view=${item.value}&position=1`
            }
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {current ? (
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[.025] px-6 py-4">
            <b>{selectedPack.pack_name}</b>
            <span className="text-sm text-[var(--muted)]">
              {position} of {filteredVersions.length} in {views.find((item) => item.value === view)?.label.toLowerCase()}
            </span>
            {currentReview ? (
              <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase">
                {currentReview.verdict.replace("_", " ")}
              </span>
            ) : null}
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span>{related(current.topic)?.name ?? "Topic"}</span>
              <DifficultyStars difficulty={current.difficulty} />
              <span>Version {current.version_number}</span>
              <code className="rounded bg-black/20 px-2 py-1">
                {catalogKeyByQuestion.get(current.question_id) ?? "database-seed"}
              </code>
            </div>
            <h2 className="mt-5 text-2xl font-black leading-9">
              {current.prompt}
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-emerald-300/[.06] p-4">
                <p className="text-xs font-black uppercase tracking-[.13em] text-[var(--muted)]">
                  Canonical answer
                </p>
                <p className="mt-2 text-lg font-black text-emerald-100">
                  {current.canonical_answer}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  Aliases: {current.answer_aliases.map((alias) => alias.answer).join(" · ") || "None"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.035] p-4">
                <p className="text-xs font-black uppercase tracking-[.13em] text-[var(--muted)]">
                  Distractors
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {[...current.distractors]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((distractor) => (
                      <li key={distractor.sort_order}>{distractor.answer}</li>
                    ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 space-y-4 border-t border-white/10 pt-6 leading-7">
              <p className="font-bold">{current.explanation}</p>
              <p className="text-[var(--muted)]">{current.details}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {related(current.questions)?.question_subtopics?.flatMap((link) => {
                const subtopic = related(link.subtopics);
                return subtopic ? (
                  <span className="rounded-full bg-white/5 px-3 py-1.5" key={subtopic.name}>
                    {subtopic.name}
                  </span>
                ) : [];
              })}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <b className="text-2xl">{attempts ?? 0}</b>
                <p className="text-xs text-[var(--muted)]">Attempts</p>
              </Card>
              <Card className="p-4">
                <b className="text-2xl">
                  {attempts ? Math.round(((correct ?? 0) / attempts) * 100) : 0}%
                </b>
                <p className="text-xs text-[var(--muted)]">Accuracy</p>
              </Card>
              <Card className="p-4">
                <b className="text-2xl">
                  {attempts ? Math.round(((assisted ?? 0) / attempts) * 100) : 0}%
                </b>
                <p className="text-xs text-[var(--muted)]">Assisted</p>
              </Card>
            </div>

            {currentFeedback.length || currentReports.length ? (
              <section className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/[.04] p-5">
                <h3 className="flex items-center gap-2 font-black">
                  <MessageSquareWarning size={18} /> Player feedback
                </h3>
                <div className="mt-4 space-y-3">
                  {currentFeedback.map((feedback, index) => {
                    const reporter = related(feedback.reporter);
                    return (
                      <article className="rounded-xl bg-black/15 p-3" key={`${feedback.updated_at}-${index}`}>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-lg" aria-hidden="true">
                            {feedback.sentiment === "up" ? "👍" : "👎"}
                          </span>
                          <b>{reporter?.display_name ?? "Player"}</b>
                          <span className="text-[var(--muted)]">
                            {feedback.answer_correct ? "answered correctly" : "answered incorrectly"}
                            {feedback.assisted ? " · assisted" : ""}
                            {feedback.timed_out ? " · timed out" : ""}
                          </span>
                        </div>
                        {feedback.reasons.length ? (
                          <p className="mt-2 text-xs text-rose-100">
                            {feedback.reasons.map((reason) => reasonLabels[reason] ?? reason).join(" · ")}
                          </p>
                        ) : null}
                        {feedback.comment ? (
                          <p className="mt-2 text-sm">{feedback.comment}</p>
                        ) : null}
                      </article>
                    );
                  })}
                  {currentReports.map((report) => (
                    <article className="rounded-xl bg-black/15 p-3" key={report.id}>
                      <b className="text-xs uppercase text-rose-100">
                        Formal report · {report.category}
                      </b>
                      <p className="mt-2 text-sm">{report.details}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <CheckCircle2 size={16} /> No player concerns recorded
              </p>
            )}

            <EditorialReviewControls
              notes={currentReview?.notes ?? ""}
              returnTo={returnTo}
              versionId={current.id}
            />
          </div>
          <nav className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            {position > 1 ? (
              <Link className="inline-flex items-center gap-2 font-bold" href={`${baseUrl}&position=${position - 1}`}>
                <ArrowLeft size={17} /> Previous
              </Link>
            ) : (
              <span />
            )}
            {position < filteredVersions.length ? (
              <Link className="inline-flex items-center gap-2 font-bold" href={`${baseUrl}&position=${position + 1}`}>
                Next <ArrowRight size={17} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </Card>
      ) : (
        <Card className="mt-6 p-10 text-center">
          <CheckCircle2 className="mx-auto text-[var(--brand)]" size={34} />
          <h2 className="mt-4 text-xl font-black">Nothing in this queue</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Choose another filter or pack to continue reviewing.
          </p>
        </Card>
      )}
    </>
  );
}
