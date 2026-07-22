import { describe, expect, it } from "vitest";

import { STARTER_ASSET_IDS } from "./index.js";

describe("STARTER_ASSET_IDS", () => {
  it("defines the accepted twelve-asset starter catalog", () => {
    expect(STARTER_ASSET_IDS).toEqual([
      "user",
      "browser",
      "mobile-device",
      "service",
      "gateway",
      "server",
      "worker",
      "database",
      "cache",
      "queue",
      "object-storage",
      "external-system",
    ]);
  });
});
