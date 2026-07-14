import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { profile, supabase } = await requireUser();
  if (profile.role === "sys_admin") redirect("/admin");
  if (profile.onboarding_completed) redirect("/home");
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, description")
    .eq("enabled", true)
    .order("sort_order");
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <p className="text-sm font-black uppercase tracking-[.22em] text-[var(--brand)]">
        Welcome to Mindspan
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        What are you curious about?
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
        Choose at least one interest. This guides your mixed games without
        locking away any topic.
      </p>
      <OnboardingForm
        initialDisplayName={
          profile.display_name === "New player" ? "" : profile.display_name
        }
        topics={topics ?? []}
      />
    </main>
  );
}
