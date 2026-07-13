"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  Pause,
  XCircle,
} from "lucide-react";
import type {
  AttemptResult,
  ChoiceReveal,
  PlayMode,
  QuestionPresentation,
} from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaPrompt } from "@/components/media-prompt";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { DifficultyStars } from "@/components/difficulty-stars";
import { QuestionTimerBar } from "@/components/question-timer-bar";
import { remainingScoringRatio } from "@/domain/timer-rules";
import { useEnterToAdvance } from "@/hooks/use-enter-to-advance";

interface Option {
  id: string;
  name: string;
}
interface Props {
  initialMode: PlayMode;
  topics: Option[];
  packs: Option[];
  groups: Array<Option & { timerSecondsOverride: number | null }>;
  globalTimerSeconds: number;
  immediateChoiceSubmit: boolean;
}
type Phase = "setup" | "loading" | "question" | "result";

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
  topics,
  packs,
  groups,
  globalTimerSeconds,
  immediateChoiceSubmit,
}: Props) {
  const [mode, setMode] = useState<PlayMode>(initialMode);
  const [selectedId, setSelectedId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<
    "answer" | "wording" | "source" | "media" | "other"
  >("answer");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState<string>();
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [runElapsedMs, setRunElapsedMs] = useState(0);
  const submitting = useRef(false);
  const markingMediaReady = useRef(false);

  const loadNext = useCallback(async (activeSession: string) => {
    setPhase("loading");
    setError(undefined);
    setAnswer("");
    setChoices(undefined);
    setResult(undefined);
    setReportOpen(false);
    setReportDetails("");
    setReportStatus(undefined);
    submitting.current = false;
    try {
      const next = await api<QuestionPresentation>(
        `/api/play/sessions/${activeSession}/next`,
        {},
      );
      setPresentation(next);
      setRemainingMs(next.timeLimitSeconds * 1000);
      setMediaReady(!next.media);
      markingMediaReady.current = false;
      setPhase("question");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load a question",
      );
      setPhase("setup");
    }
  }, []);

  async function start() {
    setPhase("loading");
    setError(undefined);
    setRunStartedAt(Date.now());
    setRunElapsedMs(0);
    try {
      const session = await api<{ id: string }>("/api/play/sessions", {
        mode,
        topicId: mode === "topic" ? selectedId : undefined,
        packId: mode === "pack" ? selectedId : undefined,
        groupId: selectedGroupId || undefined,
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
  }

  const submit = useCallback(
    async (value: string, timedOut = false) => {
      if (!presentation || submitting.current) return;
      submitting.current = true;
      try {
        const response = await api<AttemptResult>(
          `/api/play/presentations/${presentation.id}/answer`,
          { answer: value, timedOut, idempotencyKey: crypto.randomUUID() },
        );
        setResult(response);
        setQuestionCount((count) => count + 1);
        setPhase("result");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not submit answer",
        );
        submitting.current = false;
      }
    },
    [presentation],
  );

  useEnterToAdvance(
    phase === "result" && Boolean(sessionId) && !reportOpen,
    () => (sessionId ? loadNext(sessionId) : undefined),
  );

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

  async function submitReport() {
    if (!presentation || reportDetails.trim().length < 3) return;
    try {
      await api<{ id: string }>(
        `/api/play/presentations/${presentation.id}/report`,
        { category: reportCategory, details: reportDetails },
      );
      setReportStatus("Thanks — your report is in the review queue.");
      setReportOpen(false);
    } catch (requestError) {
      setReportStatus(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit the report",
      );
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
          (choices ? 0.5 : 1) *
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
        <label className="mt-5 block text-sm font-bold">
          Timer rules
          <select
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-[var(--surface)] px-4"
            onChange={(event) => setSelectedGroupId(event.target.value)}
            value={selectedGroupId}
          >
            <option value="">
              Personal play — global default ({globalTimerSeconds}s)
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} —{" "}
                {group.timerSecondsOverride ?? globalTimerSeconds}s
                {group.timerSecondsOverride ? " override" : " global"}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          A group can change the answer window. Time-based points and mastery
          remain normalized to the {globalTimerSeconds}-second global baseline.
        </p>
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
          className={`overflow-hidden border-t-4 ${result.correct ? "border-t-emerald-300" : "border-t-rose-300"}`}
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              {result.correct ? (
                <CheckCircle2 className="text-emerald-300" />
              ) : (
                <XCircle className="text-rose-300" />
              )}
              <p className="font-black">
                {result.correct ? "That’s right" : "Not this time"}
              </p>
              <b className="ml-auto text-[var(--accent)]">
                +{result.earnedPoints} pts
              </b>
            </div>
            <h2 className="mt-7 text-3xl font-black">
              {result.canonicalAnswer}
            </h2>
            <p className="mt-4 text-lg leading-8">{result.explanation}</p>
            <div className="mt-5 rounded-2xl bg-white/5 p-4">
              <p className="leading-7 text-[var(--muted)]">{result.details}</p>
              <a
                className="mt-3 inline-block text-sm font-bold text-[var(--brand)] underline"
                href={result.source.url}
                rel="noreferrer"
                target="_blank"
              >
                {result.source.label}
              </a>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-300/10 p-4">
              <span className="text-sm">
                {presentation.topic.name} proficiency
              </span>
              <b>{Math.round(result.topicMastery.proficiency * 100)}%</b>
            </div>
            {result.subtopicMastery.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.subtopicMastery.map((subtopic) => (
                  <span
                    className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-[var(--muted)]"
                    key={subtopic.id}
                  >
                    {subtopic.name} {Math.round(subtopic.proficiency * 100)}%
                  </span>
                ))}
              </div>
            ) : null}
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
              <button
                className="text-sm font-bold text-[var(--muted)] underline decoration-white/20 underline-offset-4 hover:text-white"
                onClick={() => setReportOpen((open) => !open)}
                type="button"
              >
                Report a problem with this question
              </button>
              {reportOpen ? (
                <div className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-4">
                  <select
                    aria-label="Report category"
                    className="min-h-11 rounded-xl border border-white/15 bg-[var(--surface)] px-3"
                    onChange={(event) =>
                      setReportCategory(
                        event.target.value as typeof reportCategory,
                      )
                    }
                    value={reportCategory}
                  >
                    <option value="answer">Answer</option>
                    <option value="wording">Wording</option>
                    <option value="source">Source</option>
                    <option value="media">Media</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    className="min-h-24 rounded-xl border border-white/15 bg-slate-950/45 p-3"
                    maxLength={1000}
                    onChange={(event) => setReportDetails(event.target.value)}
                    placeholder="What should our reviewers check?"
                    value={reportDetails}
                  />
                  <Button
                    disabled={reportDetails.trim().length < 3}
                    onClick={submitReport}
                  >
                    Send report
                  </Button>
                </div>
              ) : null}
              {reportStatus ? (
                <p className="mt-3 text-sm text-[var(--muted)]" role="status">
                  {reportStatus}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
        <Button
          className="mt-5 w-full"
          onClick={() => sessionId && loadNext(sessionId)}
        >
          Next question <ChevronRight className="ml-2" size={18} />
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
            ? `${Math.ceil(remainingMs / 1000)}s · ${livePoints} pts`
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
        {choices ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {choices.choices.map((choice) => (
              <button
                className={`min-h-14 rounded-2xl border p-4 text-left font-bold ${answer === choice.text ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 hover:bg-white/5"}`}
                disabled={!mediaReady}
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
            disabled={!mediaReady}
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
              disabled={!mediaReady || !answer.trim()}
              onClick={() => submit(answer)}
            >
              Lock in answer
            </Button>
          ) : null}
          {!choices ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 font-bold hover:bg-white/5 disabled:opacity-50"
              disabled={!mediaReady}
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
