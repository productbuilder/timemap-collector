# Resource Identity

## Overview

Resources in LinkedCollections must be identifiable so that they can be:

- referenced across collections
- indexed by discovery services
- reused by different applications
- verified when assets are mirrored or cached

LinkedCollections supports three levels of identity:

1. local identifiers
2. canonical URL identifiers
3. optional content-hash identifiers

Each serves a different purpose.

---

# 1. Local Identifiers

Local identifiers are used inside a collection.

Example:

```json
{
  "id": "harbor-map-1890",
  "type": "item",
  "title": "Harbor Map 1890"
}
```

Local identifiers are:

- unique within the collection
- simple and human-readable
- useful for editing and internal references

They do not need to be globally unique.

Example structure:

```text
collection.json
items/
  harbor-map-1890.json
```

---

# 2. Canonical URL Identifiers

For resources that are published on the web, the canonical identifier should be a stable URL.

Example:

```text
https://museum.example.org/items/harbor-map-1890.json
```

This URL becomes the global identity of the resource.

Advantages:

- globally unique
- resolvable via HTTP
- compatible with web linking
- works across institutions

Example resource:

```json
{
  "id": "https://museum.example.org/items/harbor-map-1890.json",
  "type": "item",
  "title": "Harbor Map 1890"
}
```

In this model:

URL = global identity of the resource.

---

# 3. Content Hash Identifiers

Assets may optionally include a content hash.

Example:

```json
{
  "type": "asset",
  "url": "https://museum.example.org/media/harbor-map.jpg",
  "hash": "sha256:9c1a6f..."
}
```

Content hashes identify the **content itself**, not the location.

They are useful for:

- verifying downloads
- detecting duplicate assets
- enabling mirrors and caching
- ensuring archival integrity

This model is widely used in systems such as:

- Git
- IPFS
- Docker image layers

---

# URL Identity vs Content Identity

LinkedCollections separates two concepts:

Location identity

```text
URL
```

Content identity

```text
hash
```

Example:

```text
URL → where the resource is located
hash → what the resource contains
```

Both may exist together.

---

# Identity Strategy

A typical identity workflow may look like this.

During authoring:

- resources use local identifiers

When publishing:

- resources gain canonical URLs

For assets:

- optional content hashes may be generated

Example asset:

```json
{
  "type": "asset",
  "url": "https://museum.example.org/media/harbor-map.jpg",
  "sizeBytes": 3245210,
  "hash": "sha256:9c1a6f..."
}
```

---

# Implications for the Ecosystem

Using layered identity allows the system to remain simple while supporting powerful features.

Local identifiers support:

- easy authoring
- simple collection structures

URL identifiers support:

- distributed linking
- global references
- web-native publishing

Content hashes support:

- verification
- deduplication
- archival integrity

---

# Guiding Principle

A useful rule for LinkedCollections is:

Use simple local identifiers during authoring.
Use stable URLs as the global identity of published resources.
Optionally use content hashes to verify assets.

---

# Conclusion

LinkedCollections uses a layered identity model that balances simplicity with long-term robustness.

Resources can start with simple local identifiers, become globally addressable through URLs, and optionally include content hashes for verification and reuse.

This approach keeps the system easy to adopt while allowing it to scale across a distributed ecosystem.

---

End of document.
