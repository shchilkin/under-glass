import { expect, test, type Page } from "@playwright/test";

async function openReadyVisualization(page: Page, path = "/"): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("canonical visual baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("pins the complete isometric graph grammar", async ({ page }) => {
    await openReadyVisualization(page);

    await expect(page).toHaveScreenshot("canonical-isometric.png", {
      fullPage: true,
    });
  });

  test("pins the canonical top graph", async ({ page }) => {
    await openReadyVisualization(page);
    await page.getByRole("button", { name: "Top", exact: true }).click();
    await expect(page.getByLabel("Under Glass 3D scene")).toHaveAttribute(
      "data-under-glass-camera-mode",
      "top",
    );

    await expect(page).toHaveScreenshot("canonical-top.png", {
      fullPage: true,
    });
  });

  test("pins a retained Asset Placeholder", async ({ page }) => {
    await openReadyVisualization(page, "/?scenario=missing");
    await expect(
      page.getByText("asset-load-failed", { exact: true }),
    ).toBeVisible();

    await expect(page).toHaveScreenshot("retained-placeholder.png", {
      fullPage: true,
    });
  });

  test("pins a selected Node", async ({ page }) => {
    await openReadyVisualization(page);
    const webControl = page.locator(
      '[data-under-glass-semantic-node-control="web"]',
    );

    await webControl.focus();
    await page.keyboard.press("Enter");
    await expect(webControl).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("heading", { level: 1, name: "PopChoice architecture" })
      .click();

    await expect(page).toHaveScreenshot("selected-node.png", {
      fullPage: true,
    });
  });

  test("pins invalid overlap placement feedback", async ({ page }) => {
    await openReadyVisualization(page);
    const canvas = page.locator("canvas[data-under-glass-renderer]");
    const bounds = await canvas.boundingBox();

    expect(bounds).not.toBeNull();
    if (bounds === null) {
      return;
    }

    await page.mouse.move(bounds.x + 480, bounds.y + 140);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 585, bounds.y + 190, { steps: 8 });
    await expect(page.getByLabel("Under Glass 3D scene")).toHaveAttribute(
      "data-under-glass-placement-validity",
      "invalid",
    );

    await expect(page).toHaveScreenshot("invalid-overlap-preview.png", {
      fullPage: true,
    });

    await page.keyboard.press("Escape");
    await page.mouse.up();
  });
});
