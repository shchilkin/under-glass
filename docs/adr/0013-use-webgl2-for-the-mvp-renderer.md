# Use WebGL2 for the MVP renderer

The MVP uses Three.js `WebGLRenderer` behind an internal renderer interface. The target scene size does not require WebGPU, while Three.js still describes `WebGPURenderer` as experimental and gives it a different material and post-processing pipeline; keeping the backend private lets a later WebGPU implementation be evaluated without changing the Visualization or React component APIs.
