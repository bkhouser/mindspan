"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type {
  AttemptResult,
  ChoiceReveal,
  QuestionPresentation,
} from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaPrompt } from "@/components/media-prompt";
import { AchievementCelebration } from "@/components/achievement-celebration";
import { DifficultyStars } from "@/components/difficulty-stars";
import { useEnterToAdvance } from "@/hooks/use-enter-to-advance";

async function api<T>(url: string, body: unknown = {}): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "Request failed");
  return json;
}

const subscribeToHydration = () => () => undefined;

interface Props {
  immediateChoiceSubmit?: boolean;
}

export function AssessmentGame({ immediateChoiceSubmit = false }: Props) {
  const [run, setRun] = useState<{ id: string; response_count: number }>();
  const [question, setQuestion] = useState<QuestionPresentation>();
  const [choices, setChoices] = useState<ChoiceReveal>();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult>();
  const [count, setCount] = useState(0);
  const [mediaReady, setMediaReady] = useState(true);
  const [error, setError] = useState<string>();
  const [starting, setStarting] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const submitting = useRef(false);
  const markingMediaReady = useRef(false);

  const next = useCallback(async (runId: string) => {
    setQuestion(undefined);
    setResult(undefined);
    setChoices(undefined);
    setAnswer("");
    setError(undefined);
    submitting.current = false;
    try {
      const value = await api<QuestionPresentation>(
        `/api/assessments/${runId}/next`,
      );
      setQuestion(value);
      setChoices(value.initialChoices);
      setMediaReady(!value.media);
      markingMediaReady.current = false;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load assessment",
      );
    }
  }, []);

  useEnterToAdvance(Boolean(result && run && count < 32), () =>
    run ? next(run.id) : undefined,
  );

  async function begin() {
    if (starting) return;
    setStarting(true);
    setError(undefined);
    try {
      const value = await api<{ id: string; response_count: number }>(
        "/api/assessments",
      );
      setRun(value);
      setCount(value.response_count);
      await next(value.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not start assessment",
      );
    } finally {
      setStarting(false);
    }
  }

  const submit = useCallback(
    async (value: string) => {
      if (!question || submitting.current) return;
      submitting.current = true;
      try {
        const outcome = await api<AttemptResult>(
          `/api/play/presentations/${question.id}/answer`,
          {
            answer: value,
            timedOut: false,
            idempotencyKey: crypto.randomUUID(),
          },
        );
        setResult(outcome);
        setCount((current) => current + 1);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not submit answer",
        );
        submitting.current = false;
      }
    },
    [question],
  );

  useEffect(() => {
    if (!question?.media || mediaReady || result || !question.mediaLoadDeadline)
      return;
    const delay = Math.max(
      0,
      new Date(question.mediaLoadDeadline).getTime() - Date.now(),
    );
    const timer = window.setTimeout(() => setMediaReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [mediaReady, question, result]);

  async function markMediaReady() {
    if (!question?.media || mediaReady || markingMediaReady.current) return;
    markingMediaReady.current = true;
    try {
      await api<{ expiresAt: string }>(
        `/api/play/presentations/${question.id}/ready`,
      );
      setMediaReady(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not prepare the media",
      );
      markingMediaReady.current = false;
    }
  }

  if (!run)
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-300/10 text-4xl">
          32
        </div>
        <h1 className="mt-7 text-4xl font-black">Map your starting point</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--muted)]">
          Four adaptive questions in each broad topic. Results personalize your
          starting proficiency; no points are at stake, and the assessment is
          untimed.
        </p>
        {error ? (
          <p className="mt-4 text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          aria-busy={starting}
          className="mt-7"
          disabled={!hydrated || starting}
          onClick={begin}
        >
          {starting ? "Starting assessment…" : "Begin assessment"}
        </Button>
      </div>
    );
  if (count >= 32)
    return (
      <div className="mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto text-[var(--brand)]" size={64} />
        <h1 className="mt-6 text-4xl font-black">Your map is ready</h1>
        <p className="mt-4 text-[var(--muted)]">
          Your answers have set a starting proficiency in all eight topics.
        </p>
        <a
          className="mt-7 inline-flex rounded-full bg-[var(--brand)] px-6 py-3 font-black text-slate-950"
          href="/home"
        >
          Explore Mindspan
        </a>
      </div>
    );
  if (!question)
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[var(--danger)]" role="alert">
              {error}
            </p>
            <Button className="mt-5" onClick={() => next(run.id)}>
              Try again
            </Button>
          </div>
        ) : (
          <div
            aria-label="Loading first assessment question"
            className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[var(--brand)]"
          />
        )}
      </div>
    );
  if (result)
    return (
      <div className="mx-auto max-w-2xl">
        <AchievementCelebration achievements={result.achievements} />
        <p className="mb-3 text-sm font-bold text-[var(--muted)]">
          Question {count} of 32
        </p>
        <Card className="p-7">
          <div className="flex items-center gap-3">
            {result.correct ? (
              <CheckCircle2 className="text-emerald-300" />
            ) : (
              <XCircle className="text-rose-300" />
            )}
            <b>{result.correct ? "Correct" : "The answer"}</b>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-2xl p-4 ${
                result.correct ? "bg-emerald-300/[.06]" : "bg-rose-950/30"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                Your answer
              </p>
              <p
                className={`mt-2 font-bold ${
                  result.correct ? "text-emerald-100" : "text-rose-100"
                }`}
              >
                {result.timedOut
                  ? "No answer — time expired"
                  : result.submittedAnswer.trim() || "No answer submitted"}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-300/[.06] p-4">
              <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--muted)]">
                Correct answer
              </p>
              <p className="mt-2 font-bold text-emerald-100">
                {result.canonicalAnswer}
              </p>
            </div>
          </div>
          <p className="mt-3 leading-7 text-[var(--muted)]">
            {result.explanation}
          </p>
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
        </Card>
        <Button className="mt-5 w-full" onClick={() => next(run.id)}>
          Continue
        </Button>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Press{" "}
          <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-bold">
            Enter
          </kbd>{" "}
          to continue
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3 text-sm font-bold">
        <span className="inline-flex items-center gap-2">
          {question.topic.name}
          <DifficultyStars difficulty={question.difficulty} />
        </span>
        <span>{mediaReady ? "Untimed" : "Loading media…"}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--brand)]"
          style={{ width: `${Math.max(0, (count / 32) * 100)}%` }}
        />
      </div>
      <Card className="mt-5 p-7">
        {question.media ? (
          <div className="mb-6">
            <MediaPrompt
              media={question.media}
              onReady={() => void markMediaReady()}
            />
          </div>
        ) : null}
        <h1 className="text-3xl font-black">{question.prompt}</h1>
        {question.answerMode === "required_choice" ? (
          <p className="mt-4 text-sm font-bold text-[var(--muted)]">
            Multiple choice
          </p>
        ) : null}
        {choices ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {choices.choices.map((choice) => (
              <button
                className={`rounded-2xl border p-4 text-left font-bold ${answer === choice.text ? "border-emerald-300 bg-emerald-300/10" : "border-white/15"}`}
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
            autoFocus
            className="mt-7 min-h-14 w-full rounded-2xl border border-white/15 bg-slate-950/50 px-5"
            disabled={!mediaReady}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && mediaReady && answer.trim()) {
                event.preventDefault();
                void submit(answer);
              }
            }}
            placeholder={mediaReady ? "Type your answer" : "Waiting for media"}
            value={answer}
          />
        )}
        <div className="mt-5 flex gap-3">
          {!choices || !immediateChoiceSubmit ? (
            <Button
              disabled={!mediaReady || !answer.trim()}
              onClick={() => submit(answer)}
            >
              Submit
            </Button>
          ) : null}
          {!choices ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 font-bold disabled:opacity-50"
              disabled={!mediaReady}
              onClick={async () =>
                setChoices(
                  await api(`/api/play/presentations/${question.id}/choices`),
                )
              }
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
        {error ? <p className="mt-4 text-[var(--danger)]">{error}</p> : null}
      </Card>
    </div>
  );
}
