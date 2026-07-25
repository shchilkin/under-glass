import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAutomaticAccessibilityViolations(
  page: Page,
): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("the canonical viewer has no automatically detectable violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await expectNoAutomaticAccessibilityViolations(page);
});

test("the renderer-unavailable fallback remains accessible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => null,
    });
  });
  await page.goto("/");
  await expect(page.getByText("loading → failed", { exact: true })).toBeVisible(
    {
      timeout: 15_000,
    },
  );
  await expect(
    page.locator("[data-under-glass-renderer-fallback]"),
  ).toBeVisible();

  await expectNoAutomaticAccessibilityViolations(page);
});
