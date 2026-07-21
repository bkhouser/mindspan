import type { TopicMastery } from "@/domain/types";

interface MemberCoverage {
  id: string;
  name: string;
  mastery: TopicMastery[];
}

interface TopicCoverage {
  id: string;
  name: string;
  strongMembers: MemberCoverage[];
  averageAccuracy: number;
}

function isStrong(mastery: TopicMastery | undefined) {
  return mastery?.rankScore !== null && (mastery?.rankScore ?? 0) >= 0.5;
}

function compactList(values: string[], limit = 3) {
  const visible = values.slice(0, limit).join(", ");
  const remaining = values.length - limit;
  return remaining > 0 ? `${visible} +${remaining} more` : visible;
}

export function GroupCoverage({
  members,
  topics,
}: {
  members: MemberCoverage[];
  topics: Array<{ id: string; name: string }>;
}) {
  const coverage: TopicCoverage[] = topics.map((topic) => {
    const played = members.flatMap((member) => {
      const mastery = member.mastery.find((item) => item.topicId === topic.id);
      return mastery ? [mastery] : [];
    });
    return {
      ...topic,
      strongMembers: members.filter((member) =>
        isStrong(
          member.mastery.find((item) => item.topicId === topic.id),
        ),
      ),
      averageAccuracy: played.length
        ? played.reduce((sum, mastery) => sum + mastery.proficiency, 0) /
          played.length
        : 0,
    };
  });
  const bestCovered = [...coverage].sort(
    (left, right) =>
      right.strongMembers.length - left.strongMembers.length ||
      right.averageAccuracy - left.averageAccuracy ||
      left.name.localeCompare(right.name),
  )[0];
  const singlePlayerStrengths = coverage
    .filter((topic) => topic.strongMembers.length === 1)
    .sort(
      (left, right) =>
        right.averageAccuracy - left.averageAccuracy ||
        left.name.localeCompare(right.name),
    );
  const coverageGaps = coverage
    .filter((topic) => topic.strongMembers.length === 0)
    .sort(
      (left, right) =>
        right.averageAccuracy - left.averageAccuracy ||
        left.name.localeCompare(right.name),
    );

  return (
    <div className="mt-4">
      <p className="text-xs leading-5 text-[var(--muted)]">
        Each equal-sized cell shows that member&apos;s percentage answered
        correctly. A dash means the topic has not been played; deeper color
        means a higher percentage.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-2 text-sm">
          <colgroup>
            <col className="w-36" />
            {topics.map((topic) => (
              <col className="w-24" key={topic.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="text-left" scope="col">
                Member
              </th>
              {topics.map((topic) => (
                <th
                  className="px-1 text-center text-xs leading-4"
                  key={topic.id}
                  scope="col"
                >
                  {topic.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <th
                  className="truncate text-left"
                  scope="row"
                  title={member.name}
                >
                  {member.name}
                </th>
                {topics.map((topic) => {
                  const mastery = member.mastery.find(
                    (item) => item.topicId === topic.id,
                  );
                  if (!mastery)
                    return (
                      <td key={topic.id}>
                        <div
                          aria-label={`${member.name}, ${topic.name}: not played`}
                          className="grid h-11 place-items-center rounded-lg border border-white/[.06] bg-[var(--surface-raised)] text-xs font-black text-[var(--muted)]"
                        >
                          &mdash;
                        </div>
                      </td>
                    );
                  const percent = Math.round(mastery.proficiency * 100);
                  return (
                    <td key={topic.id}>
                      <div
                        aria-label={`${member.name}, ${topic.name}: ${percent} percent correct`}
                        className="grid h-11 place-items-center rounded-lg border border-white/[.08] text-xs font-black text-white"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--brand) ${percent}%, var(--surface-raised))`,
                        }}
                        title={`${percent}% correct across ${mastery.uniqueQuestions} different question${mastery.uniqueQuestions === 1 ? "" : "s"}`}
                      >
                        {percent}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <section className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.045] p-4">
          <p className="text-xs font-black uppercase tracking-[.12em] text-emerald-100">
            Best covered
          </p>
          {bestCovered?.strongMembers.length ? (
            <>
              <b className="mt-2 block">{bestCovered.name}</b>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                {bestCovered.strongMembers.length} strong member
                {bestCovered.strongMembers.length === 1 ? "" : "s"}: {" "}
                {compactList(
                  bestCovered.strongMembers.map((member) => member.name),
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No topic has strong coverage yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-sky-300/15 bg-sky-300/[.045] p-4">
          <p className="text-xs font-black uppercase tracking-[.12em] text-sky-100">
            Single-player strengths
          </p>
          {singlePlayerStrengths.length ? (
            <ul className="mt-2 space-y-1 text-sm leading-5">
              {singlePlayerStrengths.slice(0, 3).map((topic) => (
                <li key={topic.id}>
                  <b>{topic.name}</b>
                  <span className="text-[var(--muted)]">
                    {" "}&mdash; {topic.strongMembers[0].name}
                  </span>
                </li>
              ))}
              {singlePlayerStrengths.length > 3 ? (
                <li className="text-xs text-[var(--muted)]">
                  +{singlePlayerStrengths.length - 3} more
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No topic is covered by exactly one strong member.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200/15 bg-amber-200/[.045] p-4">
          <p className="text-xs font-black uppercase tracking-[.12em] text-amber-100">
            Coverage gaps
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
            {coverageGaps.length
              ? compactList(coverageGaps.map((topic) => topic.name))
              : "Every topic has at least one strong member."}
          </p>
        </section>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        Strong means a confidence-adjusted topic score of at least 50% after
        answering at least five different questions.
      </p>
    </div>
  );
}
