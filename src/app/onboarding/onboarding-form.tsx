"use client";

import { Brain, Compass } from "lucide-react";
import { useState, useActionState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/card";
import { completeOnboarding, type OnboardingState } from "./actions";

type TopicOption = {
  id: string;
  name: string;
  description: string;
};

const initialState: OnboardingState = {};

function IntentButton({ intent }: { intent: "assessment" | "skip" }) {
  const { pending } = useFormStatus();
  const assessment = intent === "assessment";
  const Icon = assessment ? Brain : Compass;
  return (
    <button
      className={
        assessment
          ? "flex min-h-28 items-center gap-4 rounded-3xl bg-[var(--brand)] p-5 text-left font-black text-slate-950 disabled:opacity-60"
          : "flex min-h-28 items-center gap-4 rounded-3xl border border-white/15 bg-white/5 p-5 text-left font-black disabled:opacity-60"
      }
      disabled={pending}
      name="intent"
      type="submit"
      value={intent}
    >
      <Icon aria-hidden="true" />
      <span>
        {assessment ? "Take the assessment" : "Start exploring"}
        <small
          className={`mt-1 block font-medium ${assessment ? "" : "text-[var(--muted)]"}`}
        >
          {pending
            ? "Saving your choices…"
            : assessment
              ? "32 adaptive questions"
              : "Skip without penalty"}
        </small>
      </span>
    </button>
  );
}

export function OnboardingForm({
  initialDisplayName,
  topics,
}: {
  initialDisplayName: string;
  topics: TopicOption[];
}) {
  const [state, action] = useActionState(completeOnboarding, initialState);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [clientError, setClientError] = useState<string>();

  function validate(event: FormEvent<HTMLFormElement>) {
    if (selectedTopics.length > 0) return;
    event.preventDefault();
    setClientError("Choose at least one topic before continuing.");
  }

  function toggleTopic(topicId: string, selected: boolean) {
    setSelectedTopics((current) =>
      selected ? [...current, topicId] : current.filter((id) => id !== topicId),
    );
    if (selected) setClientError(undefined);
  }

  const error = clientError ?? state.error;

  return (
    <form action={action} className="mt-9 space-y-8" onSubmit={validate}>
      <Card className="p-6">
        <label className="text-sm font-black" htmlFor="displayName">
          Display name
        </label>
        <input
          className="mt-3 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4"
          id="displayName"
          maxLength={50}
          name="displayName"
          onChange={(event) => setDisplayName(event.target.value)}
          required
          value={displayName}
        />
      </Card>
      <fieldset
        aria-describedby={error ? "onboarding-error" : undefined}
        className="grid gap-4 sm:grid-cols-2"
      >
        <legend className="sr-only">Select interest topics</legend>
        {topics.map((topic) => (
          <label
            className="group cursor-pointer rounded-3xl border border-white/10 bg-[var(--surface)] p-5 has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-300/10"
            key={topic.id}
          >
            <input
              checked={selectedTopics.includes(topic.id)}
              className="mr-3 accent-emerald-300"
              name="topics"
              onChange={(event) => toggleTopic(topic.id, event.target.checked)}
              type="checkbox"
              value={topic.id}
            />
            <b>{topic.name}</b>
            <span className="mt-2 block pl-7 text-sm leading-6 text-[var(--muted)]">
              {topic.description}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 p-4 text-sm leading-6">
        <input
          checked={ageConfirmed}
          className="mt-1 accent-emerald-300"
          name="ageConfirmed"
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          required
          type="checkbox"
        />
        <span>I confirm that I am at least 13 years old.</span>
      </label>
      {error ? (
        <p
          className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
          id="onboarding-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <IntentButton intent="assessment" />
        <IntentButton intent="skip" />
      </div>
    </form>
  );
}
