import { Check, Megaphone, Sparkles } from "lucide-react";
import {
  hasSignificantQuestionChanges,
  questionChangesSummary,
  RELEASES,
  unreadReleaseVersions,
  visibleRelease,
} from "@/domain/release-notes";
import { APP_VERSION, DISPLAY_VERSION } from "@/lib/app-version";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const { user, profile, supabase } = await requireUser();
  const isAdmin = profile.role === "sys_admin";
  const lastReadVersion = profile.last_updates_read_version;
  const unreadVersions = new Set(unreadReleaseVersions(lastReadVersion));

  if (lastReadVersion !== APP_VERSION) {
    await supabase
      .from("profiles")
      .update({ last_updates_read_version: APP_VERSION })
      .eq("id", user.id);
  }

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[.2em] text-[var(--brand)]">
          Updates
        </p>
        <h1 className="mt-2 text-4xl font-black">
          What&apos;s new in Mindspan
        </h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          New features, gameplay improvements, and important fixes. You&apos;re
          currently using {DISPLAY_VERSION}.
        </p>
      </header>

      <div className="space-y-6">
        {RELEASES.map((rawRelease, index) => {
          const release = visibleRelease(rawRelease, isAdmin);
          const isUnread = unreadVersions.has(release.version);
          return (
            <article
              className={`overflow-hidden rounded-3xl border bg-[var(--panel)] ${
                isUnread
                  ? "border-[var(--brand)]/60 shadow-lg shadow-emerald-950/20"
                  : "border-white/10"
              }`}
              key={release.version}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-6 sm:p-8">
                <div className="flex gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
                    {isUnread ? (
                      <Sparkles aria-hidden="true" size={22} />
                    ) : (
                      <Megaphone aria-hidden="true" size={22} />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--brand)]">
                        v{release.version}
                      </p>
                      {isUnread ? (
                        <span className="rounded-full bg-[var(--brand)]/10 px-2.5 py-1 text-[.68rem] font-black uppercase tracking-[.1em] text-[var(--brand)]">
                          New since your last visit
                        </span>
                      ) : null}
                      {index === 0 ? (
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[.68rem] font-black uppercase tracking-[.1em] text-slate-300">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 text-2xl font-black">
                      {release.title}
                    </h2>
                  </div>
                </div>
                <time
                  className="text-sm font-bold text-[var(--muted)]"
                  dateTime={release.releasedAt}
                >
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${release.releasedAt}T00:00:00Z`))}
                </time>
              </div>

              <div className="space-y-7 p-6 sm:p-8">
                <p className="max-w-3xl text-lg leading-8 text-slate-200">
                  {release.summary}
                </p>
                {hasSignificantQuestionChanges(release.questionChanges) ? (
                  <p className="inline-flex rounded-full bg-white/[.04] px-4 py-2 text-sm font-bold text-slate-300">
                    Question changes:{" "}
                    {questionChangesSummary(release.questionChanges!)}
                  </p>
                ) : null}
                <div className="grid gap-7 md:grid-cols-2">
                  {release.sections.map((section) => (
                    <section key={section.heading}>
                      <h3 className="font-black">{section.heading}</h3>
                      <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                        {section.items.map((item) => (
                          <li className="flex gap-2.5" key={item.text}>
                            <Check
                              aria-hidden="true"
                              className="mt-1 shrink-0 text-[var(--brand)]"
                              size={16}
                            />
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
