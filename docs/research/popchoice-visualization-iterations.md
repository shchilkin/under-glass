# PopChoice visualization iteration log

Date: 2026-07-24

Status: active prototype

## Goal

Make a real project understandable at a glance before investing in an editor. The first useful question is not “can Under Glass render twelve nodes?” but “can a viewer follow what the system does and then inspect how it is operated?”

The PopChoice fixture is deliberately more demanding than the earlier three-node demo. Its shared host model contains 12 Nodes and 17 Connections covering the user request path, queue workers, data, external providers, internal tools, and observability.

## Iterations

### 1. Put the whole system in one Visualization

What changed:

- Replaced the toy fixture with the production-facing PopChoice architecture.
- Rendered 12 Nodes, 17 Connections, and two large Groups together.

What worked:

- Proved that the renderer can load repeated assets once, route a non-trivial graph, and preserve both camera modes.
- Exposed real layout and labeling problems that the toy fixture concealed.

What did not work:

- Request flow, operations, discovery, external providers, and telemetry competed for attention.
- Two broad Groups did not express the system’s distinct concerns.
- There was no stable reading direction or obvious starting point.
- More labels made the model more complete but the picture less understandable.

Evidence: initial PopChoice commits `2b247ff` and `bfd1eb1`.

### 2. Add route hierarchy and quieter supporting links

What changed:

- Distinguished primary, supporting, and telemetry routes.
- Increased primary arrow and route emphasis while muting secondary paths.
- Added deterministic route-geometry coverage.

What worked:

- The recommendation path became more visible.
- Telemetry stopped carrying the same visual weight as the user flow.
- Route behavior became testable instead of depending only on screenshots.

What did not work:

- The scene still asked one view to explain several different stories.
- A highlighted path inside a crowded layout did not create a clear narrative.

Evidence: commits `b51cf43` and `fd2f659`.

### 3. Simplify generated forms and captions

What changed:

- Replaced the more elaborate generated node forms with quieter architectural primitives.
- Removed dark badge containers from Node labels and reduced label ornament.
- Tested subtler zone colors and label contrast.

What worked:

- Nodes became easier to distinguish from their labels.
- The scene became less visually noisy.
- Zone tint improved recognition after the zones had meaningful boundaries.

What did not work:

- Styling did not fix the information architecture.
- Color changes alone could not explain where to start or why every Node was present.
- Connection labels still competed when too many concerns were shown together.

Evidence: commit `7d4bb48` and the 2026-07-24 visual review.

### 4. Compare the reading model with Isoflow

Observed patterns:

- Large spatial zones establish context before local labels.
- Strong arrows carry the main reading sequence.
- Connection labels are short and secondary.
- One underlying model can support multiple views for different audiences.

Decision:

- Stop treating “one complete diagram” as the default.
- Prototype two purpose-specific views with one shared host model.
- Preserve a left-to-right reading direction and use zones to explain why a Node is present.

This is a reading-model reference, not an attempt to reproduce Isoflow’s implementation or visual assets.

### 5. Project two host-owned preset views

What changed:

- Added `Recommendation` as the default view: 7 Nodes, 7 Connections, and 3 zones.
- Added `Operations`: 11 Nodes, 10 Connections, and 5 zones.
- Kept one set of Node and Connection templates with stable IDs.
- Added a visible view selector and URL-backed `view` state.
- Recreated the renderer only when the concrete Visualization changes; camera motion changes still update the existing renderer.
- Added distinct but quiet host-defined treatments for runtime, data, providers, operations, and observability zones.

What currently works:

- `Recommendation` has one clear entry point and a left-to-right request-to-result path.
- `Operations` separates tools, platform data, providers, runtime signals, and observability.
- Both preset views remain understandable in isometric and top cameras.
- The switch makes omitted Nodes intentional rather than apparently missing.
- The public renderer and schema remain unchanged.

What remains imperfect:

- Labels still use simple collision avoidance rather than leader lines or zoom-aware progressive disclosure.
- Switching preset views recreates the renderer because there is no public `setVisualization` contract.
- The shared source model is fixture code, not a reusable public Source Graph package.
- Visual acceptance still requires owner review; passing browser tests is not an artistic sign-off.

