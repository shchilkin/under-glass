import { expect, test } from "@playwright/test";

test("keeps the public semantic graph usable with or without WebGL2", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "PopChoice architecture" }),
  ).toBeVisible();
  await expect(page.getByText(/loading → (?:ready|failed)/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(7);

  const lifecycle = await page
    .getByText(/loading → (?:ready|failed)/)
    .textContent();

  if (lifecycle === "loading → ready") {
    await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
      1,
    );
  } else {
    await expect(
      page.locator("[data-under-glass-renderer-fallback]"),
    ).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});
