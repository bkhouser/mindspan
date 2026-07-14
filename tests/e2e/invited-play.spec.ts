import { createHash, randomBytes } from "node:crypto";
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

test("an invited player can onboard and finish an assisted question", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The full journey runs once in Chromium; public layouts run in every project.",
  );
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const invite = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(invite).digest("hex");
  const email = `playwright-${crypto.randomUUID()}@mindspan.local`;
  const password = "Mindspan-Playwright-2026!";
  let userId;

  try {
    const { error: inviteError } = await admin.from("beta_invites").insert({
      token_hash: tokenHash,
      email,
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    if (inviteError) throw inviteError;
    await page.goto(`/login?invite=${encodeURIComponent(invite)}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page
      .locator("form")
      .filter({ has: page.getByLabel(/confirm password/i) })
      .getByRole("button", { name: /create account/i })
      .click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible();
    await expect(page.getByLabel("Email address", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
    await expect(page.locator('form input[name="confirmation"]')).toHaveCount(
      0,
    );
    let actionLink = "";
    await expect
      .poll(
        async () => {
          const list = (await fetch(
            "http://127.0.0.1:54324/api/v1/messages",
          ).then((response) => response.json())) as {
            messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
          };
          const message = list.messages.find((candidate) =>
            candidate.To.some((recipient) => recipient.Address === email),
          );
          if (!message) return false;
          const detail = (await fetch(
            `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
          ).then((response) => response.json())) as {
            HTML?: string;
            Text?: string;
          };
          const match = (detail.HTML ?? detail.Text ?? "").match(
            /https?:\/\/[^\s"'<>]+/,
          );
          actionLink = match?.[0]?.replaceAll("&amp;", "&") ?? "";
          return Boolean(actionLink);
        },
        { timeout: 10_000 },
      )
      .toBe(true);
    const verifierCookies = await page.context().cookies();
    expect(
      verifierCookies.some((cookie) => cookie.name.includes("code-verifier")),
    ).toBe(true);
    await page.context().clearCookies();
    expect(
      (await page.context().cookies()).some((cookie) =>
        cookie.name.includes("code-verifier"),
      ),
    ).toBe(false);
    const callbackResponse = await page.goto(actionLink);
    if (!page.url().includes("/onboarding")) {
      const redirects = [];
      let request = callbackResponse?.request();
      while (request) {
        redirects.unshift(request.url());
        request = request.redirectedFrom() ?? undefined;
      }
      throw new Error(
        `Account-confirmation callback ended at ${page.url()}; redirects: ${redirects.join(" -> ")}`,
      );
    }
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole("heading", { name: /what are you curious about/i }),
    ).toBeVisible();
    await page.getByLabel("Display name").fill("Playwright Player");
    await page.locator('input[name="ageConfirmed"]').check();
    await page.getByRole("button", { name: /start exploring/i }).click();
    await expect(page.locator("#onboarding-error")).toHaveText(
      /choose at least one topic/i,
    );
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Playwright Player",
    );
    await expect(page.locator('input[name="ageConfirmed"]')).toBeChecked();
    await page.locator('input[name="topics"]').first().check();
    await page.getByRole("button", { name: /start exploring/i }).click();

    await expect(
      page.getByRole("heading", {
        name: /ready when you are, playwright player/i,
      }),
    ).toBeVisible();
    const achievement = page
      .getByRole("status")
      .filter({ hasText: /achievement unlocked/i });
    if (await achievement.isVisible())
      await achievement.getByRole("button", { name: /nice/i }).click();
    await page.getByRole("link", { name: /play now/i }).click();
    await page.getByRole("button", { name: /start playing/i }).click();
    const showChoices = page.getByRole("button", { name: /show choices/i });
    const choices = page.locator("button.min-h-14");
    await expect
      .poll(
        async () =>
          (await showChoices.isVisible()) || (await choices.count()) === 4,
      )
      .toBe(true);
    if (await showChoices.isVisible()) await showChoices.click();
    await expect(choices).toHaveCount(4);
    await choices.first().click();
    await page.getByRole("button", { name: /lock in answer/i }).click();
    await expect(page.getByText(/right|not this time/i).first()).toBeVisible();
    await expect(page.getByTestId("question-pack")).toContainText(
      /starter|easy does it/i,
    );
    await expect(page.getByTestId("topic-proficiency")).toContainText(
      /proficiency/i,
    );
    const feedbackResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/question-feedback"),
    );
    await page.getByRole("button", { name: "Good question" }).click();
    const savedFeedback = await feedbackResponse;
    expect(
      savedFeedback.status(),
      await savedFeedback.text(),
    ).toBe(200);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect
      .poll(async () => {
        const { count } = await admin
          .from("question_feedback")
          .select("id", { count: "exact", head: true })
          .eq("sentiment", "up");
        return count ?? 0;
      })
      .toBeGreaterThan(0);
  } finally {
    await admin.from("beta_invites").delete().eq("token_hash", tokenHash);
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      userId = data.users.find((candidate) => candidate.email === email)?.id;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});

test("an invited player can begin the adaptive assessment", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The authenticated assessment journey runs once in Chromium.",
  );
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const invite = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(invite).digest("hex");
  const email = `assessment-${crypto.randomUUID()}@mindspan.local`;
  const password = "Mindspan-Assessment-2026!";
  let userId;

  try {
    const { error: inviteError } = await admin.from("beta_invites").insert({
      token_hash: tokenHash,
      email,
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    });
    if (inviteError) throw inviteError;
    await page.goto(`/login?invite=${encodeURIComponent(invite)}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page
      .locator("form")
      .filter({ has: page.getByLabel(/confirm password/i) })
      .getByRole("button", { name: /create account/i })
      .click();

    let actionLink = "";
    await expect
      .poll(
        async () => {
          const list = (await fetch(
            "http://127.0.0.1:54324/api/v1/messages",
          ).then((response) => response.json())) as {
            messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
          };
          const message = list.messages.find((candidate) =>
            candidate.To.some((recipient) => recipient.Address === email),
          );
          if (!message) return false;
          const detail = (await fetch(
            `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
          ).then((response) => response.json())) as {
            HTML?: string;
            Text?: string;
          };
          const match = (detail.HTML ?? detail.Text ?? "").match(
            /https?:\/\/[^\s"'<>]+/,
          );
          actionLink = match?.[0]?.replaceAll("&amp;", "&") ?? "";
          return Boolean(actionLink);
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    await page.goto(actionLink);
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByLabel("Display name").fill("Assessment Player");
    await page.locator('input[name="topics"]').first().check();
    await page.locator('input[name="ageConfirmed"]').check();
    await page.getByRole("button", { name: /take the assessment/i }).click();

    await expect(page).toHaveURL(/\/assessment/);
    await page.getByRole("button", { name: /begin assessment/i }).click();
    await expect(
      page.getByRole("img", { name: "Difficulty 3 out of 5" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /show choices/i }),
    ).toBeVisible();
  } finally {
    await admin.from("beta_invites").delete().eq("token_hash", tokenHash);
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      userId = data.users.find((candidate) => candidate.email === email)?.id;
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