### 6. Put zone typography into the 3D world

What changed:

- Group names now render as transparent texture planes inside their zone surfaces.
- Zone typography follows the ground-plane perspective during camera motion.
- Node and Connection labels remain screen-space overlays.
- Visually hidden Group text remains in the semantic overlay for accessibility.

What works:

- Zone names now feel printed into the architecture instead of floating above it.
- The transition between isometric and top cameras has one coherent spatial model.
- Entity labels keep a stable readable size while structural labels communicate depth.

What we deliberately deferred in this iteration:

- Applying perspective to every label at once. Route captions moved into world space only in the next isolated experiment, while Node names remain screen-space.
- Adding a schema-level label mode before the mixed world-space/screen-space treatment is validated across more projects.

### 7. Align Connection captions with their routes

What changed:

- Connection captions now render as compact world-space nameplates.
- Each caption sits on the longest orthogonal segment and rotates with that segment.
- Deterministic lanes and a world-space collision pass separate captions that share route geometry.
- Caption scale decreases continuously as the camera approaches Top and grows again toward Isometric.
- Primary, supporting, and telemetry captions inherit distinct restrained text colors.
- Semantic Connection text remains in the visually hidden HTML overlay.

What this tests:

- Whether route captions can join the 3D composition without losing the quick badge-like recognition of `HTTPS`, `Jobs`, and `Persist`.
- Whether the same caption placement remains useful in isometric and top cameras.
- Whether Node names should remain the final screen-space typography layer.

### 8. Embed Node names into the scene

What changed:

- Node names now render as transparent world-space text planes beside their models.
- Node typography stays the primary high-contrast sans-serif role; Group and Connection typography keep their existing structural and routing roles.
- Node labels enter collision layout before Connection captions, so route details yield to entity identity.
- Authored label origins are restored before each layout pass, preventing progressive drift while assets resolve.
- Node labels scale down slightly toward Top while remaining larger than Connection captions.
- Semantic Node text remains in the visually hidden HTML overlay.

What worked:

- The graph now reads as one spatial composition instead of a 3D scene with a floating DOM annotation layer.
- Camera motion preserves the relationship between a model and its name.
- The role hierarchy remains visible without introducing new schema fields.

What did not carry forward:

- Screen-space Node labels were crisp and stable, but they visually detached from the diagram during camera motion.
- Treating Node labels as fixed collision obstacles made dense views brittle, so they receive deterministic placement before lower-priority Connection captions.

### 9. Establish spatial rhythm and dense-view fallback

What changed:

- Recommendation and Operations now use aligned Node rows or columns, at least one world unit of interior Group padding, and at least 1.5 world units between Group regions.
- The focused Recommendation flow uses a four-unit Node rhythm and wider gutters between Runtime, Data, and Providers.
- The Viewer projects world-space label bounds into screen space for the current camera pose.
- At ordinary desktop widths Node and Group labels remain protected while conflicting Connection captions yield.
- Compact containers use deterministic progressive disclosure in the order Node, Group, Connection.
- Portrait camera projection preserves the authored horizontal span by zooming out instead of cropping it.
- The scene exposes the number of visually hidden labels as renderer diagnostics while semantic HTML retains every label.

What this fixes:

- Models no longer look casually distributed inside their regions.
- Group regions read as separate systems instead of adjacent colored patches.
- Isometric compression and smaller containers no longer collapse every caption into one unreadable cluster.

What remains for an Editor:

- Authoring positions, alignment constraints, manual route anchors, and intentional exceptions.
- Reflowing the graph itself when a user chooses a new composition.
- Selecting explicit importance when two Nodes cannot both remain visible.

## Current decisions

- The default PopChoice preset is `Recommendation`.
- `Operations` is a second view, not an expanded default.
- Both views derive from shared host-side templates and retain stable semantic IDs.
- Layout, grouping, visible labels, and Opening View belong to a preset view.
- Group names, Node names, and Connection captions use world-space typography.
- The renderer-owned projected-label overlay is hidden from assistive
  technology; `@under-glass/web` owns a separate synchronized semantic summary.
