import { expect, test, type Locator, type Page } from "@playwright/test";

interface SceneColorCounts {
  readonly asset: number;
  readonly placeholder: number;
}

const RECOMMENDATION_ASSET_RESOLVE_COUNT = 6;
const RECOMMENDATION_NODE_COUNT = 7;

interface LifecycleProbeSnapshot {
  readonly activeListenerCount: number;
  readonly contextLossCount: number;
  readonly createdContextCount: number;
}

async function installLifecycleProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const listenerRegistry = new Map<
      EventTarget,
      Map<string, Set<EventListenerOrEventListenerObject>>
    >();
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener =
      EventTarget.prototype.removeEventListener;
    const captureKey = (
      type: string,
      options?: boolean | AddEventListenerOptions,
    ): string =>
      `${type}:${String(
        typeof options === "boolean" ? options : (options?.capture ?? false),
      )}`;
    const activeListenerCount = (): number => {
      let count = 0;

      for (const [target, targetListeners] of listenerRegistry) {
        if (target instanceof Node && !target.isConnected) {
          listenerRegistry.delete(target);
          continue;
        }

        for (const listeners of targetListeners.values()) {
          count += listeners.size;
        }
      }

      return count;
    };

    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ): void {
      if (listener !== null) {
        const targetListeners =
          listenerRegistry.get(this) ??
          new Map<string, Set<EventListenerOrEventListenerObject>>();
        const key = captureKey(type, options);
        const listeners =
          targetListeners.get(key) ??
          new Set<EventListenerOrEventListenerObject>();

        listeners.add(listener);
        targetListeners.set(key, listeners);
        listenerRegistry.set(this, targetListeners);
      }

      originalAddEventListener.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options,
    ): void {
      if (listener !== null) {
        const targetListeners = listenerRegistry.get(this);
        const key = captureKey(type, options);
        const listeners = targetListeners?.get(key);

        listeners?.delete(listener);
        if (listeners?.size === 0) {
          targetListeners?.delete(key);
        }
        if (targetListeners?.size === 0) {
          listenerRegistry.delete(this);
        }
      }

      originalRemoveEventListener.call(this, type, listener, options);
    };

    const seenContexts = new WeakSet<WebGL2RenderingContext>();
    const patchedLossExtensions = new WeakSet<WEBGL_lose_context>();
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalGetExtension = WebGL2RenderingContext.prototype.getExtension;
    const probe = {
      activeListenerCount,
      contextLossCount: 0,
      createdContextCount: 0,
    };

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value(this: HTMLCanvasElement, ...args: unknown[]) {
        const context = Reflect.apply(
          originalGetContext,
          this,
          args,
        ) as RenderingContext | null;

        if (
          context instanceof WebGL2RenderingContext &&
          !seenContexts.has(context)
        ) {
          seenContexts.add(context);
          probe.createdContextCount += 1;
        }

        return context;
      },
    });
    Object.defineProperty(WebGL2RenderingContext.prototype, "getExtension", {
      configurable: true,
      value(this: WebGL2RenderingContext, name: string) {
        const extension = originalGetExtension.call(this, name);

        if (name === "WEBGL_lose_context" && extension !== null) {
          const lossExtension = extension as WEBGL_lose_context;

          if (!patchedLossExtensions.has(lossExtension)) {
            patchedLossExtensions.add(lossExtension);
            const originalLoseContext =
              lossExtension.loseContext.bind(lossExtension);

            lossExtension.loseContext = (): void => {
              probe.contextLossCount += 1;
              originalLoseContext();
            };
          }
        }

        return extension;
      },
    });
    Object.defineProperty(window, "__underGlassLifecycleProbe", {
      configurable: false,
      value: probe,
    });
  });
}

async function readLifecycleProbe(page: Page): Promise<LifecycleProbeSnapshot> {
  return page.evaluate(() => {
    const probe = (
      window as Window & {
        readonly __underGlassLifecycleProbe: {
          readonly activeListenerCount: () => number;
          readonly contextLossCount: number;
          readonly createdContextCount: number;
        };
      }
    ).__underGlassLifecycleProbe;

    return {
      activeListenerCount: probe.activeListenerCount(),
      contextLossCount: probe.contextLossCount,
      createdContextCount: probe.createdContextCount,
    };
  });
}

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
    page.getByRole("heading", { level: 1, name: "PopChoice architecture" }),
  ).toBeVisible();
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 8_000,
  });

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

  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.getByTestId("node-count")).toHaveText("3");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("1");
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );
});

