import { type Object3D } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

import { validateAssetDefinitionSemantics, type Node } from "@under-glass/core";

import { disposeObjectResources } from "./resource-disposal.js";
import type {
  AssetResolver,
  ResolvedAsset,
  SceneRendererDiagnostic,
} from "./types.js";

export interface PreparedNodeAsset {
  readonly asset: Object3D;
  readonly resolvedAsset: ResolvedAsset;
}

export interface AssetLoad {
  instantiate(): Promise<PreparedNodeAsset | null>;
  readonly resolvedAsset: Promise<ResolvedAsset>;
}

export interface AssetSessionMetrics {
  readonly cachedAssetCount: number;
  readonly nodeInstanceCount: number;
  readonly parsedAssetCount: number;
}

export interface AssetSession {
  complete(asset: Object3D): void;
  disposalRoots(): readonly Object3D[];
  getMetrics(): AssetSessionMetrics;
  load(node: Node): AssetLoad;
}

interface AssetSessionCounters {
  nodeInstanceCount: number;
  parsedAssetCount: number;
}

interface CreateAssetSessionOptions {
  readonly isDisposed: () => boolean;
  readonly parseAsset: (bytes: ArrayBuffer) => Promise<Object3D>;
  readonly resolveAsset: AssetResolver;
}

class AssetSessionDiagnosticError extends Error {
  readonly diagnostic: SceneRendererDiagnostic;

  constructor(diagnostic: SceneRendererDiagnostic) {
    super(diagnostic.message);
    this.name = "AssetSessionDiagnosticError";
    this.diagnostic = diagnostic;
  }
}

function validateResolvedAsset(
  expectedAssetId: string,
  resolvedAsset: ResolvedAsset,
): SceneRendererDiagnostic | null {
  if (resolvedAsset.definition.assetId !== expectedAssetId) {
    return {
      code: "asset-definition-mismatch",
      entityId: expectedAssetId,
      message: `Asset Resolver returned Asset Definition "${resolvedAsset.definition.assetId}" for Asset ID "${expectedAssetId}".`,
      severity: "error",
    };
  }

  const semanticErrors = validateAssetDefinitionSemantics(
    resolvedAsset.definition,
  ).filter((diagnostic) => diagnostic.severity === "error");

  if (semanticErrors.length > 0) {
    return {
      code: "asset-load-failed",
      entityId: expectedAssetId,
      message: `Asset Definition "${expectedAssetId}" is not semantically valid.`,
      severity: "error",
    };
  }

  return null;
}

async function resolveNodeAsset(
  node: Node,
  resolveAsset: AssetResolver,
): Promise<ResolvedAsset> {
  const resolvedAsset = await resolveAsset(node.assetId);
  const validationDiagnostic = validateResolvedAsset(
    node.assetId,
    resolvedAsset,
  );

  if (validationDiagnostic !== null) {
    throw new AssetSessionDiagnosticError(validationDiagnostic);
  }

  return resolvedAsset;
}

async function parseResolvedAsset(
  resolvedAssetPromise: Promise<ResolvedAsset>,
  options: CreateAssetSessionOptions,
  cachedAssetRoots: Set<Object3D>,
  counters: AssetSessionCounters,
): Promise<PreparedNodeAsset | null> {
  const resolvedAsset = await resolvedAssetPromise;

  if (options.isDisposed()) {
    return null;
  }

  const asset = await options.parseAsset(resolvedAsset.bytes);
  counters.parsedAssetCount += 1;

  if (options.isDisposed()) {
    disposeObjectResources(asset);
    return null;
  }

  cachedAssetRoots.add(asset);
  return { asset, resolvedAsset };
}

function instantiateAsset(
  loadedAsset: PreparedNodeAsset | null,
  options: CreateAssetSessionOptions,
  pendingAssets: Set<Object3D>,
  counters: AssetSessionCounters,
): PreparedNodeAsset | null {
  if (loadedAsset === null || options.isDisposed()) {
    return null;
  }

  const asset = clone(loadedAsset.asset);
  pendingAssets.add(asset);
  counters.nodeInstanceCount += 1;
  return { asset, resolvedAsset: loadedAsset.resolvedAsset };
}

function createAssetLoad(
  node: Node,
  options: CreateAssetSessionOptions,
  cachedAssetRoots: Set<Object3D>,
  pendingAssets: Set<Object3D>,
  counters: AssetSessionCounters,
): AssetLoad {
  const resolvedAsset = resolveNodeAsset(node, options.resolveAsset);
  let parsedAsset: Promise<PreparedNodeAsset | null> | undefined;

  return {
    async instantiate(): Promise<PreparedNodeAsset | null> {
      parsedAsset ??= parseResolvedAsset(
        resolvedAsset,
        options,
        cachedAssetRoots,
        counters,
      );
      return instantiateAsset(
        await parsedAsset,
        options,
        pendingAssets,
        counters,
      );
    },
    resolvedAsset,
  };
}

export function recoverableAssetDiagnostic(
  node: Node,
  error: unknown,
): SceneRendererDiagnostic {
  const diagnostic =
    error instanceof AssetSessionDiagnosticError
      ? error.diagnostic
      : {
          code: "asset-load-failed" as const,
          message: `Node "${node.id}" could not load Asset ID "${node.assetId}": ${
            error instanceof Error ? error.message : "Unknown error."
          }`,
          severity: "error" as const,
        };

  return {
    ...diagnostic,
    entityId: node.id,
    severity: "warning",
  };
}

export function createAssetSession(
  options: CreateAssetSessionOptions,
): AssetSession {
  const assetLoads = new Map<string, AssetLoad>();
  const cachedAssetRoots = new Set<Object3D>();
  const pendingAssets = new Set<Object3D>();
  const counters: AssetSessionCounters = {
    nodeInstanceCount: 0,
    parsedAssetCount: 0,
  };

  return {
    complete(asset: Object3D): void {
      pendingAssets.delete(asset);
    },
    disposalRoots(): readonly Object3D[] {
      return [...cachedAssetRoots, ...pendingAssets];
    },
    getMetrics(): AssetSessionMetrics {
      return {
        cachedAssetCount: cachedAssetRoots.size,
        ...counters,
      };
    },
    load(node: Node): AssetLoad {
      let assetLoad = assetLoads.get(node.assetId);

      if (assetLoad === undefined) {
        assetLoad = createAssetLoad(
          node,
          options,
          cachedAssetRoots,
          pendingAssets,
          counters,
        );
        assetLoads.set(node.assetId, assetLoad);
      }

      return assetLoad;
    },
  };
}
