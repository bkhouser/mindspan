import Link from "next/link";
import { ArrowRight, Brain, Sparkles, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { currentAuthenticationDestination } from "@/server/authentication";

export const dynamic = "force-dynamic";

const features = [
  { icon: Brain, title: "Adaptive mastery", copy: "Questions and rewards respond to what you know." },
  { icon: Users, title: "Private groups", copy: "Compare specialties with family and friends." },
  { icon: Sparkles, title: "Built to teach", copy: "Every answer unlocks context worth remembering." },
];

export default async function LandingPage() {
  const destination = await currentAuthenticationDestination();
  if (destination) redirect(destination);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
      <nav className="flex items-center justify-between" aria-label="Primary navigation">
        <Link className="text-xl font-black tracking-tight" href="/">Mindspan</Link>
        <Link className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5" href="/login">Sign in</Link>
      </nav>

      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">Your knowledge has a shape.</p>
          <h1 className="max-w-3xl text-5xl font-black leading-[.96] tracking-[-.05em] sm:text-7xl">Expand what you know.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">Mindspan turns serious trivia training into an endlessly playable game—personalized to your strengths, your interests, and your crew.</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 font-black text-slate-950 hover:bg-[var(--brand-strong)]" href="/login">Accept an invite <ArrowRight size={18} /></Link>
            <a className="rounded-full border border-white/15 px-6 py-3 font-bold hover:bg-white/5" href="#how-it-works">See how it works</a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md" aria-label="Illustration of overlapping knowledge areas">
          <div className="aspect-square rounded-[3rem] border border-white/10 bg-white/[.035] p-8 shadow-2xl shadow-emerald-950/40">
            <div className="relative h-full">
              <div className="absolute left-[5%] top-[15%] grid h-[58%] w-[58%] place-items-center rounded-full bg-cyan-400/35 text-sm font-black backdrop-blur">SCIENCE</div>
              <div className="absolute right-[2%] top-[12%] grid h-[58%] w-[58%] place-items-center rounded-full bg-amber-400/35 text-sm font-black backdrop-blur">HISTORY</div>
              <div className="absolute bottom-[3%] left-[21%] grid h-[58%] w-[58%] place-items-center rounded-full bg-fuchsia-400/30 text-sm font-black backdrop-blur">CULTURE</div>
              <div className="absolute inset-0 grid place-items-center text-center"><span className="rounded-full bg-slate-950/85 px-5 py-3 text-lg font-black shadow-xl">YOU<br /><b className="text-xs text-[var(--brand)]">72% MASTERY</b></span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-12 md:grid-cols-3" id="how-it-works">
        {features.map(({ icon: Icon, title, copy }) => (
          <article className="rounded-3xl border border-white/10 bg-white/[.035] p-6" key={title}>
            <Icon className="mb-5 text-[var(--brand)]" aria-hidden="true" />
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
