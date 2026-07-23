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

test("renders multiple Nodes while resolving a repeated Asset ID once", async ({
  page,
}) => {
  await page.goto("/?scenario=cache");

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("node-count")).toHaveText("3");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("1");
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );
});

test("replaces progressive Placeholders without waiting for slower Nodes", async ({
  page,
}) => {
  await page.goto("/?scenario=progressive");

  await expect(page.getByText("loading", { exact: true })).toBeVisible();
  const canvas = page.locator("canvas[data-under-glass-renderer]");
  const progressiveFrame = await canvas.screenshot();

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  const completedFrame = await canvas.screenshot();

  expect(progressiveFrame.equals(completedFrame)).toBe(false);
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("2");
});

for (const failure of ["missing", "malformed", "compressed"] as const) {
  test(`keeps the scene ready with a Placeholder for a ${failure} asset`, async ({
    page,
  }) => {
    await page.goto(`/?scenario=${failure}`);

    await expect(
      page.getByText("loading → ready", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("asset-load-failed", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("diagnostic-severity")).toHaveText("warning");
    await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
      1,
    );
  });
}

test("fails a semantically invalid Visualization before rendering", async ({
  page,
}) => {
  await page.goto("/?scenario=invalid");

  await expect(
    page.getByText("loading → failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("visualization-invalid", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    0,
  );
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
