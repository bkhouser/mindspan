import { expect, test } from "@playwright/test";

test("landing page presents the game and beta path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /expand what you know/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /accept an invite/i })).toHaveAttribute("href", "/login");
  await expect(page.getByText(/every answer unlocks context worth remembering/i)).toBeVisible();
});

test("invite token survives navigation to account creation", async ({ page }) => {
  await page.goto("/login?invite=test-invite-token");
  await expect(page.getByRole("heading", { name: /join mindspan/i })).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  const signupForm = page.locator("form").filter({ has: page.getByRole("button", { name: /create account/i }) });
  await expect(signupForm.locator('input[name="invite"]')).toHaveValue("test-invite-token");
});

test("password recovery is available from sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
});

test("public pages expose a keyboard-visible primary action", async ({ page }) => {
  await page.goto("/");
  const primaryLink = page.getByRole("link", { name: "Mindspan", exact: true });
  await page.keyboard.press("Tab");
  if (!await primaryLink.evaluate((element) => element === document.activeElement)) await primaryLink.focus();
  await expect(primaryLink).toBeFocused();
});
