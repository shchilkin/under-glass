# Structurizr and related architecture tools

Research date: 2026-07-22

## Decision summary

Structurizr is a useful **product and data-model reference**, but it should not become the renderer, editor foundation, or runtime dependency for this project.

The strongest idea to borrow is the separation between a reusable source model and named views derived from it. The current component boundary should remain unchanged: the host passes one concrete, host-owned `Visualization` to the engine. A future project-level layer or import adapter may derive several Visualizations from one external architecture model.

No architecture tool reviewed here should be added as an MVP dependency. The first interoperability feature worth considering later is a lossy, explicit **Structurizr workspace JSON importer**. LikeC4 JSON is the next most useful candidate. D2, Mermaid, and C4-PlantUML are better treated as documentation export targets than as canonical inputs.

## Why Structurizr is useful

Structurizr is the reference “models as code” implementation for C4 and creates multiple architecture diagrams from one model ([official repository](https://github.com/structurizr/structurizr), [DSL language reference](https://docs.structurizr.com/dsl/language)). Its workspace has a model, relationships, views, styles, properties, perspectives, and stable view keys. It also supports custom elements outside C4, although custom elements have more limited hierarchy than its C4 elements ([custom elements](https://docs.structurizr.com/dsl/cookbook/custom-elements/), [custom views](https://docs.structurizr.com/ui/diagrams/custom-view)).

This makes Structurizr valuable for four concepts:

1. **Model and view are different things.** A view selects a subset or projection of a model; filtered, dynamic, deployment, and custom views do not require duplicating the underlying elements ([view definitions](https://docs.structurizr.com/dsl/language), [dynamic views](https://docs.structurizr.com/dsl/cookbook/dynamic-view/)). For this project, that suggests a future layer above `Visualization`, not additional responsibility inside the renderer.
2. **Stable identity protects authored work.** Structurizr warns that generated view keys and changing internal element identity can lose manually authored layout during DSL-to-JSON merging ([layout troubleshooting](https://docs.structurizr.com/local/troubleshooting)). Our Node, Connection, Group, view, and future source-model IDs should therefore be explicit, stable, and independent of array order or labels.
3. **Semantic metadata is separate from presentation.** Structurizr attaches properties and perspectives to elements and relationships, while tags select styles ([properties and perspectives](https://docs.structurizr.com/dsl/language), [static perspectives](https://docs.structurizr.com/dsl/cookbook/perspectives-static/)). This supports our existing `metadata` and `Style Key` boundary. A future Viewer could use metadata-driven filters or perspective overlays without teaching the core about services, databases, or environments.
4. **A sequence is not version history.** Structurizr dynamic views show ordered instances of existing relationships for a use case ([dynamic views](https://docs.structurizr.com/dsl/cookbook/dynamic-view/)). That is a useful later concept for presenting system behaviour, but it should be modeled separately from “how the system changed over time”.

Structurizr's current consolidated repository is active and Apache-2.0 licensed; its official repository showed a 2026-06-28 release when checked ([repository and license](https://github.com/structurizr/structurizr)). This makes its schemas and exporter code reasonable references, but does not change the dependency recommendation.

## Ideas worth adopting

### Adopt now in the public data contract

- Stable opaque IDs for every persisted entity. Labels and collection positions must never act as identity.
- Optional provenance metadata for imports, such as `source.kind`, `source.workspaceId`, `source.elementId`, and `source.viewKey`.
- A clean distinction between semantic data (`metadata`, direction, labels) and rendering choices (`Style Key`, `Scene Theme`, 3D Asset mapping).
- Deterministic generated layout and routing, with explicit authored positions and `Route Anchors` taking precedence.

### Design for later without implementing now

- A project-level **Source Graph -> Visualization projection** layer. One source graph could produce overview, deployment, or focused Visualizations, while every Visualization retains its own X/Z layout and routes.
- View filters over type, tags, and metadata. Structurizr filtered views and LikeC4 predicates show why this becomes valuable once a source model grows ([Structurizr filtered views](https://docs.structurizr.com/dsl/language), [LikeC4 view predicates](https://likec4.dev/dsl/views/predicates/)).
- Dynamic/use-case presentations that order existing Connections, plus D2-style scenarios or steps for explanatory storytelling ([D2 composition](https://d2lang.com/tour/composition/), [D2 scenarios](https://d2lang.com/tour/scenarios/)).
- A generated legend from visible Style Keys and Asset Definitions. It should be a Viewer/UI feature rather than part of the scene data.

## Ideas to avoid

- **Do not bake C4 levels into the engine.** Structurizr intentionally constrains element types and what may appear in each C4 view. Our confirmed contract is a generic host-owned multigraph, and true 3D Assets may represent software, hardware, buildings, people, or anything else.
- **Do not adopt implied relationships.** Structurizr can infer higher-level relationships and recommends collapsing multiple relationships to reduce clutter ([implied relationships](https://docs.structurizr.com/dsl/cookbook/implied-relationships/)). Our graph deliberately preserves independently identified parallel Connections. Any aggregation should be an optional view operation, never a mutation of source data.
- **Do not make automatic layout canonical.** Structurizr keeps manual layout in compiled workspace JSON rather than DSL and documents merge edge cases ([DSL vs JSON](https://docs.structurizr.com/workspaces/file-types), [layout troubleshooting](https://docs.structurizr.com/local/troubleshooting)). Our authored X/Z positions, Group Bounds, ports, and Route Anchors must live in the host-owned Visualization itself.
- **Do not copy unlimited nesting or group endpoints into the MVP.** Mermaid architecture diagrams allow nested groups and special edges routed through group boundaries ([Mermaid architecture syntax](https://mermaid.js.org/syntax/architecture.html)). Those features conflict with the confirmed one-level, non-connectable Group model and can be revisited only after real scenes require them.
- **Do not reuse a 2D exporter as the rendering core.** Structurizr explicitly documents that PlantUML and Mermaid exports lose interactive features, manual layout, filtered views, and parts of styling ([exporter comparison](https://docs.structurizr.com/exporters/comparison)). They cannot represent GLB assets, one shared top/isometric layout, grounded 3D routes, ports, or Route Anchors.

## Interoperability opportunities

### 1. Structurizr JSON import - recommended first adapter

Prefer compiled `workspace.json`, an open JSON format containing the model, views, and layout, over embedding the Java-based DSL parser ([workspace file types](https://docs.structurizr.com/workspaces/file-types)). The official export command can convert DSL to JSON ([export command](https://docs.structurizr.com/export)).

Suggested mapping:

| Structurizr | This project |
| --- | --- |
| person, software system, container, component, deployment/custom element | Node |
| relationship | Connection |
| group or selected hierarchy level | one-level Group, when unambiguous |
| name | Node label |
| description, technology, properties, perspectives, URL, original type | host metadata |
| tags | metadata plus optional host-configured Style Key mapping |
| one named Structurizr view | one imported Visualization |

The import must be explicitly lossy:

- ignore Structurizr's 2D coordinates and run our placement flow, because they do not encode X/Z footprints, 3D Asset bounds, Connection Ports, or grounded routes;
- preserve original IDs and view keys as provenance;
- ask the host to map element types/tags to Asset Definitions and Style Keys;
- flatten, skip, or report unsupported hierarchy rather than inventing silent semantics;
- import each relationship separately and disable implied-relationship creation in our adapter;
- produce a one-time Visualization snapshot in MVP, not bidirectional synchronization.

### 2. LikeC4 JSON import - promising second adapter

LikeC4 is closer to our generic boundary than strict C4: its specification defines custom element and relationship kinds, tags, metadata, nested elements, and whether parallel relationships remain separate ([specification](https://likec4.dev/dsl/specification/), [relationship styling](https://likec4.dev/dsl/styling/)). Views are model projections and the CLI officially exports JSON ([views](https://likec4.dev/dsl/views/), [CLI JSON export](https://likec4.dev/tooling/cli/)).

That flexibility makes LikeC4 a good semantic import source, but still not a runtime dependency. Its automatic 2D layout, nested hierarchy, merged view connections, and React/SVG rendering semantics do not solve our 3D placement or routing problem.

### 3. D2, Mermaid, and C4-PlantUML - export targets

- **D2** is useful for human-readable documentation and future scenario/step exports. Its boards and automatic 2D layouts do not preserve our authored 3D scene.
- **Mermaid architecture diagrams** provide groups, services, directional edge endpoints, arrows, junctions, and deterministic layout by default ([architecture syntax](https://mermaid.js.org/syntax/architecture.html)). A basic export is feasible, but GLB assets, metadata, parallel route geometry, Group Bounds, and Route Anchors will be lost.
- **C4-PlantUML** is appropriate only when the host supplies a C4 mapping. It offers C4 element/boundary macros, relationships, dynamic/deployment diagrams, tags, and layout hints, but the project itself describes PlantUML as a drawing tool rather than a modeling tool ([official C4-PlantUML repository](https://github.com/plantuml-stdlib/C4-PlantUML)). Generic Nodes cannot be assigned C4 meaning automatically.

Exports should therefore be separate adapters with documented loss, never round-trip persistence formats.

## Dependency recommendation

For the MVP:

- no Structurizr, LikeC4, D2, Mermaid, PlantUML, Graphviz, or ELK runtime dependency;
- no built-in C4 domain types;
- no source-model/view-projection subsystem yet;
- keep the pure TypeScript model/router and direct Three.js renderer boundaries already decided.

When interoperability becomes a real use case, implement adapters in separate packages or host code. Start with `Structurizr workspace JSON -> Visualization`, validate it against two or three real project workspaces, and only then decide whether a generic source-model layer is justified.
