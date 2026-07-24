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

## Current decisions

- The default PopChoice preset is `Recommendation`.
- `Operations` is a second view, not an expanded default.
- Both views derive from shared host-side templates and retain stable semantic IDs.
- Layout, grouping, visible labels, and Opening View belong to a preset view.
- Group names and Connection captions use world-space typography; Node labels remain screen-space.
- The public API continues to accept one concrete `Visualization`.
- A public Source Graph or View abstraction remains deferred until more real projects validate the pattern.
- Realtime collaboration, version history, free camera, and editor work remain outside this prototype.

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
