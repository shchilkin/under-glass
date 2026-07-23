# Store Ground Span instead of camera zoom

An Opening View stores its framing as the number of Ground Plane units visible across the viewport height, rather than persisting a Three.js camera zoom value. The renderer derives orthographic camera parameters from this Ground Span so responsive viewports and switches between isometric and top modes preserve a stable domain-level scale.
