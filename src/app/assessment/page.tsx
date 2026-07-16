import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const { profile } = await requireUser();
  redirect(profile.onboarding_completed ? "/home" : "/onboarding");
}
