"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  Pause,
  Sparkles,
  XCircle,
} from "lucide-react";
import type {
  AttemptResult,
  ChoiceReveal,
  PlayMode,
  PreparedQuestionPresentation,
  QuestionPresentation,
} from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaPrompt } from "@/components/media-prompt";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { DifficultyStars } from "@/components/difficulty-stars";
import { QuestionTimerBar } from "@/components/question-timer-bar";
import {
  QuestionFeedback,
  type QuestionFeedbackHandle,
} from "@/components/question-feedback";
import { remainingScoringRatio } from "@/domain/timer-rules";
import { useEnterToAdvance } from "@/hooks/use-enter-to-advance";
import { dismissPlayIntroduction } from "./actions";

interface Option {
  id: string;
  name: string;
}
interface Props {
  initialMode: PlayMode;
  initialSelectedId?: string;
  autoStart?: boolean;
  topics: Option[];
  packs: Option[];
  immediateChoiceSubmit: boolean;
  showPlayIntro: boolean;
  standardTimerSeconds: number;
}
type Phase = "setup" | "loading" | "question" | "submitting" | "result";

async function api<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "Request failed");
  return json;
}

export function PlayGame({
  initialMode,
  initialSelectedId,
  autoStart = false,
  topics,
  packs,
  immediateChoiceSubmit,
  showPlayIntro,
  standardTimerSeconds,
}: Props) {
  const [mode, setMode] = useState<PlayMode>(initialMode);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? "");
  const [sessionId, setSessionId] = useState<string>();
  const [presentation, setPresentation] = useState<QuestionPresentation>();
  const [choices, setChoices] = useState<ChoiceReveal>();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult>();
  const [phase, setPhase] = useState<Phase>("setup");
  const [error, setError] = useState<string>();
  const [remainingMs, setRemainingMs] = useState(0);
  const [mediaReady, setMediaReady] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);
  const [breakDismissed, setBreakDismissed] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [runElapsedMs, setRunElapsedMs] = useState(0);
  const [introVisible, setIntroVisible] = useState(showPlayIntro);
  const [introError, setIntroError] = useState<string>();
  const [advancingToNext, setAdvancingToNext] = useState(false);
  const [, startIntroTransition] = useTransition();
  const submitting = useRef(false);
  const markingMediaReady = useRef(false);
  const answerIdempotencyKey = useRef<string | undefined>(undefined);
  const autoStartAttempted = useRef(false);
  const questionFeedback = useRef<QuestionFeedbackHandle>(null);
  const preparedNext = useRef<
    Promise<PreparedQuestionPresentation | undefined> | undefined
  >(undefined);

  function turnOffIntroduction() {
    setIntroVisible(false);
    setIntroError(undefined);
    startIntroTransition(async () => {
      const result = await dismissPlayIntroduction();
      if (!result.ok) {
        setIntroVisible(true);
        setIntroError("Could not save that preference. Please try again.");
      }
    });
  }

  const showQuestion = useCallback((next: QuestionPresentation) => {
    answerIdempotencyKey.current = crypto.randomUUID();
    setPresentation(next);
    setChoices(next.initialChoices);
    setRemainingMs(next.timeLimitSeconds * 1000);
    setMediaReady(!next.media);
    markingMediaReady.current = false;
    setPhase("question");
  }, []);

  const loadNext = useCallback(
    async (activeSession: string) => {
      setPhase("loading");
      setError(undefined);
      setAnswer("");
      setChoices(undefined);
      setResult(undefined);
      submitting.current = false;
      try {
        const next = await api<QuestionPresentation>(
          `/api/play/sessions/${activeSession}/next`,
          {},
        );
        showQuestion(next);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load a question",
        );
        setPhase("setup");
      }
    },
    [showQuestion],
  );

  const prepareNext = useCallback((activeSession: string) => {
    preparedNext.current = api<PreparedQuestionPresentation>(
      `/api/play/sessions/${activeSession}/next`,
      { prepareOnly: true },
    ).catch(() => undefined);
  }, []);

  const start = useCallback(async () => {
    setPhase("loading");
    setError(undefined);
    setRunStartedAt(Date.now());
    setRunElapsedMs(0);
    try {
      const session = await api<{ id: string }>("/api/play/sessions", {
        mode,
        topicId: mode === "topic" ? selectedId : undefined,
        packId: mode === "pack" ? selectedId : undefined,
      });
      setSessionId(session.id);
      await loadNext(session.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not start play",
      );
      setPhase("setup");
    }
  }, [loadNext, mode, selectedId]);

  useEffect(() => {
    if (!autoStart || autoStartAttempted.current || !initialSelectedId) return;
    autoStartAttempted.current = true;
    void start();
  }, [autoStart, initialSelectedId, start]);

  const submit = useCallback(
    async (value: string, timedOut = false) => {
      if (!presentation || submitting.current) return;
      submitting.current = true;
      setError(undefined);
      const frozenRemainingMs = timedOut
        ? 0
        : Math.max(0, new Date(presentation.expiresAt).getTime() - Date.now());
      const clientElapsedMs = Math.max(
        0,
        presentation.timeLimitSeconds * 1000 - frozenRemainingMs,
      );
      setRemainingMs(frozenRemainingMs);
      setPhase("submitting");
      try {
        const response = await api<AttemptResult>(
          `/api/play/presentations/${presentation.id}/answer`,
          {
            answer: value,
            timedOut,
            clientElapsedMs: Math.round(clientElapsedMs),
            idempotencyKey:
              answerIdempotencyKey.current ??
              (answerIdempotencyKey.current = crypto.randomUUID()),
          },
        );
        setResult(response);
        setQuestionCount((count) => count + 1);
        setPhase("result");
        if (sessionId) prepareNext(sessionId);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not submit answer",
        );
        submitting.current = false;
        setRemainingMs(
          Math.max(0, new Date(presentation.expiresAt).getTime() - Date.now()),
        );
        setPhase("question");
      }
    },
    [prepareNext, presentation, sessionId],
  );

  useEnterToAdvance(phase === "result" && Boolean(sessionId), advanceToNext);

  async function advanceToNext() {
    if (!sessionId || advancingToNext) return;
    setAdvancingToNext(true);
    const saved = await questionFeedback.current?.savePending();
    if (saved === false) {
      setAdvancingToNext(false);
      return;
    }
    const prepared = await preparedNext.current;
    preparedNext.current = undefined;
    if (prepared) {
      setPhase("loading");
      setError(undefined);
      setAnswer("");
      setChoices(undefined);
      setResult(undefined);
      submitting.current = false;
      try {
        const next = await api<QuestionPresentation>(
          `/api/play/presentations/${prepared.id}/activate`,
          {},
        );
        showQuestion(next);
      } catch {
        await loadNext(sessionId);
      }
    } else {
      await loadNext(sessionId);
    }
    setAdvancingToNext(false);
  }

  useEffect(() => {
    if (phase !== "question" || !presentation) return;
    const timer = window.setInterval(() => {
      if (!mediaReady) {
        if (
          presentation.mediaLoadDeadline &&
          Date.now() >= new Date(presentation.mediaLoadDeadline).getTime()
        )
          setMediaReady(true);
        return;
      }
      const remaining = Math.max(
        0,
        new Date(presentation.expiresAt).getTime() - Date.now(),
      );
      setRemainingMs(remaining);
      if (runStartedAt) setRunElapsedMs(Date.now() - runStartedAt);
      if (remaining === 0) {
        window.clearInterval(timer);
        void submit("", true);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [mediaReady, phase, presentation, runStartedAt, submit]);

  async function revealChoices() {
    if (!presentation) return;
    try {
      setChoices(
        await api<ChoiceReveal>(
          `/api/play/presentations/${presentation.id}/choices`,
          {},
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Choices are unavailable",
      );
    }
  }

  async function markMediaReady() {
    if (!presentation?.media || mediaReady || markingMediaReady.current) return;
    markingMediaReady.current = true;
    try {
      const timing = await api<{ expiresAt: string }>(
        `/api/play/presentations/${presentation.id}/ready`,
        {},
      );
      setPresentation((current) =>
        current ? { ...current, expiresAt: timing.expiresAt } : current,
      );
      setRemainingMs(
        Math.max(0, new Date(timing.expiresAt).getTime() - Date.now()),
      );
      setMediaReady(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not start the question timer",
      );
      markingMediaReady.current = false;
    }
  }

  const showBreak =
    !breakDismissed && (questionCount >= 50 || runElapsedMs >= 45 * 60_000);
  const timeRatio =
    presentation && mediaReady
      ? Math.max(
          0,
          Math.min(1, remainingMs / (presentation.timeLimitSeconds * 1000)),
        )
      : 1;
  const scoringTimeRatio = presentation
    ? remainingScoringRatio(
        presentation.timeLimitSeconds * 1000 - remainingMs,
        presentation.scoringTimeLimitSeconds,
      )
    : 1;
  const livePoints = presentation
    ? Math.round(
        presentation.startingPoints *
          (choices?.assistance === "show_choices" ? 0.5 : 1) *
          (0.25 + 0.75 * scoringTimeRatio),
      )
    : 0;

  if (phase === "setup")
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Unlimited play
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">
          Pick your path
        </h1>
        {introVisible ? (
          <Card className="mt-7 border-emerald-300/20 bg-emerald-300/[.07] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/15 text-emerald-200">
                <Sparkles aria-hidden="true" size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black">Welcome to Play</h2>
                <p className="mt-2 text-[var(--muted)]">
                  Build your leaderboard score by demonstrating new knowledge:
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)] marker:text-emerald-300">
                  <li>Novel and difficult questions are worth more.</li>
                  <li>
                    The standard timer is {standardTimerSeconds} seconds. Point
                    value decreases over time; a timeout earns zero points.
                  </li>
                  <li>Showing choices halves the remaining point value.</li>
                  <li>
                    Required multiple-choice questions show choices immediately
                    and begin at half value.
                  </li>
                  <li>
                    Answering the same question correctly is worth less each
                    time, eventually reaching zero.
                  </li>
                  <li>
                    Lifetime points determine your group leaderboard position.
                  </li>
                </ul>
                <button
                  className="mt-4 text-sm font-black text-[var(--brand)] hover:underline"
                  onClick={turnOffIntroduction}
                  type="button"
                >
                  Don’t show this again
                </button>
              </div>
            </div>
          </Card>
        ) : null}
        {introError ? (
          <p
            className="mt-3 text-sm font-bold text-[var(--danger)]"
            role="alert"
          >
            {introError}
          </p>
        ) : null}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {(["mixed", "topic", "pack"] as PlayMode[]).map((value) => (
            <button
              className={`rounded-3xl border p-5 text-left font-black ${mode === value ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/[.035]"}`}
              key={value}
              onClick={() => {
                setMode(value);
                setSelectedId("");
              }}
              type="button"
            >
              {value === "mixed"
                ? "Mixed play"
                : value === "topic"
                  ? "Choose a topic"
                  : "Choose a pack"}
            </button>
          ))}
        </div>
        {mode !== "mixed" ? (
          <select
            aria-label={mode === "topic" ? "Topic" : "Pack"}
            className="mt-5 min-h-12 w-full rounded-2xl border border-white/15 bg-[var(--surface)] px-4"
            onChange={(event) => setSelectedId(event.target.value)}
            value={selectedId}
          >
            <option value="">Select {mode}</option>
            {(mode === "topic" ? topics : packs).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-7 w-full sm:w-auto"
          disabled={mode !== "mixed" && !selectedId}
          onClick={start}
        >
          Start playing
        </Button>
      </div>
    );

  if (phase === "loading")
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[var(--brand)]" />
          <p className="mt-5 font-bold text-[var(--muted)]">
            Finding the right question…
          </p>
        </div>
      </div>
    );

  if (phase === "result" && result && presentation)
    return (
      <div className="mx-auto max-w-3xl">
        <AchievementCelebration achievements={result.achievements} />
        <Card
          className={`overflow-hidden ${result.correct ? "border-emerald-300/25" : "border-rose-300/30"}`}
        >
          <div
            className={`border-b border-white/10 p-6 sm:p-8 ${result.correct ? "bg-gradient-to-br from-emerald-300/[.13] via-emerald-300/[.04] to-transparent" : "bg-gradient-to-br from-rose-300/[.13] via-rose-300/[.04] to-transparent"}`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl ${result.correct ? "bg-emerald-300/15 text-emerald-200" : "bg-rose-300/15 text-rose-200"}`}
              >
                {result.correct ? (
                  <CheckCircle2 aria-hidden="true" size={26} />
                ) : (
                  <XCircle aria-hidden="true" size={26} />
                )}
              </span>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[.16em] text-[var(--muted)] sm:text-xs sm:tracking-[.18em]">
                  Answer result
                </p>
                <p className="mt-1 text-xl font-black">
                  {result.correct ? "That’s right" : "Not this time"}
                </p>
              </div>
              <div className="ml-auto shrink-0 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-right sm:px-4">
                <b className="block text-xl text-[var(--accent)]">
                  +{result.earnedPoints.toLocaleString()}
                </b>
                <span className="block text-[10px] font-black uppercase tracking-[.12em] text-[var(--muted)]">
                  points earned
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span
                className="inline-flex items-baseline gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[.08] px-3 py-2"
                data-testid="question-topic"
              >
                <span className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-200/70">
                  Topic
                </span>
                <span className="text-xs font-bold text-emerald-50">
                  {presentation.topic.name}
                </span>
              </span>
              {result.packNames.length ? (
                <span
                  className="inline-flex items-baseline gap-2 rounded-xl border border-sky-300/20 bg-sky-300/[.07] px-3 py-2"
                  data-testid="question-pack"
                >
                  <span className="text-[9px] font-black uppercase tracking-[.14em] text-sky-200/70">
                    Pack
                  </span>
                  <span className="text-xs font-bold text-sky-50">
                    {result.packNames.join(", ")}
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--muted)]">
                  Difficulty
                </span>
                <DifficultyStars
                  difficulty={presentation.difficulty}
                  size={13}
                />
              </span>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
              <p className="text-[11px] font-black uppercase tracking-[.16em] text-[var(--muted)]">
                Question
              </p>
              <p className="mt-2 text-lg font-black leading-7 sm:text-xl sm:leading-8">
                {presentation.prompt}
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div
                className={`rounded-2xl p-4 sm:p-5 ${
                  result.correct ? "bg-emerald-300/[.06]" : "bg-rose-950/30"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[.16em] text-[var(--muted)]">
                  Your answer
                </p>
                <p
                  className={`mt-2 text-lg font-black ${
                    result.correct ? "text-emerald-100" : "text-rose-100"
                  }`}
                >
                  {result.timedOut
                    ? "No answer — time expired"
                    : result.submittedAnswer.trim() || "No answer submitted"}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-300/[.06] p-4 sm:p-5">
                <p className="text-[11px] font-black uppercase tracking-[.16em] text-[var(--muted)]">
                  Correct answer
                </p>
                <p className="mt-2 text-lg font-black text-emerald-100">
                  {result.canonicalAnswer}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-base font-bold leading-7">
                {result.explanation}
              </p>
              <p className="mt-4 leading-7 text-[var(--muted)]">
                {result.details}
              </p>
            </div>
            <div
              className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] p-4 sm:p-5"
              data-testid="topic-proficiency"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[.14em] text-[var(--muted)]">
                    Topic proficiency
                  </p>
                  <p className="mt-1 font-bold">{presentation.topic.name}</p>
                </div>
                <b className="text-2xl">
                  {Math.round(result.topicMastery.proficiency * 100)}%
                </b>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-emerald-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, Math.round(result.topicMastery.proficiency * 100)))}%`,
                  }}
                />
              </div>
              {result.subtopicMastery.length ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  {result.subtopicMastery.map((subtopic) => (
                    <span
                      className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold text-[var(--muted)]"
                      key={subtopic.id}
                    >
                      {subtopic.name} {Math.round(subtopic.proficiency * 100)}%
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {result.achievements.length ? (
              <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                <b>Achievement unlocked</b>
                {result.achievements.map((achievement) => (
                  <div className="mt-3" key={achievement.slug}>
                    <p className="font-black">{achievement.name}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {achievement.description}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--accent)]">
                      +{achievement.insightAwarded} Insight
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-5 border-t border-white/10 pt-5">
              <QuestionFeedback
                attemptId={result.attemptId}
                ref={questionFeedback}
              />
            </div>
          </div>
        </Card>
        <Button
          className="mt-5 w-full"
          disabled={advancingToNext}
          onClick={() => void advanceToNext()}
        >
          {advancingToNext ? "Saving feedback…" : "Next question"}{" "}
          <ChevronRight className="ml-2" size={18} />
        </Button>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Press{" "}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-bold">
            Enter
          </kbd>{" "}
          to continue
        </p>
        {showBreak ? (
          <Card className="mt-5 border-amber-300/30 p-5">
            <div className="flex gap-4">
              <Pause className="shrink-0 text-[var(--accent)]" />
              <div>
                <b>Nice run. Time for a quick break?</b>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  You can stop here or keep playing—your progress is already
                  saved.
                </p>
                <button
                  className="mt-3 text-sm font-bold text-[var(--brand)]"
                  onClick={() => setBreakDismissed(true)}
                  type="button"
                >
                  Keep playing
                </button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    );

  if (!presentation) return null;
  const answerIsSubmitting = phase === "submitting";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="rounded-full bg-white/5 px-3 py-1.5 font-bold">
          {presentation.topic.name}
        </span>
        <DifficultyStars difficulty={presentation.difficulty} size={16} />
        <span className="ml-auto inline-flex items-center gap-2 font-black text-[var(--accent)]">
          <Clock3 size={16} />
          {mediaReady
            ? answerIsSubmitting
              ? `Submitted with ${Math.ceil(remainingMs / 1000)}s left · ${livePoints} pts if correct`
              : `${Math.ceil(remainingMs / 1000)}s · ${livePoints} pts`
            : "Loading media…"}
        </span>
      </div>
      <QuestionTimerBar ratio={timeRatio} />
      <Card className="mt-5 p-6 sm:p-9">
        {presentation.media ? (
          <div className="mb-7">
            <MediaPrompt
              media={presentation.media}
              onReady={() => void markMediaReady()}
            />
          </div>
        ) : null}
        <h1 className="text-2xl font-black leading-tight sm:text-4xl">
          {presentation.prompt}
        </h1>
        {presentation.answerMode === "required_choice" ? (
          <p className="mt-4 text-sm font-bold text-[var(--muted)]">
            Multiple choice · shown at 50% value
          </p>
        ) : null}
        {choices ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {choices.choices.map((choice) => (
              <button
                className={`min-h-14 rounded-2xl border p-4 text-left font-bold ${answer === choice.text ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 hover:bg-white/5"}`}
                disabled={!mediaReady || answerIsSubmitting}
                key={choice.id}
                onClick={() => {
                  setAnswer(choice.text);
                  if (immediateChoiceSubmit) void submit(choice.text);
                }}
                type="button"
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <input
            autoComplete="off"
            autoFocus
            className="mt-8 min-h-14 w-full rounded-2xl border border-white/15 bg-slate-950/45 px-5 text-lg"
            disabled={!mediaReady || answerIsSubmitting}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && answer.trim()) void submit(answer);
            }}
            placeholder={
              mediaReady
                ? "Type your answer"
                : "Timer starts when media is ready"
            }
            value={answer}
          />
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          {!choices || !immediateChoiceSubmit ? (
            <Button
              disabled={!mediaReady || !answer.trim() || answerIsSubmitting}
              onClick={() => submit(answer)}
            >
              {answerIsSubmitting ? "Checking answer…" : "Lock in answer"}
            </Button>
          ) : null}
          {!choices ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 font-bold hover:bg-white/5 disabled:opacity-50"
              disabled={!mediaReady || answerIsSubmitting}
              onClick={revealChoices}
              type="button"
            >
              <HelpCircle size={18} />
              Show choices
            </button>
          ) : null}
        </div>
        {choices && immediateChoiceSubmit ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Selecting a choice submits it immediately.
          </p>
        ) : null}
        {answerIsSubmitting ? (
          <p
            aria-live="polite"
            className="mt-3 text-sm font-bold text-[var(--brand)]"
          >
            Answer submitted. Checking it now…
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
      <div className="mt-5">
        <QuestionTimerBar decorative ratio={timeRatio} />
      </div>
    </div>
  );
}
