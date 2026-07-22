# Resolve GLB assets to bytes at the host boundary

The host Asset Resolver returns an Asset Definition and GLB bytes as an `ArrayBuffer`, rather than giving the renderer a URL to fetch. This keeps storage, authentication, CORS, retry, and caching policy outside the renderer; a standard URL resolver helper can cover public CDN assets without introducing a second renderer loading contract.
