import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect, test } from "@playwright/test";

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

test("a signed-in session survives closing and reopening the browser", async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The browser-restart journey runs once in Chromium.",
  );

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const email = `persistent-${crypto.randomUUID()}@mindspan.local`;
  const password = "Mindspan-Persistent-2026!";
  const profileDirectory = testInfo.outputPath("persistent-browser-profile");
  const baseURL = String(testInfo.project.use.baseURL);
  let userId: string | undefined;

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
        display_name: "Persistent Player",
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    const firstContext = await chromium.launchPersistentContext(
      profileDirectory,
      { baseURL, headless: true },
    );
    const firstPage = firstContext.pages()[0] ?? (await firstContext.newPage());
    await firstPage.goto("/login");
    await firstPage.getByLabel("Email address", { exact: true }).fill(email);
    await firstPage.getByLabel("Password", { exact: true }).fill(password);
    await firstPage
      .locator("form")
      .filter({ has: firstPage.getByLabel("Password", { exact: true }) })
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(firstPage).toHaveURL(/\/home/);
    await firstContext.close();

    const reopenedContext = await chromium.launchPersistentContext(
      profileDirectory,
      { baseURL, headless: true },
    );
    try {
      const reopenedPage =
        reopenedContext.pages()[0] ?? (await reopenedContext.newPage());
      await reopenedPage.goto("/home");
      await expect(reopenedPage).toHaveURL(/\/home/);
      await expect(
        reopenedPage.getByRole("heading", {
          name: /Ready when you are, Persistent Player/,
        }),
      ).toBeVisible();
    } finally {
      await reopenedContext.close();
    }
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
