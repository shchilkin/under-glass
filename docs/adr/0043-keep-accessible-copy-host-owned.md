# Keep accessible copy host-owned

`@under-glass/web` mirrors every Node, Group, and Connection into deterministic
semantic HTML beside the presentation-only WebGL canvas and renderer-owned
projected-label overlay. The host supplies a scene label and resolves
accessible entity copy from only `{ kind, id }`. The resolver cannot read
persisted presentation labels through this contract, and accessibility does
not add fields to the Visualization schema.

Nodes are listed exactly once through deterministic Group membership, with
ungrouped or orphaned Nodes remaining discoverable. Connections expose their
host label, source, target, and direction, including Connections whose visual
caption is intentionally empty. Camera mode and motion never reorder semantic
content. Replacing the Visualization updates one existing summary rather than
appending another.

The renderer-owned label overlay is `aria-hidden` and is not an accessibility
source. When WebGL2 is unavailable, the controller shows a visible renderer
fallback while preserving the complete semantic summary. Disposing the
controller removes the renderer, projected labels, summary, fallback, and
subscriptions together.

We rejected deriving accessible copy from persisted `label` values because
short perspective labels and relationship captions are not necessarily
sufficient out of visual context. We also rejected putting accessibility
metadata into the persisted schema before multiple hosts demonstrate a stable
cross-domain vocabulary.
