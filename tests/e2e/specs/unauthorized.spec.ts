import { test, expect } from "@playwright/test";

test("User login cannot mint; PEP returns authorization failure", async ({ page }) => {
  await page.goto("/");
  await page.locator("select").selectOption("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
  await page.getByRole("button", { name: /Sign challenge/i }).click();
  await expect(page.getByText("Operations overview")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Assets" }).click();
  await page.getByRole("button", { name: "Mint asset NFT" }).click();
  await expect(page.getByText(/Authorization failed|On-chain role is User/i)).toBeVisible({ timeout: 20_000 });
});
