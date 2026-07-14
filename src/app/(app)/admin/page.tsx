import {
  BookOpenCheck,
  Clock3,
  Flag,
  MessageSquareWarning,
  Package,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Card } from "@/components/ui/card";
import { requireSysAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import {
  createBetaInvite,
  togglePack,
  updateFeedbackStatus,
  updateGlobalTimer,
  updateUserRole,
} from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { supabase } = await requireSysAdmin();
  const query = await searchParams;
  const [
    { data: packs },
    { data: reports },
    { data: feedbackReports },
    { data: users },
    { count: questionCount },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("packs")
      .select("id,name,enabled,price_insight,is_starter")
      .order("name"),
    supabase
      .from("question_reports")
      .select("id,category,details,status,created_at,question_versions(prompt)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("feedback_reports")
      .select(
        "id,category,impact,description,expected_behavior,page_path,user_agent,app_version,contact_allowed,status,created_at,reporter:profiles!feedback_reports_reporter_user_id_fkey(display_name)",
      )
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("id,display_name,role,beta_access_granted_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("question_versions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("system_settings")
      .select("default_timer_seconds")
      .eq("id", true)
      .single(),
  ]);
  const inviteUrl = query.invite
    ? `${publicEnv().NEXT_PUBLIC_SITE_URL}/login?invite=${encodeURIComponent(query.invite)}`
    : null;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-200">
            System administration
          </p>
          <h1 className="mt-2 text-4xl font-black">Mindspan control room</h1>
        </div>
        <Link
          className="rounded-full bg-white/10 px-5 py-3 font-black"
          href="/admin/questions"
        >
          Question workshop
        </Link>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <Users className="text-[var(--brand)]" />
          <p className="mt-4 text-3xl font-black">{users?.length ?? 0}</p>
          <span className="text-sm text-[var(--muted)]">Recent users</span>
        </Card>
        <Card className="p-5">
          <BookOpenCheck className="text-[var(--brand)]" />
          <p className="mt-4 text-3xl font-black">{questionCount ?? 0}</p>
          <span className="text-sm text-[var(--muted)]">
            Published questions
          </span>
        </Card>
        <Card className="p-5">
          <Flag className="text-[var(--danger)]" />
          <p className="mt-4 text-3xl font-black">
            {(reports?.length ?? 0) + (feedbackReports?.length ?? 0)}
          </p>
          <span className="text-sm text-[var(--muted)]">Open reports</span>
        </Card>
      </section>
      {inviteUrl ? (
        <Card className="mt-6 border-emerald-300/30 p-5">
          <b>Beta invitation ready</b>
          <div className="mt-3 flex items-center gap-3">
            <input
              aria-label="Beta invitation link"
              className="min-h-11 min-w-0 flex-1 rounded-xl bg-slate-950/60 px-3 text-sm"
              readOnly
              value={inviteUrl}
            />
            <CopyButton value={inviteUrl} />
          </div>
        </Card>
      ) : null}
      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Clock3 className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Global answer timer</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            The default answer window for personal play and groups without an
            override. Authored question lengths scale proportionally.
          </p>
          <form
            action={updateGlobalTimer}
            className="mt-5 flex items-end gap-3"
          >
            <label className="text-sm font-bold">
              Baseline seconds
              <input
                className="mt-2 min-h-11 w-32 rounded-xl border border-white/15 bg-slate-950/50 px-3"
                defaultValue={settings?.default_timer_seconds ?? 30}
                max="120"
                min="10"
                name="seconds"
                required
                type="number"
              />
            </label>
            <button className="min-h-11 rounded-full bg-[var(--brand)] px-5 font-black text-slate-950">
              Save timer
            </button>
          </form>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="text-amber-200" />
            <h2 className="text-xl font-black">Invite a beta player</h2>
          </div>
          <form action={createBetaInvite} className="mt-5 flex gap-3">
            <input
              className="min-h-11 min-w-0 flex-1 rounded-2xl border border-white/15 bg-slate-950/50 px-4"
              name="email"
              placeholder="Optional email restriction"
              type="email"
            />
            <button
              className="rounded-full bg-[var(--brand)] px-5 font-black text-slate-950"
              type="submit"
            >
              Create
            </button>
          </form>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Package className="text-[var(--brand)]" />
            <h2 className="text-xl font-black">Global pack availability</h2>
          </div>
          <div className="mt-4 divide-y divide-white/10">
            {packs?.map((pack) => (
              <div className="flex items-center gap-3 py-3" key={pack.id}>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {pack.name}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {pack.is_starter
                    ? "starter"
                    : `${pack.price_insight} Insight`}
                </span>
                <form action={togglePack}>
                  <input name="packId" type="hidden" value={pack.id} />
                  <input
                    name="enabled"
                    type="hidden"
                    value={String(!pack.enabled)}
                  />
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${pack.enabled ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-[var(--muted)]"}`}
                  >
                    {pack.enabled ? "Enabled" : "Disabled"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-black">Recent users</h2>
          <div className="mt-4 divide-y divide-white/10">
            {users?.map((profile) => (
              <div className="flex items-center gap-3 py-3" key={profile.id}>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {profile.display_name}
                </span>
                <form action={updateUserRole}>
                  <input name="userId" type="hidden" value={profile.id} />
                  <input
                    name="role"
                    type="hidden"
                    value={profile.role === "sys_admin" ? "user" : "sys_admin"}
                  />
                  <button className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold">
                    {profile.role}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-black">Open reports</h2>
          <div className="mt-4 space-y-4">
            {reports?.map((report) => {
              const version = Array.isArray(report.question_versions)
                ? report.question_versions[0]
                : report.question_versions;
              return (
                <div className="rounded-2xl bg-white/5 p-4" key={report.id}>
                  <b className="text-sm">{report.category}</b>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                    {version?.prompt}
                  </p>
                  <p className="mt-2 text-sm">{report.details}</p>
                </div>
              );
            })}
            {!reports?.length ? (
              <p className="text-sm text-[var(--muted)]">
                Nothing needs review.
              </p>
            ) : null}
          </div>
        </Card>
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center gap-3">
            <MessageSquareWarning className="text-[var(--brand)]" />
            <div>
              <h2 className="text-xl font-black">Beta feedback</h2>
              <p className="text-sm text-[var(--muted)]">
                Open and reviewing app reports
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {feedbackReports?.map((report) => {
              const reporter = Array.isArray(report.reporter)
                ? report.reporter[0]
                : report.reporter;
              return (
                <article className="rounded-2xl bg-white/5 p-5" key={report.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
                    <span className="rounded-full bg-[var(--brand)]/15 px-2.5 py-1 text-[var(--brand)]">
                      {report.category}
                    </span>
                    <span
                      className={
                        report.impact === "blocking"
                          ? "text-red-200"
                          : "text-amber-100"
                      }
                    >
                      {report.impact}
                    </span>
                    {report.status === "reviewing" ? (
                      <span className="text-sky-200">reviewing</span>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                    {report.description}
                  </p>
                  {report.expected_behavior ? (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      <b className="text-slate-200">Expected:</b>{" "}
                      {report.expected_behavior}
                    </p>
                  ) : null}
                  <dl className="mt-4 grid gap-1 text-xs text-[var(--muted)] sm:grid-cols-2">
                    <div>
                      <dt className="inline font-bold text-slate-300">
                        From:{" "}
                      </dt>
                      <dd className="inline">
                        {reporter?.display_name ?? "Unknown player"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-bold text-slate-300">
                        Page:{" "}
                      </dt>
                      <dd className="inline">{report.page_path}</dd>
                    </div>
                    <div>
                      <dt className="inline font-bold text-slate-300">
                        Version:{" "}
                      </dt>
                      <dd className="inline">
                        {report.app_version ?? "Unknown"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-bold text-slate-300">
                        Follow-up:{" "}
                      </dt>
                      <dd className="inline">
                        {report.contact_allowed ? "Allowed" : "No"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-bold text-slate-300">
                        Submitted:{" "}
                      </dt>
                      <dd className="inline">
                        {new Date(report.created_at).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {report.user_agent ? (
                    <details className="mt-4 text-xs text-[var(--muted)]">
                      <summary className="cursor-pointer font-bold text-slate-300">
                        Technical context
                      </summary>
                      <p className="mt-2 break-words leading-5">
                        {report.user_agent}
                      </p>
                    </details>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.status === "open" ? (
                      <form action={updateFeedbackStatus}>
                        <input
                          name="feedbackId"
                          type="hidden"
                          value={report.id}
                        />
                        <input name="status" type="hidden" value="reviewing" />
                        <button className="rounded-full bg-sky-300/15 px-3 py-1.5 text-xs font-black text-sky-100">
                          Reviewing
                        </button>
                      </form>
                    ) : null}
                    <form action={updateFeedbackStatus}>
                      <input
                        name="feedbackId"
                        type="hidden"
                        value={report.id}
                      />
                      <input name="status" type="hidden" value="resolved" />
                      <button className="rounded-full bg-emerald-300/15 px-3 py-1.5 text-xs font-black text-emerald-100">
                        Resolve
                      </button>
                    </form>
                    <form action={updateFeedbackStatus}>
                      <input
                        name="feedbackId"
                        type="hidden"
                        value={report.id}
                      />
                      <input name="status" type="hidden" value="dismissed" />
                      <button className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-black text-[var(--muted)]">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
            {!feedbackReports?.length ? (
              <p className="text-sm text-[var(--muted)]">
                No beta feedback needs review.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </>
  );
}
