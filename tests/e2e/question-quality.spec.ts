import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const fileValues = existsSync(".env.local")
  ? Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    )
  : {};
const values = { ...fileValues, ...process.env };
const supabaseUrl = values.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = values.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey)
  throw new Error("Supabase test environment is not configured");

test("a system administrator can review and export question quality", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The authenticated administrator journey runs once in Chromium.",
  );
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const email = `quality-${crypto.randomUUID()}@mindspan.local`;
  const password = "Mindspan-Quality-2026!";
  let userId: string | undefined;
  let reviewedVersionId: string | undefined;

  try {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError) throw createError;
    userId = created.user.id;
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        age_confirmed: true,
        beta_access_granted_at: new Date().toISOString(),
        display_name: "Quality Reviewer",
        onboarding_completed: true,
        role: "sys_admin",
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Password", { exact: true }) })
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/home/);

    await page.goto("/admin/question-quality");
    await expect(
      page.getByRole("heading", { name: "Question quality" }),
    ).toBeVisible();
    await expect(page.getByText(/\d+\/\d+ reviewed/).first()).toBeVisible();
    await expect(page.getByText("Canonical answer")).toBeVisible();

    reviewedVersionId =
      (await page
        .locator('input[name="versionId"]')
        .getAttribute("value")) ?? undefined;
    expect(reviewedVersionId).toBeTruthy();
    await page.getByLabel("Editorial notes").fill("Playwright review");
    await page.getByRole("button", { name: /Needs revision/ }).click();
    await expect(
      page.locator('input[name="versionId"]'),
    ).not.toHaveValue(reviewedVersionId!);
    await expect
      .poll(async () => {
        const { data: review } = await admin
          .from("question_editorial_reviews")
          .select("verdict,notes")
          .eq("question_version_id", reviewedVersionId!)
          .maybeSingle();
        return review;
      })
      .toMatchObject({
        notes: "Playwright review",
        verdict: "needs_revision",
      });

    const exportResponse = await page.evaluate(async () => {
      const response = await fetch("/api/admin/question-quality/export");
      return {
        body: await response.json(),
        contentDisposition: response.headers.get("content-disposition"),
        status: response.status,
      };
    });
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.contentDisposition).toContain(
      "mindspan-question-quality-",
    );
    const exported = exportResponse.body as {
      schemaVersion: number;
      selection: {
        needsRevision: boolean;
        rejected: boolean;
        unresolvedPlayerFlags: boolean;
      };
      questions: Array<{ id: string }>;
    };
    expect(exported.schemaVersion).toBe(2);
    expect(exported.selection).toEqual({
      needsRevision: true,
      rejected: true,
      unresolvedPlayerFlags: true,
    });
    expect(
      exported.questions.some((question) => question.id === reviewedVersionId),
    ).toBe(true);
  } finally {
    if (reviewedVersionId)
      await admin
        .from("question_editorial_reviews")
        .delete()
        .eq("question_version_id", reviewedVersionId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
