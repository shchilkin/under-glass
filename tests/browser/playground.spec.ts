import { expect, test } from "@playwright/test";

test("loads the Under Glass playground", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Under Glass" }),
  ).toBeVisible();
  await expect(page.getByText("Bootstrap ready")).toBeVisible();
});
