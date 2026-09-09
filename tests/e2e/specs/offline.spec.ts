import { test, expect } from "@playwright/test";

test("offline PWA allows low-risk scan and denies stale high-risk transfer", async ({ page, context }) => {
  await page.goto("http://localhost:3001/");
  await expect(page.getByText("ANUBANDH Verifier")).toBeVisible();
  await page.getByRole("button", { name: "Login and cache snapshot" }).click();
  await expect(page.getByText(/Synced trust anchors/i)).toBeVisible({ timeout: 30_000 });

  await context.setOffline(true);
  await expect(page.getByText("Offline")).toBeVisible();

  await page.getByTestId("low-risk").click();
  await expect(page.getByTestId("activity-log")).toContainText(/ALLOWED identifier_scan/i);

  await page.getByRole("button", { name: "Age snapshot (demo)" }).click();
  await page.getByTestId("high-risk").click();
  await expect(page.getByTestId("activity-log")).toContainText(/Denied: cached authorization snapshot is older/i);

  await context.setOffline(false);
  await page.getByTestId("reconcile").click();
  await expect(page.getByText(/Reconciled/i)).toBeVisible({ timeout: 30_000 });
});
