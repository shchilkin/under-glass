# Under Glass

This context describes interactive three-dimensional visualizations of software projects and the elements shown within them.

## Language

**3D Asset**:
A glTF or GLB representation of the geometry and materials used to depict an element in a scene.
_Avoid_: Model, custom model, icon

**Asset Definition**:
The editable description that prepares a 3D Asset for use in a Visualization, including its scale, orientation, Ground Plane footprint, and Connection Ports.
_Avoid_: Asset metadata, manifest, model configuration

**Asset ID**:
A stable opaque identifier through which a host resolves the Asset Definition used by a Node.
_Avoid_: Asset URL, file path, model ID

**Asset Footprint**:
The asset-local rectangular X/Z area reserved by a 3D Asset when it is placed on the Ground Plane.
_Avoid_: Collision box, bounds, hitbox

**Asset Placeholder**:
The standard geometry shown for a Node when its Asset ID cannot be resolved or its 3D Asset cannot be loaded, preserving the Node's label, footprint, and Connections.
_Avoid_: Missing model, error cube, fallback icon

**Asset Provenance**:
The licensing and source information carried by an Asset Definition so that a 3D Asset's origin remains identifiable independently of the code package.
_Avoid_: Asset metadata, license string

**Visualization**:
A host-supplied graph that can be rendered and explored as a three-dimensional scene.
_Avoid_: Diagram, document, project

**Opening View**:
The author-defined camera mode, quarter-turn orientation, and framing used when a Viewer first presents a Visualization.
_Avoid_: Saved view, camera state, viewport

**Camera Mode Transition**:
A transient camera orbit between the canonical isometric and top modes that preserves the scene center, quarter-turn orientation, and Ground Span without changing the Visualization. The latest requested mode always becomes its target, including while a previous transition is still moving; scene labels remain visible and anchored throughout. When the visitor prefers reduced motion, the target mode is applied immediately instead.
_Avoid_: Scene rotation, view morph, saved camera animation

**Poster**:
A deterministic static rendering of a Visualization's Opening View, used before hydration or when interactive rendering is unavailable.
_Avoid_: Screenshot, thumbnail, fallback image

**Operation**:
A completed, atomic authoring action that transforms one valid Visualization snapshot into another and can be reversed within the current editing session.
_Avoid_: Change event, history entry, mutation

**Scene Theme**:
The shared lighting, Ground Plane, label, Connection, Group, and interaction-state presentation applied without replacing a 3D Asset's own materials.
_Avoid_: Skin, material set, color scheme

**Style Key**:
A stable semantic name stored on a Node, Connection, or Group and resolved to concrete presentation by the active Scene Theme.
_Avoid_: Color, class name, material

**Source Reference**:
Optional provenance that links a Visualization entity to a stable entity or view in an external source without making that source authoritative at runtime.
_Avoid_: External ID, sync key, import metadata

**Node**:
An individually positioned, labelled, and quarter-turn-oriented element in a Visualization, depicted by a 3D Asset and optionally carrying host-defined metadata.
_Avoid_: Service, object, item

**Node Label**:
Screen-facing text anchored to a Node and kept readable independently of camera mode or Node orientation.
_Avoid_: Caption, 3D text, nameplate

**Connection**:
A relationship between two Nodes in a Visualization, optionally displayed with a label and direction in either or both directions.
_Avoid_: Edge, connector, line

**Connection Port**:
A named attachment point supplied by an Asset Definition for terminating Connections; when none are supplied, the component derives attachment points from the Asset's Ground Plane footprint.
_Avoid_: Handle, socket, anchor

**Connection Route**:
The orthogonal path of a Connection across the Ground Plane, including its entry segments at the connected Nodes.
_Avoid_: Path, wire, spline

**Route Anchor**:
A user-positioned constraint that a Connection Route must preserve when it is recalculated.
_Avoid_: Control point, bend, waypoint

**Route Conflict**:
A state in which no valid Connection Route can satisfy all of its Route Anchors and current scene obstacles.
_Avoid_: Broken connection, routing error

**Group**:
A movable visual region whose member Nodes reference it explicitly, without assigning them domain-specific meaning. Groups do not contain other Groups.
_Avoid_: Environment, cluster, container

**Group Bounds**:
The user-controlled Ground Plane area occupied by a Group; it expands when necessary to contain member Nodes with padding but never shrinks automatically.
_Avoid_: Group size, bounding box, rectangle

**Ground Plane**:
The horizontal X/Z surface on which Nodes and Groups are positioned; vertical placement is derived by the component.
_Avoid_: Canvas, grid, floor

**Ground Contact**:
The asset-local point aligned with a Node's position on the Ground Plane after the 3D Asset's scale and normalization rotation are applied.
_Avoid_: Pivot, origin, Y offset

**Ground Span**:
The number of Ground Plane units framed across the viewport height by an Opening View, independently of renderer-specific camera zoom values.
_Avoid_: Zoom, camera scale, magnification
