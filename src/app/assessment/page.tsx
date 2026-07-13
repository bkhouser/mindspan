import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AssessmentGame } from "./assessment-game";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const { profile } = await requireUser();
  if (profile.onboarding_completed) redirect("/home");
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <AssessmentGame
        immediateChoiceSubmit={profile.immediate_choice_submit}
      />
    </main>
  );
}