- The Viewer may hide lower-priority visual labels for the current camera pose, but never mutates authored geometry.
- Editor-authored layout and Viewer-side decluttering are separate responsibilities.
- The public API continues to accept one concrete `Visualization`.
- A public Source Graph or View abstraction remains deferred until more real projects validate the pattern.
- Realtime collaboration, persisted version history, and free camera remain outside this prototype.
- The first Editor slice is deliberately limited to selecting and moving existing Nodes with session-local undo/redo; creation, property editing, and automatic layout remain deferred.

## Deferred experiments

- Zoom-driven progressive disclosure.
- White callout cards with leader lines for selected or high-priority Nodes.
- Animated layout interpolation between preset views.
- A reusable host projection helper or adapter package.
- Audience-specific view metadata in the public schema.

## Acceptance signals for the next review

- A viewer can identify the entry point, main processing path, and result dependencies in the default view without explanation.
- A viewer can explain why a Node is absent from one view and present in the other.
- The same preset remains legible in both isometric and top cameras.
- Adding a third real project does not require changing the renderer contract.

## Verification

- Projection tests cover shared IDs, view contents, group containment, visible endpoints, and deterministic orthogonal routes.
- Browser coverage checks both preset views, both camera modes, URL state, lifecycle reset, label counts, and asset deduplication.
- Manual browser review was performed for Recommendation and Operations in isometric and top cameras at the desktop playground size.

### 10. Separate visual labels from host-owned accessible copy

What worked:

- One host resolver supplies context-rich labels from stable `{ kind, id }`
  references for both Recommendation and Operations.
- Group membership creates a compact hierarchy while every Connection retains
  source, target, and direction.
- The same semantic order survives camera transitions, and switching preset
  views replaces the summary without stale or duplicate entities.
- A visible WebGL2-unavailable fallback coexists with the complete semantic
  summary.

What did not work:

- Treating projected label DOM as both visual typography and accessibility
  duplicated terse presentation copy and exposed labels hidden for
  decluttering.
- Deriving accessible copy from persisted `label` fields coupled domain
  semantics to camera-oriented presentation.

Decision:

- The projected label layer is `aria-hidden`.
- `@under-glass/web` owns the semantic mirror and fallback lifecycle.
- Accessible copy remains host-owned and does not expand Visualization v1.

### 11. Add the minimum Editor loop after the diagram proved its value

What changed:

- Added framework-neutral transient Selection without writing it into the
  host-owned Visualization.
- Pointer movement projects onto the same Ground Plane in Isometric and Top.
- Grid snapping is configurable and may be disabled without changing the
  continuous persisted coordinate model.
- Asset Footprints reject overlaps before commit and give invalid previews a
  deterministic scene treatment.
- A valid drag emits one reversible Move Node Operation and one next
  Visualization, rather than emitting every pointer movement.
- Session-local bounded undo/redo supports controls and platform keyboard
  shortcuts. A new Operation after undo clears redo.
- The hidden semantic mirror exposes Node buttons for keyboard selection and
  expands into a visible focus surface while those controls are used.

What worked:

- The renderer can preview one Node, its world-space label, and its basic
  Connections together without persisting intermediate states.
- Selection survives renderer replacement after a committed Operation.
- The host remains the persisted source of truth: it receives completed
  Operations and concrete Visualizations.
- Recommendation now proves the full select → move → undo → redo loop in a
  real project diagram rather than a toy editor fixture.

What did not expand into this slice:

- No create/delete Node flow, property inspector, Group editing, route-anchor
  authoring, automatic layout, or free camera.
- Invalid placement is collision-only; Group containment and authored layout
  rules need separate domain decisions.
- Replacing the renderer on every committed Visualization is acceptable for
  this prototype but should be measured before treating it as the final
  high-frequency editing architecture.

Decision:

- Keep selection, drag preview, and history transient inside an Editor
  Controller.
- Keep deterministic Operations and placement rules in `@under-glass/core`.
- Keep hit testing, Ground Plane projection, and visual preview in
  `@under-glass/three`.
- Continue to expose host-owned concrete Visualization snapshots rather than
  introduce a persistent editor document or collaboration backend.
