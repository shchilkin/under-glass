# Render Node Labels as an HTML overlay

Node Labels are rendered as HTML positioned from projected scene anchors rather than as WebGL glyphs, a 2D canvas layer, or 3D geometry. Within the 200-Node performance envelope, native web typography, responsive layout, interaction, and future accessibility integration outweigh the cost of synchronizing the overlay and explicitly compositing labels during image export.
