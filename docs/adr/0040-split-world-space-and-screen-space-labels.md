# Split world-space and screen-space labels

Group names render as transparent textured planes inside their Group surfaces so they share the scene’s perspective and animate naturally between isometric and top cameras. Node and Connection labels remain screen-space HTML overlays because they carry denser operational information and need stable size, collision handling, and crisp legibility. The overlay retains visually hidden Group text for accessibility, while this presentation distinction remains a renderer concern rather than a new Visualization schema field.
