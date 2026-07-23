import { expect, test } from "@playwright/test";

test("renders a host-resolved GLB through the public renderer boundary", async ({
  page,
}) => {
  const glbRequests: string[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(".glb")) {
      glbRequests.push(request.url());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Under Glass" }),
  ).toBeVisible();
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();

  const canvas = page.locator("canvas[data-under-glass-renderer]");

  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        (element) =>
          element.getContext("webgl2") instanceof WebGL2RenderingContext,
      ),
    )
    .toBe(true);
  expect(glbRequests).toEqual([]);
});

test("reports a stable failed lifecycle when WebGL2 is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => null,
    });
  });

  await page.goto("/");

  await expect(
    page.getByText("loading → failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("renderer-unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    0,
  );
});

test("fails rather than silently omitting deferred Connections", async ({
  page,
}) => {
  await page.goto("/?connections");

  await expect(
    page.getByText("loading → failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("unsupported-connections", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    0,
  );
});