test("renders the 200-Node fixture with one resolved, parsed, cached Asset", async ({
  page,
}) => {
  await page.goto("/?scenario=stress");

  await expect(
    page.getByRole("heading", { level: 1, name: "200-Node stress fixture" }),
  ).toBeVisible();
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("node-count")).toHaveText("200");
  await expect(page.getByTestId("connection-count")).toHaveText("0");
  await expect(page.getByTestId("group-count")).toHaveText("0");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("1");
  await expect(page.getByTestId("asset-parse-count")).toHaveText("1");
  await expect(page.getByTestId("asset-cache-count")).toHaveText("1");
  await expect(page.getByTestId("node-instance-count")).toHaveText("200");
  await expect(page.getByLabel("Renderer diagnostics")).toHaveCount(0);
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(
    200,
  );
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );
});

test("repeated Editor Session lifecycles release browser and renderer resources", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installLifecycleProbe(page);
  await page.goto("/?scenario=lifecycle");
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 8_000,
  });

  const baseline = await readLifecycleProbe(page);
  const remount = page.getByRole("button", {
    name: "Remount Editor Session",
  });

  await expect(remount).toBeVisible();
  await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
    1,
  );

  for (let generation = 1; generation <= 3; generation += 1) {
    await remount.click();
    await expect(page.getByTestId("session-generation")).toHaveText(
      String(generation),
    );
    await expect(
      page.getByText("loading → ready", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
    await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
      1,
    );
    await expect(page.locator("[data-under-glass-labels]")).toHaveCount(1);
    await expect(
      page.locator("[data-under-glass-semantic-summary]"),
    ).toHaveCount(1);
    await expect
      .poll(async () => (await readLifecycleProbe(page)).contextLossCount)
      .toBe(generation);
    await expect
      .poll(async () => (await readLifecycleProbe(page)).activeListenerCount)
      .toBe(baseline.activeListenerCount);
  }

  expect(await readLifecycleProbe(page)).toEqual({
    activeListenerCount: baseline.activeListenerCount,
    contextLossCount: 3,
    createdContextCount: baseline.createdContextCount + 3,
  });
});

test("repeated 200-Node lifecycles keep one parsed Asset and one active context", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installLifecycleProbe(page);
  await page.goto("/?scenario=stress&lifecycle=1");
  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const baseline = await readLifecycleProbe(page);
  const remount = page.getByRole("button", {
    name: "Remount Editor Session",
  });

  for (let generation = 1; generation <= 2; generation += 1) {
    await remount.click();
    await expect(page.getByTestId("session-generation")).toHaveText(
      String(generation),
    );
    await expect(
      page.getByText("loading → ready", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("asset-parse-count")).toHaveText("1");
    await expect(page.getByTestId("asset-cache-count")).toHaveText("1");
    await expect(page.getByTestId("node-instance-count")).toHaveText("200");
    await expect(page.locator("canvas[data-under-glass-renderer]")).toHaveCount(
      1,
    );
    await expect
      .poll(async () => (await readLifecycleProbe(page)).contextLossCount)
      .toBe(generation);
    await expect
      .poll(async () => (await readLifecycleProbe(page)).activeListenerCount)
      .toBe(baseline.activeListenerCount);
  }

  expect(await readLifecycleProbe(page)).toEqual({
    activeListenerCount: baseline.activeListenerCount,
    contextLossCount: 2,
    createdContextCount: baseline.createdContextCount + 2,
  });
});

