# Let the host resolve assets

Nodes persist an Asset ID instead of a GLB URL or storage location. The host supplies an Asset Definition catalog or asynchronous resolver, allowing the same Visualization to load assets from package files, a CDN, local blobs, or authenticated storage without coupling the component or serialized format to persistence infrastructure.
