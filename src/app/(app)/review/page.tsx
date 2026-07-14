import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  Eye,
  Lightbulb,
  Play,
  Repeat2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DifficultyStars } from "@/components/difficulty-stars";
import { QuestionPackLabel } from "@/components/question-pack-label";
import { requireUser } from "@/lib/auth";
import type { Json } from "@/types/database.generated";

const PAGE_SIZE = 20;

interface ReviewPageProps {
  searchParams: Promise<{ hideCorrect?: string; page?: string }>;
}

function requestedPage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface ReviewScoreSnapshot {
  algorithmVersion: string;
  answerMode?: "recall" | "required_choice";
  basePoints: number;
  proficiency: number;
  proficiencyFactor: number;
  priorAttemptCount?: number;
  priorCorrectCount: number;
  repeatFactor: number;
  assistanceFactor: number;
  remainingRatio: number;
  timeFactor: number;
  startingPoints: number;
}

function scoreSnapshot(value: Json): ReviewScoreSnapshot | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const row = value as Record<string, Json | undefined>;
  const number = (key: string) => {
    const candidate = row[key];
    return typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : null;
  };
  const algorithmVersion = row.algorithmVersion;
  const values = {
    basePoints: number("basePoints"),
    proficiency: number("proficiency"),
    proficiencyFactor: number("proficiencyFactor"),
    priorCorrectCount: number("priorCorrectCount"),
    repeatFactor: number("repeatFactor"),
    assistanceFactor: number("assistanceFactor"),
    remainingRatio: number("remainingRatio"),
    timeFactor: number("timeFactor"),
    startingPoints: number("startingPoints"),
  };
  if (
    typeof algorithmVersion !== "string" ||
    Object.values(values).some((item) => item === null)
  )
    return null;
  const priorAttemptCount = number("priorAttemptCount");
  const answerMode = row.answerMode;
  return {
    algorithmVersion,
    ...(answerMode === "required_choice" || answerMode === "recall"
      ? { answerMode }
      : {}),
    basePoints: values.basePoints!,
    proficiency: values.proficiency!,
    proficiencyFactor: values.proficiencyFactor!,
    ...(priorAttemptCount === null ? {} : { priorAttemptCount }),
    priorCorrectCount: values.priorCorrectCount!,
    repeatFactor: values.repeatFactor!,
    assistanceFactor: values.assistanceFactor!,
    remainingRatio: values.remainingRatio!,
    timeFactor: values.timeFactor!,
    startingPoints: values.startingPoints!,
  };
}

function factor(value: number) {
  return `×${value.toFixed(2)}`;
}

