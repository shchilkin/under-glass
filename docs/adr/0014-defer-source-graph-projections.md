# Defer source graph projections

The MVP accepts a concrete host-owned Visualization and does not introduce a separate Source Graph or generate multiple Visualizations from one semantic model. Persisted entities use stable opaque IDs and may carry a Source Reference for future import provenance; projection layers and adapters such as Structurizr workspace JSON remain separate future packages, preserving interoperability without expanding the first editor and renderer.
