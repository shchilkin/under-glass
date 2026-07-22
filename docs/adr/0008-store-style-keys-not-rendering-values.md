# Store style keys instead of rendering values

Visualizations store semantic Style Keys on Nodes, Connections, and Groups rather than concrete colors, widths, or renderer materials. The host-supplied Scene Theme resolves those keys and the component provides a default theme; this keeps saved data portable across light, dark, and site-specific presentation without replacing the materials authored into 3D Assets.