test("replaces progressive Placeholders without waiting for slower Nodes", async ({
  page,
}) => {
  await page.goto("/?scenario=progressive");

  await expect(page.getByText("loading", { exact: true })).toBeVisible();
  const canvas = page.locator("canvas[data-under-glass-renderer]");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("2");
  await expect
    .poll(async () => {
      const counts = await sceneColorCounts(canvas);
      return counts.asset > 50 && counts.placeholder > 50;
    })
    .toBe(true);

  await expect(page.getByText("loading → ready", { exact: true })).toBeVisible({
    timeout: 8_000,
  });
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
  await expect(
    page.locator("[data-under-glass-renderer-fallback]"),
  ).toBeVisible();
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    1,
  );
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(
    RECOMMENDATION_NODE_COUNT,
  );
  await expect(
    page.locator("[data-under-glass-semantic-connection]"),
  ).toHaveCount(7);
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

test("renders the focused PopChoice views and both camera modes", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("node-count")).toHaveText(
    String(RECOMMENDATION_NODE_COUNT),
  );
  await expect(page.getByTestId("connection-count")).toHaveText("7");
  await expect(page.getByTestId("group-count")).toHaveText("3");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText(
    String(RECOMMENDATION_ASSET_RESOLVE_COUNT),
  );
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    RECOMMENDATION_NODE_COUNT,
  );
  await expect(
    page.locator('[data-under-glass-label="node"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(page.locator('[data-under-glass-label="group"]')).toHaveCount(3);
  await expect(
    page.locator('[data-under-glass-label="group"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(
    page.locator('[data-under-glass-label="connection"]'),
  ).toHaveCount(7);
  await expect(
    page.locator('[data-under-glass-label="connection"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(page.locator("[data-under-glass-labels]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    1,
  );
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(
    RECOMMENDATION_NODE_COUNT,
  );
  await expect(page.locator("[data-under-glass-semantic-group]")).toHaveCount(
    3,
  );
  await expect(
    page.locator("[data-under-glass-semantic-connection]"),
  ).toHaveCount(7);
  await expect(
    page.locator('[data-under-glass-semantic-node="web"]'),
  ).toHaveText("Web application");
  await expect(
    page.locator('[data-under-glass-label="node"]', { hasText: "PopChoice" }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-under-glass-label="node"]', { hasText: "Web" }),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");

  const scene = page.getByLabel("Under Glass 3D scene");
  const recommendation = page.getByRole("button", {
    name: /Recommendation/,
  });
  const operations = page.getByRole("button", { name: /Operations/ });
  const isometric = page.getByRole("button", {
    name: "Isometric",
    exact: true,
  });
  const top = page.getByRole("button", { name: "Top", exact: true });

  await expect(recommendation).toHaveAttribute("aria-pressed", "true");
  await expect(isometric).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-mode",
    "isometric",
  );
  await expect(scene).toHaveAttribute(
    "data-under-glass-hidden-label-count",
    /^\d+$/,
  );
  const canvas = page.locator("canvas[data-under-glass-renderer]");
  const isometricPixels = await canvas.screenshot();
  const isometricSemantics = await page
    .locator("[data-under-glass-semantic-summary]")
    .textContent();

  await top.click();

  await expect(top).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
  );
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    RECOMMENDATION_NODE_COUNT,
  );
  const topPixels = await canvas.screenshot();

  expect(topPixels.equals(isometricPixels)).toBe(false);
  expect(
    await page.locator("[data-under-glass-semantic-summary]").textContent(),
  ).toBe(isometricSemantics);

  await operations.click();

  await expect(operations).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("node-count")).toHaveText("11");
  await expect(page.getByTestId("connection-count")).toHaveText("10");
  await expect(page.getByTestId("group-count")).toHaveText("5");
  await expect(page.getByTestId("asset-resolve-count")).toHaveText("8");
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(11);
  await expect(
    page.locator('[data-under-glass-label="node"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(page.locator('[data-under-glass-label="group"]')).toHaveCount(5);
  await expect(
    page.locator('[data-under-glass-label="group"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(
    page.locator('[data-under-glass-label="connection"]'),
  ).toHaveCount(6);
  await expect(
    page.locator('[data-under-glass-label="connection"]').first(),
  ).toHaveAttribute("data-under-glass-label-rendering", "world-space");
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    1,
  );
  await expect(page.locator("[data-under-glass-semantic-node]")).toHaveCount(
    11,
  );
  await expect(page.locator("[data-under-glass-semantic-group]")).toHaveCount(
    5,
  );
  await expect(
    page.locator("[data-under-glass-semantic-connection]"),
  ).toHaveCount(10);
  await expect(
    page.locator('[data-under-glass-semantic-node="browser"]'),
  ).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("view"))
    .toBe("operations");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-mode",
    "isometric",
  );
  const operationsPixels = await canvas.screenshot();

  expect(operationsPixels.equals(isometricPixels)).toBe(false);
});

