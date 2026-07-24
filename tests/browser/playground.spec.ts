import { expect, test, type Locator } from "@playwright/test";

interface SceneColorCounts {
  readonly asset: number;
  readonly placeholder: number;
}

const POPCHOICE_ASSET_RESOLVE_COUNT = 9;
const POPCHOICE_NODE_COUNT = 12;

async function sceneColorCounts(canvas: Locator): Promise<SceneColorCounts> {
  const screenshot = await canvas.screenshot();
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;

  return canvas.evaluate(async (_element, screenshotUrl) => {
    const image = new Image();
    image.src = screenshotUrl;
    await image.decode();
    const copy = document.createElement("canvas");
    copy.width = image.naturalWidth;
    copy.height = image.naturalHeight;
    const context = copy.getContext("2d");

    if (context === null) {
      throw new Error("A 2D canvas context could not be created.");
    }

    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    let asset = 0;
    let placeholder = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;

      placeholder += Number(
        Math.min(
          red - 140,
          green - 80,
          red - green * 1.15,
          green - blue * 1.15,
        ) > 0,
      );
      asset += Number(
        Math.min(blue - 110, green - 100, blue - red * 1.3, green - red * 1.3) >
          0,
      );
    }

    return { asset, placeholder };
  }, dataUrl);
}

test("renders the default architecture through the public renderer boundary", async ({
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
    page.getByRole("heading", { name: "PopChoice architecture" }),
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
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("2");
  await expect
    .poll(async () => (await sceneColorCounts(canvas)).asset)
    .toBeGreaterThan(50);
  await expect
    .poll(async () => (await sceneColorCounts(canvas)).placeholder)
    .toBeGreaterThan(50);

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await sceneColorCounts(canvas)).placeholder)
    .toBeLessThan(10);
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
    const canvas = page.locator("canvas[data-under-glass-renderer]");
    const colors = await sceneColorCounts(canvas);

    expect(colors.asset).toBeGreaterThan(50);
    expect(colors.placeholder).toBeGreaterThan(50);
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

test("renders basic Connections instead of failing the scene", async ({
  page,
}) => {
  await page.goto("/?scenario=single&connections");

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Renderer diagnostics")).toHaveCount(0);
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );
});

test("renders the canonical PopChoice Visualization in both camera modes", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("node-count")).toHaveText(
    String(POPCHOICE_NODE_COUNT),
  );
  await expect(page.getByTestId("connection-count")).toHaveText("17");
  await expect(page.getByTestId("group-count")).toHaveText("2");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText(
    String(POPCHOICE_ASSET_RESOLVE_COUNT),
  );
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    POPCHOICE_NODE_COUNT,
  );
  await expect(page.locator('[data-under-glass-label="group"]')).toHaveCount(2);
  await expect(
    page.locator('[data-under-glass-label="connection"]'),
  ).toHaveCount(5);
  await expect(
    page.locator('[data-under-glass-label="node"]', { hasText: "PopChoice" }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-under-glass-label="node"]', { hasText: "Web" }),
  ).toBeVisible();

  const scene = page.getByLabel("Under Glass 3D scene");
  const isometric = page.getByRole("button", {
    name: "Isometric",
    exact: true,
  });
  const top = page.getByRole("button", { name: "Top", exact: true });

  await expect(isometric).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-mode",
    "isometric",
  );
  const canvas = page.locator("canvas[data-under-glass-renderer]");
  const isometricPixels = await canvas.screenshot();

  await top.click();

  await expect(top).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
  );
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    POPCHOICE_NODE_COUNT,
  );
  const topPixels = await canvas.screenshot();

  expect(topPixels.equals(isometricPixels)).toBe(false);
});

test("retargets an active Camera Mode Transition to the latest requested mode", async ({
  page,
}) => {
  await page.goto("/?scenario=graph&motion=responsive");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();

  const scene = page.getByLabel("Under Glass 3D scene");
  const isometric = page.getByRole("button", {
    name: "Isometric",
    exact: true,
  });
  const top = page.getByRole("button", { name: "Top", exact: true });

  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-motion",
    "responsive",
  );
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
  );

  await top.click();
  await expect(top).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "moving",
  );

  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    POPCHOICE_NODE_COUNT,
  );
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "moving",
  );

  await page.waitForTimeout(120);
  await isometric.click();
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-mode",
    "isometric",
  );
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "moving",
  );

  await page.waitForTimeout(40);
  await top.click();
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
    { timeout: 2_000 },
  );
});

test("applies Camera Mode changes immediately when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?scenario=graph&motion=spring");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();

  const scene = page.getByLabel("Under Glass 3D scene");

  await page.getByRole("button", { name: "Top", exact: true }).click();
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
  );
});

test("selects a supported Camera Motion without recreating the scene", async ({
  page,
}) => {
  await page.goto("/?scenario=graph&motion=spring");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();

  const scene = page.getByLabel("Under Glass 3D scene");
  const spring = page.getByRole("button", { name: "Spring", exact: true });
  const responsive = page.getByRole("button", {
    name: "Responsive",
    exact: true,
  });
  const smooth = page.getByRole("button", { name: "Smooth", exact: true });

  await expect(page.getByText("Camera motion", { exact: true })).toBeVisible();
  await expect(smooth).toHaveCount(0);
  await expect(spring).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-motion",
    "spring",
  );
  await expect(page.getByTestId("asset-resolve-count")).toHaveText(
    String(POPCHOICE_ASSET_RESOLVE_COUNT),
  );

  await responsive.click();

  await expect(responsive).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-motion",
    "responsive",
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("motion"))
    .toBe("responsive");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText(
    String(POPCHOICE_ASSET_RESOLVE_COUNT),
  );
});

test("normalizes the retired Smooth profile to Responsive", async ({
  page,
}) => {
  await page.goto("/?scenario=graph&motion=smooth");

  await expect(
    page.getByRole("button", { name: "Responsive", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Under Glass 3D scene")).toHaveAttribute(
    "data-under-glass-camera-motion",
    "responsive",
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("motion"))
    .toBe("responsive");
});
