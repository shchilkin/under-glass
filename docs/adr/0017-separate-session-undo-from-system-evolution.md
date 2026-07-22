# Separate session undo from system evolution

Each completed editor action emits one reversible Operation together with the next Visualization snapshot; continuous gestures such as dragging are coalesced into a single Operation at completion. Undo and redo remain session-local and are not serialized, while a future host may persist emitted Operations to present system evolution without making persistent version history part of the component or MVP.
