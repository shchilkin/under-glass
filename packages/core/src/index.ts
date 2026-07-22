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
