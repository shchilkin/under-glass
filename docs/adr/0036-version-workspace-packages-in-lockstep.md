# Version workspace packages in lockstep

Under Glass uses one release train for the repository and every `@under-glass/*` workspace package, so a repository tag such as `v0.1.0` corresponds to package manifests and internal dependency ranges at `0.1.0`. The packages are closely coupled parts of one product, and the simpler compatibility and release model outweighs the flexibility of independent package versions; npm publication remains a separate release decision.