export function ScoringBreakdown({
  snapshot,
  earnedPoints,
  correct,
}: {
  snapshot: Json;
  earnedPoints: number;
  correct: boolean;
}) {
  const score = scoreSnapshot(snapshot);
  if (!score) return null;
  const assessment = score.algorithmVersion.startsWith("assessment");
  const repeatHistory =
    score.priorAttemptCount === undefined
      ? `Previously correct ${score.priorCorrectCount} ${score.priorCorrectCount === 1 ? "time" : "times"}`
      : `${score.priorAttemptCount} prior ${score.priorAttemptCount === 1 ? "attempt" : "attempts"} / ${score.priorCorrectCount} correct`;
  return (
    <details
      className="group mt-5 rounded-2xl border border-sky-300/15 bg-sky-300/[.035]"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-black text-sky-100 marker:content-none">
        <Calculator aria-hidden="true" size={17} />
        {earnedPoints.toLocaleString()}{" "}
        {earnedPoints === 1 ? "point" : "points"} earned
      </summary>
      <div className="border-t border-white/10 p-4">
        {assessment ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            Assessment answers build proficiency but intentionally award no
            question points.
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              {[
                {
                  label: "Base",
                  value: score.basePoints.toLocaleString(),
                  detail: "From difficulty",
                },
                {
                  label: "Proficiency",
                  value: factor(score.proficiencyFactor),
                  detail: `${Math.round(score.proficiency * 100)}% at the time`,
                },
                {
                  label: "Repeat history",
                  value: factor(score.repeatFactor),
                  detail: repeatHistory,
                },
                {
                  label: "Assistance",
                  value: factor(score.assistanceFactor),
                  detail:
                    score.answerMode === "required_choice"
                      ? "Required multiple choice"
                      : score.assistanceFactor < 1
                        ? "Choices shown"
                        : "Typed recall",
                },
                {
                  label: "Time",
                  value: factor(score.timeFactor),
                  detail: `${Math.round(score.remainingRatio * 100)}% remaining`,
                },
                {
                  label: "Final",
                  value: `${earnedPoints.toLocaleString()} pts`,
                  detail: correct ? "Correct answer" : "Incorrect · no points",
                },
              ].map((item) => (
                <div className="rounded-xl bg-black/15 p-3" key={item.label}>
                  <p className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-1 font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </details>
  );
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { user, supabase } = await requireUser();
  const parameters = await searchParams;
  const page = requestedPage(parameters.page);
  const hideCorrect = parameters.hideCorrect === "1";
  const includeCorrect = !hideCorrect;
  const offset = (page - 1) * PAGE_SIZE;
  const attemptsQuery = supabase
    .from("attempts")
    .select(
      "id,submitted_answer,correct,assisted,timed_out,elapsed_ms,earned_points,score_snapshot,created_at,question:question_versions!inner(question_id,prompt,canonical_answer,explanation,details,difficulty,topic:topics(name))",
      { count: "exact" },
    )
    .eq("user_id", user.id);
  const filteredAttemptsQuery = hideCorrect
    ? attemptsQuery.eq("correct", false)
    : attemptsQuery;
  const [
    { data: attempts, count: filteredCount },
    { count: totalCount },
    { count: incorrectCount },
    { data: questionStates },
  ] = await Promise.all([
    filteredAttemptsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("correct", false),
    supabase
      .from("user_question_state")
      .select("question_id,attempt_count,correct_count")
      .eq("user_id", user.id),
  ]);
  const total = totalCount ?? 0;
  const missed = incorrectCount ?? 0;
  const pageCount = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));
  if (page > pageCount)
    redirect(`/review?page=${pageCount}${hideCorrect ? "&hideCorrect=1" : ""}`);
  const currentPage = page;
  const questionStateById = new Map(
    questionStates?.map((state) => [state.question_id, state]),
  );
  const questionIds = [
    ...new Set(
      (attempts ?? []).flatMap((attempt) => {
        const question = Array.isArray(attempt.question)
          ? attempt.question[0]
          : attempt.question;
        return question?.question_id ? [question.question_id] : [];
      }),
    ),
  ];
  const { data: packLinks } = questionIds.length
    ? await supabase
        .from("pack_questions")
        .select("question_id,packs(name)")
        .in("question_id", questionIds)
    : { data: [] };
  const packNamesByQuestionId = new Map<string, string[]>();
  for (const link of packLinks ?? []) {
    const pack = Array.isArray(link.packs) ? link.packs[0] : link.packs;
    if (!pack?.name) continue;
    const names = packNamesByQuestionId.get(link.question_id) ?? [];
    if (!names.includes(pack.name)) names.push(pack.name);
    packNamesByQuestionId.set(link.question_id, names);
  }
  for (const names of packNamesByQuestionId.values())
    names.sort((left, right) => left.localeCompare(right));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
            Learning history
          </p>
          <h1 className="mt-2 text-4xl font-black">Review</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
            Revisit your answers, explanations, and context. Incorrect and
            timed-out answers are highlighted for faster study.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action="/review" method="get">
            {includeCorrect ? (
              <input name="hideCorrect" type="hidden" value="1" />
            ) : null}
            <button
              aria-checked={includeCorrect}
              className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-white/15 px-4 py-2 text-sm font-black hover:bg-white/5"
              role="switch"
              type="submit"
            >
              <Eye aria-hidden="true" size={17} />
              Include correct answers
              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  includeCorrect ? "bg-[var(--brand)]" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    includeCorrect ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </form>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-black text-slate-950 hover:brightness-110"
            href="/play"
          >
            <Play aria-hidden="true" size={17} />
            Play now
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-3xl font-black">{total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Questions answered</p>
        </Card>
        <Card className="border-rose-300/20 p-5">
          <p className="text-3xl font-black text-rose-200">
            {missed.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">To revisit</p>
        </Card>
        <Card className="p-5">
          <p className="text-3xl font-black">
            {total ? Math.round(((total - missed) / total) * 100) : 0}%
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">Raw accuracy</p>
        </Card>
      </section>

      <section className="mt-8 space-y-5" aria-label="Answer history">
        {attempts?.map((attempt) => {
          const question = Array.isArray(attempt.question)
            ? attempt.question[0]
            : attempt.question;
          const topic = Array.isArray(question?.topic)
            ? question.topic[0]
            : question?.topic;
          const questionState = question
            ? questionStateById.get(question.question_id)
            : null;
          const correct = attempt.correct;
          return (
            <Card
              className={`overflow-hidden p-6 ${
                correct
                  ? "border-emerald-300/15"
                  : "border-rose-300/40 bg-rose-400/[.07] shadow-rose-950/20"
              }`}
              key={attempt.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                      correct
                        ? "bg-emerald-300/10 text-emerald-200"
                        : "bg-rose-300/15 text-rose-100"
                    }`}
                  >
                    {correct ? (
                      <CheckCircle2 aria-hidden="true" size={14} />
                    ) : (
                      <XCircle aria-hidden="true" size={14} />
                    )}
                    {correct
                      ? "Correct"
                      : attempt.timed_out
                        ? "Timed out"
                        : "Incorrect"}
                  </span>
                  <span className="text-xs font-bold text-[var(--muted)]">
                    {topic?.name ?? "Topic"}
                  </span>
                  {question ? (
                    <DifficultyStars difficulty={question.difficulty} />
                  ) : null}
                  {attempt.assisted ? (
                    <span className="rounded-full bg-amber-200/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                      Choices shown
                    </span>
                  ) : null}
                  {questionState ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-300/10 px-2.5 py-1 text-xs font-bold text-sky-100">
                      <Repeat2 aria-hidden="true" size={13} />
                      Answered {questionState.attempt_count}{" "}
                      {questionState.attempt_count === 1 ? "time" : "times"} ·{" "}
                      {questionState.correct_count} correct
                    </span>
                  ) : null}
                </div>
                <div className="text-right text-xs text-[var(--muted)]">
                  <p>{new Date(attempt.created_at).toLocaleString()}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5">
                    <Clock3 aria-hidden="true" size={13} />
                    {(attempt.elapsed_ms / 1000).toFixed(1)} sec ·{" "}
                    {attempt.earned_points.toLocaleString()} pts
                  </p>
                </div>
              </div>

              <h2 className="mt-5 text-xl font-black leading-8">
                {question?.prompt ?? "Question unavailable"}
              </h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div
                  className={`rounded-2xl p-4 ${
                    correct ? "bg-emerald-300/[.06]" : "bg-rose-950/30"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                    Your answer
                  </p>
                  <p
                    className={`mt-2 font-bold ${correct ? "text-emerald-100" : "text-rose-100"}`}
                  >
                    {attempt.timed_out
                      ? "No answer — time expired"
                      : attempt.submitted_answer || "No answer submitted"}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-300/[.06] p-4">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                    Correct answer
                  </p>
                  <p className="mt-2 font-bold text-emerald-100">
                    {question?.canonical_answer ?? "Unavailable"}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="flex items-start gap-3">
                  <Lightbulb
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--accent)]"
                    size={19}
                  />
                  <div>
                    <p className="font-bold">{question?.explanation}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {question?.details}
                    </p>
                  </div>
                </div>
              </div>

              <QuestionPackLabel
                className="mt-5"
                packNames={
                  question
                    ? (packNamesByQuestionId.get(question.question_id) ?? [])
                    : []
                }
              />

              <ScoringBreakdown
                correct={correct}
                earnedPoints={attempt.earned_points}
                snapshot={attempt.score_snapshot}
              />
            </Card>
          );
        })}

        {!attempts?.length ? (
          <Card className="p-10 text-center">
            <CheckCircle2
              aria-hidden="true"
              className="mx-auto text-[var(--brand)]"
              size={34}
            />
            <h2 className="mt-4 text-xl font-black">
              {hideCorrect
                ? "No incorrect answers to review"
                : "Nothing to review yet"}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {hideCorrect
                ? "Turn off the filter to see your correct answers."
                : "Your completed questions will appear here after you play."}
            </p>
          </Card>
        ) : null}
      </section>

      {pageCount > 1 ? (
        <nav
          aria-label="Review pages"
          className="mt-8 flex items-center justify-between gap-4"
        >
          {currentPage > 1 ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
              href={`/review?page=${currentPage - 1}${hideCorrect ? "&hideCorrect=1" : ""}`}
            >
              <ArrowLeft aria-hidden="true" size={17} /> Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--muted)]">
            Page {currentPage} of {pageCount}
          </span>
          {currentPage < pageCount ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/5"
              href={`/review?page=${currentPage + 1}${hideCorrect ? "&hideCorrect=1" : ""}`}
            >
              Next <ArrowRight aria-hidden="true" size={17} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
