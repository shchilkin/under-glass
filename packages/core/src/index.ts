export {
  deriveVisualizationBounds,
  routeBasicConnections,
  type BasicConnectionRoute,
} from "./basic-routing.js";

export {
  createEditorOperationHistory,
  type CreateEditorOperationHistoryOptions,
  type EditorHistorySnapshot,
  type EditorHistoryTransition,
  type EditorOperationHistory,
} from "./editor-history.js";

export {
  applyMoveNodeOperation,
  invertMoveNodeOperation,
  type MoveNodeOperation,
} from "./editor-operation.js";

export {
  assertValidGridStep,
  evaluateNodePlacement,
  snapGroundPoint,
  type EvaluateNodePlacementOptions,
  type NodePlacementPreview,
} from "./editor-placement.js";

export { groundPointsEqual } from "./geometry.js";

export {
  ASSET_DEFINITION_SCHEMA_VERSION,
  assetDefinitionSchema,
  parseAssetDefinition,
  safeParseAssetDefinition,
  type AssetDefinition,
  type AssetFootprint,
  type AssetLocalPoint,
  type AssetProvenance,
  type ConnectionPort,
  type GroundNormal,
  type Quaternion,
} from "./asset-definition.js";

export {
  validateAssetDefinitionSemantics,
  type AssetDefinitionDiagnostic,
  type AssetDefinitionDiagnosticCode,
  type AssetDefinitionDiagnosticPath,
} from "./asset-definition-validation.js";

export type { DiagnosticPath, DiagnosticSeverity } from "./diagnostics.js";

export {
  StructuralValidationError,
  type PersistedContractKind,
  type StructuralDiagnostic,
  type StructuralDiagnosticCode,
  type StructuralParseResult,
} from "./structural-validation.js";

export {
  CURRENT_SCHEMA_VERSION,
  parseVisualization,
  safeParseVisualization,
  visualizationSchema,
  type Connection,
  type ConnectionEndpoint,
  type GroundBounds,
  type GroundPoint,
  type Group,
  type JsonValue,
  type Node,
  type OpeningView,
  type QuarterTurns,
  type RouteAnchor,
  type SourceReference,
  type Visualization,
} from "./visualization.js";

export {
  validateVisualizationSemantics,
  type VisualizationDiagnostic,
  type VisualizationDiagnosticCode,
  type VisualizationDiagnosticPath,
  type VisualizationEntityKind,
} from "./semantic-validation.js";
