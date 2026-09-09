import { test, expect } from "@playwright/test";

test("challenge-response login as Admin reaches dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Sign challenge/i }).click();
  await expect(page.getByText("Operations overview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("RoleManager.hasActiveRole")).toBeVisible();
});

test("Admin can open mint form and Assets page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Sign challenge/i }).click();
  await expect(page.getByText("Operations overview")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Assets" }).click();
  await expect(page.getByText("Mint (Admin only, real chain transaction)")).toBeVisible();
  const ident = `SEED-E2E-${Date.now()}`;
  await page.locator("input").first().fill(ident);
  await page.getByRole("button", { name: "Mint asset NFT" }).click();
  await expect(page.getByText(/Minted on-chain|tx 0x/i)).toBeVisible({ timeout: 30_000 });
});
