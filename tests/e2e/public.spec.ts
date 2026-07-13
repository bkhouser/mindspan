import { expect, test } from "@playwright/test";

test("landing page presents the game and beta path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /expand what you know/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /accept an invite/i })).toHaveAttribute("href", "/login");
  await expect(page.getByText(/every answer unlocks context worth remembering/i)).toBeVisible();
});

test("invite token survives navigation to passwordless login", async ({ page }) => {
  await page.goto("/login?invite=test-invite-token");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.locator('input[name="invite"]')).toHaveValue("test-invite-token");
});

test("public pages expose a keyboard-visible primary action", async ({ page }) => {
  await page.goto("/");
  const primaryLink = page.getByRole("link", { name: "Mindspan", exact: true });
  await page.keyboard.press("Tab");
  if (!await primaryLink.evaluate((element) => element === document.activeElement)) await primaryLink.focus();
  await expect(primaryLink).toBeFocused();
});
