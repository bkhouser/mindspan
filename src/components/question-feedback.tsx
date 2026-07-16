"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export type QuestionFeedbackReason =
  | "incorrect_answer"
  | "should_have_been_accepted"
  | "wrong_topic"
  | "answer_given_away"
  | "unclear"
  | "difficulty"
  | "weak_explanation"
  | "poor_choices"
  | "typo"
  | "outdated"
  | "media"
  | "other";

export interface QuestionFeedbackValue {
  sentiment: "up" | "down";
  reasons: QuestionFeedbackReason[];
  comment: string | null;
}

export interface QuestionFeedbackHandle {
  savePending: () => Promise<boolean>;
}

const reasonLabels: Array<{
  value: QuestionFeedbackReason;
  label: string;
}> = [
  { value: "incorrect_answer", label: "Incorrect answer" },
  {
    value: "should_have_been_accepted",
    label: "My answer should be accepted",
  },
  { value: "wrong_topic", label: "Wrong topic" },
  { value: "answer_given_away", label: "Answer is given away" },
  { value: "unclear", label: "Unclear" },
  { value: "difficulty", label: "Difficulty feels wrong" },
  { value: "weak_explanation", label: "Weak explanation" },
  { value: "poor_choices", label: "Poor choices" },
  { value: "typo", label: "Typo or grammar" },
  { value: "outdated", label: "Outdated" },
  { value: "media", label: "Media problem" },
  { value: "other", label: "Other" },
];

async function saveFeedback(attemptId: string, value: QuestionFeedbackValue) {
  const response = await fetch("/api/question-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ attemptId, ...value }),
  });
  const result = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "Could not save question feedback",
    );
}

function feedbackKey(value: QuestionFeedbackValue) {
  return JSON.stringify({
    ...value,
    reasons: [...value.reasons].sort(),
  });
}

export const QuestionFeedback = forwardRef<
  QuestionFeedbackHandle,
  {
    attemptId: string;
    initialValue?: QuestionFeedbackValue | null;
  }
>(function QuestionFeedback({ attemptId, initialValue }, ref) {
  const [sentiment, setSentiment] = useState(initialValue?.sentiment);
  const [reasons, setReasons] = useState<QuestionFeedbackReason[]>(
    initialValue?.reasons ?? [],
  );
  const [comment, setComment] = useState(initialValue?.comment ?? "");
  const [expanded, setExpanded] = useState(
    initialValue?.sentiment === "down" &&
      Boolean(initialValue.reasons.length || initialValue.comment),
  );
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const lastSaved = useRef(
    initialValue ? feedbackKey(initialValue) : undefined,
  );
  const inFlight = useRef<Promise<boolean> | null>(null);

  function currentValue(): QuestionFeedbackValue | null {
    if (!sentiment) return null;
    return {
      sentiment,
      reasons: sentiment === "down" ? reasons : [],
      comment: sentiment === "down" && comment.trim() ? comment.trim() : null,
    };
  }

  async function persist(value: QuestionFeedbackValue): Promise<boolean> {
    if (inFlight.current) await inFlight.current;
    if (lastSaved.current === feedbackKey(value)) return true;

    setMessage(undefined);
    setPending(true);
    const request = (async () => {
      try {
        await saveFeedback(attemptId, value);
        lastSaved.current = feedbackKey(value);
        setMessage("Saved");
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save");
        return false;
      } finally {
        setPending(false);
      }
    })();
    inFlight.current = request;
    const saved = await request;
    if (inFlight.current === request) inFlight.current = null;
    return saved;
  }

  useImperativeHandle(ref, () => ({
    async savePending() {
      if (inFlight.current) await inFlight.current;
      const value = currentValue();
      if (!value || lastSaved.current === feedbackKey(value)) return true;
      return persist(value);
    },
  }));

  function choose(next: "up" | "down") {
    setSentiment(next);
    if (next === "up") {
      setReasons([]);
      setComment("");
      setExpanded(false);
      void persist({ sentiment: "up", reasons: [], comment: null });
      return;
    }
    setExpanded(true);
    void persist({ sentiment: "down", reasons, comment: comment || null });
  }

  function toggleReason(value: QuestionFeedbackReason) {
    setReasons((current) =>
      current.includes(value)
        ? current.filter((reason) => reason !== value)
        : [...current, value],
    );
  }

  return (
    <div className="text-sm" data-enter-advance-blocker={expanded || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-[var(--muted)]">Question feedback</span>
        {(["up", "down"] as const).map((value) => (
          <button
            aria-label={
              value === "up" ? "Good question" : "Question needs work"
            }
            aria-pressed={sentiment === value}
            className={`grid size-8 place-items-center rounded-full border text-base transition ${
              sentiment === value
                ? "border-[var(--brand)] bg-[var(--brand)]/15"
                : "border-white/10 bg-white/[.03] opacity-70 hover:opacity-100"
            }`}
            disabled={pending}
            key={value}
            onClick={() => choose(value)}
            title={value === "up" ? "Good question" : "Question needs work"}
            type="button"
          >
            <span aria-hidden="true">{value === "up" ? "👍" : "👎"}</span>
          </button>
        ))}
        {message ? (
          <span className="text-xs text-[var(--muted)]" role="status">
            {message}
          </span>
        ) : null}
      </div>
      {expanded && sentiment === "down" ? (
        <div className="mt-3 max-w-2xl rounded-2xl border border-white/10 bg-white/[.035] p-3">
          <p className="text-xs font-bold text-[var(--muted)]">
            Optional details
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reasonLabels.map((reason) => (
              <label
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold ${
                  reasons.includes(reason.value)
                    ? "border-rose-200/50 bg-rose-300/10 text-rose-100"
                    : "border-white/10 text-[var(--muted)]"
                }`}
                key={reason.value}
              >
                <input
                  checked={reasons.includes(reason.value)}
                  className="sr-only"
                  onChange={() => toggleReason(reason.value)}
                  type="checkbox"
                />
                {reason.label}
              </label>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm"
            maxLength={1000}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional note"
            value={comment}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-black hover:bg-white/15"
              disabled={pending}
              onClick={() =>
                void persist({
                  sentiment: "down",
                  reasons,
                  comment: comment.trim() || null,
                })
              }
              type="button"
            >
              Save details
            </button>
            <button
              className="text-xs font-bold text-[var(--muted)]"
              onClick={() => setExpanded(false)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
