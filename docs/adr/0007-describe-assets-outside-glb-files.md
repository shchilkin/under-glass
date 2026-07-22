# Describe assets outside GLB files

Imported glTF or GLB files remain unchanged, while an editable Asset Definition records the scale, orientation, ground contact, footprint, and Connection Ports required by the component. Import derives sensible initial values from the asset bounds, but users can override them; separating the binary asset from its visualization contract supports arbitrary files without requiring a destructive asset-processing pipeline.
