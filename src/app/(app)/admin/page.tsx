import {
  BookOpenCheck,
  Clock3,
  Flag,
  Package,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Card } from "@/components/ui/card";
import { requireSysAdmin } from "@/lib/auth";
import {
  createBetaInvite,
  togglePack,
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
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login?invite=${encodeURIComponent(query.invite)}`
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
          <p className="mt-4 text-3xl font-black">{reports?.length ?? 0}</p>
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
      </section>
    </>
  );
}
