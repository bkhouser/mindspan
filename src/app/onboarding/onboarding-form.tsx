"use client";

import { Compass } from "lucide-react";
import { useActionState, useRef, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/card";
import { completeOnboarding, type OnboardingState } from "./actions";

type TopicOption = {
  id: string;
  name: string;
  description: string;
};

const initialState: OnboardingState = {};

function ContinueButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="flex min-h-20 w-full items-center justify-center gap-4 rounded-3xl bg-[var(--brand)] p-5 text-left font-black text-slate-950 disabled:opacity-60 sm:w-auto sm:justify-start"
      disabled={pending}
      type="submit"
    >
      <Compass aria-hidden="true" />
      <span>
        Start exploring
        <small className="mt-1 block font-medium">
          {pending ? "Saving your choices…" : "Enter Mindspan"}
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
  const topicErrorRef = useRef<HTMLParagraphElement>(null);

  function validate(event: FormEvent<HTMLFormElement>) {
    const selectedTopics = new FormData(event.currentTarget).getAll("topics");
    if (selectedTopics.length > 0) return;
    event.preventDefault();
    if (topicErrorRef.current) topicErrorRef.current.hidden = false;
  }

  const error = state.error;

  return (
    <form
      action={action}
      className="mt-9 space-y-8"
      key={state.submissionKey ?? "initial"}
      onSubmit={validate}
    >
      <Card className="p-6">
        <label className="text-sm font-black" htmlFor="displayName">
          Display name
        </label>
        <input
          className="mt-3 min-h-12 w-full rounded-2xl border border-white/15 bg-slate-950/55 px-4"
          id="displayName"
          maxLength={50}
          name="displayName"
          defaultValue={state.values?.displayName || initialDisplayName || undefined}
          required
        />
      </Card>
      <fieldset
        aria-describedby="onboarding-error"
        className="grid gap-4 sm:grid-cols-2"
      >
        <legend className="sr-only">Select interest topics</legend>
        {topics.map((topic) => (
          <label
            className="group cursor-pointer rounded-3xl border border-white/10 bg-[var(--surface)] p-5 has-[:checked]:border-emerald-300/60 has-[:checked]:bg-emerald-300/10"
            key={topic.id}
          >
            <input
              className="mr-3 accent-emerald-300"
              defaultChecked={state.values?.topics.includes(topic.id)}
              name="topics"
              onChange={() => {
                if (topicErrorRef.current) topicErrorRef.current.hidden = true;
              }}
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
          className="mt-1 accent-emerald-300"
          defaultChecked={state.values?.ageConfirmed}
          name="ageConfirmed"
          required
          type="checkbox"
        />
        <span>I confirm that I am at least 13 years old.</span>
      </label>
      <p
        className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
        hidden={!error}
        id="onboarding-error"
        ref={topicErrorRef}
        role="alert"
      >
        {error ?? "Choose at least one topic before continuing."}
      </p>
      <ContinueButton />
    </form>
  );
}
