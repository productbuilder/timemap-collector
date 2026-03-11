# Publish a collection

This technical companion supports the public guide at `site/docs/publish-a-collection.html`.

## Required outputs
- A stable `collection.json` manifest URL.
- Stable item detail URLs (if item summaries link to details).
- Stable media URLs.
- Optional `/.well-known/collections.json` Domain Collections Discovery (DCD).

## Suggested publish flow
1. Build collection metadata and item summaries.
2. Generate/validate `collection.json` against the collection manifest structure.
3. Publish manifest + assets with stable URL paths.
4. Validate URLs through Collection Browser and/or test scripts.
5. Optionally register endpoint in Collection Registry for indexing workflows.

## Notes
- LinkedCollections is the architecture.
- Open Collections Protocol is the umbrella framing.
- DCD is the domain-level discovery mechanism.
