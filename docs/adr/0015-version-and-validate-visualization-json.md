# Version and validate Visualization JSON

Every serialized Visualization declares a schema version and is parsed at the component boundary before reaching the engine. Supported older versions migrate to the current in-memory shape, invalid data produces structured diagnostics, and unknown future versions fail explicitly rather than rendering partially; this preserves saved scenes and creates a safe foundation for future evolution history.
