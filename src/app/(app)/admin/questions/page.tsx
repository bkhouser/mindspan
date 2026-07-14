import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireSysAdmin } from "@/lib/auth";
import {
  createQuestion,
  publishQuestion,
  updateQuestionSubtopics,
} from "./actions";

export default async function QuestionsAdminPage() {
  const { supabase } = await requireSysAdmin();
  const [{ data: topics }, { data: packs }, { data: questions }] =
    await Promise.all([
      supabase.from("topics").select("id,name").order("sort_order"),
      supabase.from("packs").select("id,name").order("name"),
      supabase
        .from("question_versions")
        .select(
          "id,question_id,prompt,status,difficulty,answer_mode,topics(id,name),questions(question_subtopics(subtopics(name)))",
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
  const inputClass =
    "min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/50 px-3";
  return (
    <>
      <Link className="text-sm font-bold text-[var(--brand)]" href="/admin">
        ← Control room
      </Link>
      <h1 className="mt-4 text-4xl font-black">Question workshop</h1>
      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <Card className="p-6">
          <h2 className="text-xl font-black">Author a question</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            New questions enter review before they can be published.
          </p>
          <form
            action={createQuestion}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <select className={inputClass} name="topicId" required>
              <option value="">Topic</option>
              {topics?.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            <select className={inputClass} name="packId" required>
              <option value="">Pack</option>
              {packs?.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name}
                </option>
              ))}
            </select>
            <input
              className={`${inputClass} sm:col-span-2`}
              name="subtopics"
              placeholder="Subtopics separated by | (for example: Opera | Classical)"
            />
            <textarea
              className={`${inputClass} min-h-24 sm:col-span-2`}
              name="prompt"
              placeholder="Question prompt"
              required
            />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/15 px-3 text-sm font-bold sm:col-span-2">
              <input
                className="size-4 accent-[var(--brand)]"
                name="answerMode"
                type="checkbox"
                value="required_choice"
              />
              Required multiple choice (always shown at 50% value)
            </label>
            <input
              className={inputClass}
              name="answer"
              placeholder="Canonical answer"
              required
            />
            <input
              className={inputClass}
              name="aliases"
              placeholder="Aliases separated by |"
            />
            <input
              className={inputClass}
              name="distractor1"
              placeholder="Distractor 1"
              required
            />
            <input
              className={inputClass}
              name="distractor2"
              placeholder="Distractor 2"
              required
            />
            <input
              className={inputClass}
              name="distractor3"
              placeholder="Distractor 3"
              required
            />
            <select className={inputClass} defaultValue="3" name="difficulty">
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <input
              className={inputClass}
              defaultValue="30"
              max="90"
              min="15"
              name="timeLimit"
              type="number"
            />
            <textarea
              className={`${inputClass} min-h-20 sm:col-span-2`}
              name="explanation"
              placeholder="Concise explanation"
              required
            />
            <textarea
              className={`${inputClass} min-h-28 sm:col-span-2`}
              name="details"
              placeholder="Deeper context"
              required
            />
            <input
              className={inputClass}
              name="sourceLabel"
              placeholder="Source name"
              required
            />
            <input
              className={inputClass}
              name="sourceUrl"
              placeholder="https://…"
              required
              type="url"
            />
            <button
              className="min-h-11 rounded-full bg-[var(--brand)] font-black text-slate-950 sm:col-span-2"
              type="submit"
            >
              Send to review
            </button>
          </form>
        </Card>
        <Card className="h-fit p-6">
          <h2 className="text-xl font-black">Recent content</h2>
          <div className="mt-4 divide-y divide-white/10">
            {questions?.map((question) => {
              const topic = Array.isArray(question.topics)
                ? question.topics[0]
                : question.topics;
              const sourceQuestion = Array.isArray(question.questions)
                ? question.questions[0]
                : question.questions;
              const subtopics =
                sourceQuestion?.question_subtopics
                  ?.flatMap(
                    (link: {
                      subtopics:
                        { name: string } | Array<{ name: string }> | null;
                    }) => {
                      const subtopic = Array.isArray(link.subtopics)
                        ? link.subtopics[0]
                        : link.subtopics;
                      return subtopic?.name ? [subtopic.name] : [];
                    },
                  )
                  .join(" | ") ?? "";
              return (
                <div className="py-4" key={question.id}>
                  <div className="flex gap-2 text-xs">
                    <b className="text-[var(--brand)]">{topic?.name}</b>
                    <span>Difficulty {question.difficulty}</span>
                    {question.answer_mode === "required_choice" ? (
                      <span>Required choice · 50%</span>
                    ) : null}
                    <span className="ml-auto uppercase">{question.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{question.prompt}</p>
                  <form
                    action={updateQuestionSubtopics}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      name="questionId"
                      type="hidden"
                      value={question.question_id}
                    />
                    <input name="topicId" type="hidden" value={topic?.id} />
                    <input
                      aria-label={`Subtopics for ${question.prompt}`}
                      className="min-h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-2 text-xs"
                      defaultValue={subtopics}
                      name="subtopics"
                      placeholder="Subtopics separated by |"
                    />
                    <button className="text-xs font-bold text-[var(--brand)]">
                      Save
                    </button>
                  </form>
                  {question.status === "review" ? (
                    <form action={publishQuestion} className="mt-3">
                      <input
                        name="versionId"
                        type="hidden"
                        value={question.id}
                      />
                      <button className="text-sm font-black text-emerald-300">
                        Publish
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </>
  );
}
