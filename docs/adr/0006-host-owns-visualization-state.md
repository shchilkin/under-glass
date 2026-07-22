# Host owns Visualization state

The embedding application is the source of truth for the current Visualization and passes it to the component as controlled state. The component emits the next Visualization together with the operation that produced it, while retaining only transient interaction state and session undo/redo; files, browser storage, databases, and version history remain outside the component boundary.
