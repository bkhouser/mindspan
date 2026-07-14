"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import packageJson from "../../../../package.json";
import { requireUser } from "@/lib/auth";

export type FeedbackFormState = { error?: string };

const feedbackSchema = z.object({
  category: z.enum(["bug", "confusing", "suggestion", "content", "other"]),
  impact: z.enum(["minor", "annoying", "blocking"]),
  description: z.string().trim().min(10).max(4000),
  expectedBehavior: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().min(1).max(2000).nullable(),
  ),
  pagePath: z.string().trim().startsWith("/").max(500),
  contactAllowed: z.boolean(),
});

export async function submitFeedback(
  _previousState: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    impact: formData.get("impact"),
    description: formData.get("description"),
    expectedBehavior: formData.get("expectedBehavior"),
    pagePath: formData.get("pagePath"),
    contactAllowed: formData.get("contactAllowed") === "on",
  });

  if (!parsed.success) {
    return {
      error:
        "Please describe the issue in at least 10 characters and check the other fields.",
    };
  }

  const { user, supabase } = await requireUser();
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 1000) ?? null;
  const deployment = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12);
  const appVersion = deployment
    ? `${packageJson.version}+${deployment}`
    : packageJson.version;
  const { error } = await supabase.from("feedback_reports").insert({
    reporter_user_id: user.id,
    category: parsed.data.category,
    impact: parsed.data.impact,
    description: parsed.data.description,
    expected_behavior: parsed.data.expectedBehavior,
    page_path: parsed.data.pagePath,
    user_agent: userAgent,
    app_version: appVersion,
    contact_allowed: parsed.data.contactAllowed,
  });

  if (error) {
    return {
      error: "Mindspan could not save that report. Please try again.",
    };
  }

  redirect(
    `/feedback?submitted=1&from=${encodeURIComponent(parsed.data.pagePath)}`,
  );
}
