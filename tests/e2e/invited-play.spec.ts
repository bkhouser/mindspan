import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const fileValues = existsSync(".env.local") ? Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
) : {};
const values = { ...fileValues, ...process.env };
const supabaseUrl = values.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = values.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) throw new Error("Supabase test environment is not configured");

test("an invited player can onboard and finish an assisted question", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The full journey runs once in Chromium; public layouts run in every project.");
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });
  const invite = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(invite).digest("hex");
  const email = `playwright-${crypto.randomUUID()}@mindspan.local`;
  let userId;

  try {
    const { error: inviteError } = await admin.from("beta_invites").insert({ token_hash: tokenHash, email, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    if (inviteError) throw inviteError;
    await page.goto(`/login?invite=${encodeURIComponent(invite)}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: /email me a magic link/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible();
    let actionLink = "";
    await expect.poll(async () => {
      const list = await fetch("http://127.0.0.1:54324/api/v1/messages").then((response) => response.json()) as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
      const message = list.messages.find((candidate) => candidate.To.some((recipient) => recipient.Address === email));
      if (!message) return false;
      const detail = await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`).then((response) => response.json()) as { HTML?: string; Text?: string };
      const match = (detail.HTML ?? detail.Text ?? "").match(/https?:\/\/[^\s"'<>]+/);
      actionLink = match?.[0]?.replaceAll("&amp;", "&") ?? "";
      return Boolean(actionLink);
    }, { timeout: 10_000 }).toBe(true);
    const verifierCookies = await page.context().cookies();
    expect(verifierCookies.some((cookie) => cookie.name.includes("code-verifier"))).toBe(true);
    const callbackResponse = await page.goto(actionLink);
    if (!page.url().includes("/onboarding")) {
      const redirects = [];
      let request = callbackResponse?.request();
      while (request) { redirects.unshift(request.url()); request = request.redirectedFrom() ?? undefined; }
      throw new Error(`Magic-link callback ended at ${page.url()}; redirects: ${redirects.join(" -> ")}`);
    }
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: /what are you curious about/i })).toBeVisible();
    await page.getByLabel("Display name").fill("Playwright Player");
    await page.locator('input[name="topics"]').first().check();
    await page.locator('input[name="ageConfirmed"]').check();
    await page.getByRole("button", { name: /start exploring/i }).click();

    await expect(page.getByRole("heading", { name: /ready when you are, playwright player/i })).toBeVisible();
    await page.getByRole("link", { name: /play now/i }).click();
    await page.getByRole("button", { name: /start playing/i }).click();
    await expect(page.getByRole("button", { name: /show choices/i })).toBeVisible();
    await page.getByRole("button", { name: /show choices/i }).click();
    const choices = page.locator("button.min-h-14");
    await expect(choices).toHaveCount(4);
    await choices.first().click();
    await page.getByRole("button", { name: /lock in answer/i }).click();
    await expect(page.getByText(/right|not this time/i).first()).toBeVisible();
    await expect(page.getByText(/topic proficiency/i)).toBeVisible();
  } finally {
    await admin.from("beta_invites").delete().eq("token_hash", tokenHash);
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = data.users.find((candidate) => candidate.email === email)?.id;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});

test("an invited player can begin the adaptive assessment", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The authenticated assessment journey runs once in Chromium.");
  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });
  const invite = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(invite).digest("hex");
  const email = `assessment-${crypto.randomUUID()}@mindspan.local`;
  let userId;

  try {
    const { error: inviteError } = await admin.from("beta_invites").insert({ token_hash: tokenHash, email, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    if (inviteError) throw inviteError;
    await page.goto(`/login?invite=${encodeURIComponent(invite)}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: /email me a magic link/i }).click();

    let actionLink = "";
    await expect.poll(async () => {
      const list = await fetch("http://127.0.0.1:54324/api/v1/messages").then((response) => response.json()) as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
      const message = list.messages.find((candidate) => candidate.To.some((recipient) => recipient.Address === email));
      if (!message) return false;
      const detail = await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`).then((response) => response.json()) as { HTML?: string; Text?: string };
      const match = (detail.HTML ?? detail.Text ?? "").match(/https?:\/\/[^\s"'<>]+/);
      actionLink = match?.[0]?.replaceAll("&amp;", "&") ?? "";
      return Boolean(actionLink);
    }, { timeout: 10_000 }).toBe(true);

    await page.goto(actionLink);
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByLabel("Display name").fill("Assessment Player");
    await page.locator('input[name="topics"]').first().check();
    await page.locator('input[name="ageConfirmed"]').check();
    await page.getByRole("button", { name: /take the assessment/i }).click();

    await expect(page).toHaveURL(/\/assessment/);
    await page.getByRole("button", { name: /begin assessment/i }).click();
    await expect(page.getByText(/difficulty 3/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /show choices/i })).toBeVisible();
  } finally {
    await admin.from("beta_invites").delete().eq("token_hash", tokenHash);
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = data.users.find((candidate) => candidate.email === email)?.id;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
