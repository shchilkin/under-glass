export const STARTER_ASSET_IDS = [
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
] as const;

export type StarterAssetId = (typeof STARTER_ASSET_IDS)[number];
