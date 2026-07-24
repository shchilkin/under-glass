import { expect, test } from "@playwright/test";

test("mounts the public ViewerController without React", async ({ page }) => {
  await page.goto("http://127.0.0.1:4186");

  await expect(
    page.getByRole("heading", { name: "Vanilla integration" }),
  ).toBeVisible();
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#node-count")).toHaveText("3");
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(3);
  await expect(page.locator("[data-under-glass-labels]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    1,
  );
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(3);
  await expect(
    page.locator("[data-under-glass-semantic-connection]"),
  ).toHaveCount(2);

  const viewer = page.getByLabel("Under Glass vanilla Viewer");
  const topButton = page.getByRole("button", { name: "Top" });

  await topButton.click();
  await expect(topButton).toHaveAttribute("aria-pressed", "true");
  await expect(viewer).toHaveAttribute("data-under-glass-camera-mode", "top");

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
  });
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    0,
  );
  await expect(page.locator("[data-under-glass-labels]")).toHaveCount(0);
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    0,
  );
  await expect(
    page.locator("[data-under-glass-renderer-fallback]"),
  ).toHaveCount(0);
});