test("selects, moves, undoes, and redoes a Node in the editor loop", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();

  const scene = page.getByLabel("Under Glass 3D scene");
  const canvas = page.locator("canvas[data-under-glass-renderer]");
  const webControl = page.locator(
    '[data-under-glass-semantic-node-control="web"]',
  );

  await webControl.focus();
  await expect(webControl).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(webControl).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute(
    "data-under-glass-selected-node-id",
    "web",
  );
  await expect(page.getByText("Web", { exact: true }).last()).toBeVisible();
  const selectedPosition = page.getByTestId("selected-node-position");
  const originalPosition = await selectedPosition.textContent();

  await page
    .getByRole("heading", { level: 1, name: "PopChoice architecture" })
    .click();
  const selectedPixels = await canvas.screenshot();
  const bounds = await canvas.boundingBox();

  expect(bounds).not.toBeNull();
  if (bounds === null) {
    return;
  }

  await page.mouse.move(bounds.x + 480, bounds.y + 140);
  await page.mouse.down();
  await page.keyboard.press("Escape");
  await page.mouse.move(bounds.x + 410, bounds.y + 205, { steps: 8 });
  await page.mouse.up();
  await expect(scene).not.toHaveAttribute(
    "data-under-glass-placement-validity",
    /.+/,
  );
  await expect(selectedPosition).toHaveText(originalPosition ?? "");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

  await page.mouse.move(bounds.x + 480, bounds.y + 140);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 410, bounds.y + 205, { steps: 8 });
  await canvas.dispatchEvent("pointercancel", {
    bubbles: true,
    pointerId: 1,
  });
  await page.mouse.up();
  await expect(scene).not.toHaveAttribute(
    "data-under-glass-placement-validity",
    /.+/,
  );
  await expect(selectedPosition).toHaveText(originalPosition ?? "");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

  await page.mouse.move(bounds.x + 480, bounds.y + 140);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 585, bounds.y + 190, { steps: 8 });
  await expect(scene).toHaveAttribute(
    "data-under-glass-placement-validity",
    "invalid",
  );
  await page.mouse.up();
  await expect(selectedPosition).toHaveText(originalPosition ?? "");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

  await page.getByRole("button", { name: "Free", exact: true }).click();
  await page.mouse.move(bounds.x + 480, bounds.y + 140);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 413, bounds.y + 207, { steps: 8 });
  await expect(scene).toHaveAttribute(
    "data-under-glass-placement-validity",
    "valid",
  );
  await page.mouse.up();

  const movedPixels = await canvas.screenshot();
  expect(movedPixels.equals(selectedPixels)).toBe(false);
  const movedPosition = await selectedPosition.textContent();
  expect(movedPosition).not.toBe(originalPosition);
  expect(
    movedPosition
      ?.split(",")
      .map(Number)
      .some((coordinate) => !Number.isInteger(coordinate)),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

  await page.keyboard.press("Control+z");
  await expect(selectedPosition).toHaveText(originalPosition ?? "");
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled();

  await page.keyboard.press("Control+Shift+z");
  await expect(selectedPosition).toHaveText(movedPosition ?? "");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(selectedPosition).toHaveText(originalPosition ?? "");
  await page.getByRole("button", { name: "Top", exact: true }).click();
  await expect(scene).toHaveAttribute("data-under-glass-camera-mode", "top");
  await expect(scene).toHaveAttribute(
    "data-under-glass-camera-transition",
    "idle",
  );

  await page.mouse.move(bounds.x + 373, bounds.y + 198);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 373, bounds.y + 255, { steps: 8 });
  await expect(scene).toHaveAttribute(
    "data-under-glass-placement-validity",
    "valid",
  );
  await page.mouse.up();

  const topPosition = await selectedPosition.textContent();
  expect(topPosition).not.toBe(originalPosition);
  await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(selectedPosition).toHaveText(originalPosition ?? "");

  await page.mouse.click(bounds.x + 40, bounds.y + 40);
  await expect(scene).not.toHaveAttribute(
    "data-under-glass-selected-node-id",
    /.+/,
  );
  await expect(selectedPosition).toHaveText("—");

  await page.getByRole("button", { name: /Operations/ }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
  await expect(canvas).toHaveCount(1);
  await expect(page.locator("[data-under-glass-semantic-summary]")).toHaveCount(
    1,
  );
});

test("declutters world-space labels in a compact viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/");

  const scene = page.getByLabel("Under Glass 3D scene");
  await expect(
    page.getByText("loading → ready", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      Number(
        (await scene.getAttribute("data-under-glass-hidden-label-count")) ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('[data-under-glass-label="node"]')).toHaveCount(
    RECOMMENDATION_NODE_COUNT,
  );
  await expect(
    page.locator('[data-under-glass-label="connection"]'),
  ).toHaveCount(7);
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
    RECOMMENDATION_NODE_COUNT,
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
    String(RECOMMENDATION_ASSET_RESOLVE_COUNT),
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
    String(RECOMMENDATION_ASSET_RESOLVE_COUNT),
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
