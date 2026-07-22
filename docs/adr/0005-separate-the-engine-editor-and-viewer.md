# Separate the engine, editor, and viewer

The product is split into a headless visualization engine, a ready-to-use React editor, and a lightweight React viewer. The engine owns graph operations, selection, placement, routing, and undo/redo; the editor supplies the standard authoring interface, while the viewer exposes only exploration. This provides a useful default component without coupling the reusable 3D behavior to one interface.
