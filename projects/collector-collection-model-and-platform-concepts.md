# TimeMap Collector — Collection Model and Platform Concepts

## 1. Purpose

This document describes the conceptual model behind the TimeMap Collector ecosystem and the proposed collection format.

The goal is to make cultural collections publishable in a simple, portable, and storage-agnostic way so they can be reused by shared TimeMap services without requiring each publisher to run a custom technical stack.

## 2. Core platform concepts

### Collector

Collector is the authoring and publication tool. It is responsible for:

- connecting to source storage
- browsing and selecting assets
- editing lightweight metadata
- publishing collection manifests and item metadata

In practice, Collector helps a collection owner produce a valid, publishable collection package from files they already manage.

### Registrator

Registrator is the registry and catalog layer. It is responsible for:

- registering published collections
- storing manifest locations
- tracking publisher and collection ownership
- tracking validation and indexing status
- helping make collections discoverable and governable

In practice, Registrator is where published collections become known to the wider platform.

### Indexer

Indexer is the ingestion and processing layer. It is responsible for:

- reading published collection manifests
- reading item metadata
- normalizing and validating data
- building searchable and queryable data structures
- supporting TimeMap features such as search, stories, timelines, and maps

In practice, Indexer transforms published files into platform-ready structures.

### High-level flow

```text
Source storage
→ Collector
→ Published collection
→ Registrator
→ Indexer
→ TimeMap services
```

## 3. Why this model removes the need for a public database per collection owner

With this architecture, collection owners do **not** need to maintain:

- a public database
- a public API
- a search layer
- a custom service stack

Instead, they only need to publish:

- media files
- metadata files
- a collection manifest

The heavier responsibilities are handled by shared services:

- Registrator
- Indexer
- TimeMap

### Comparison

- **Institution-operated stack model:** each institution runs and secures its own DB, API, indexing layer, and uptime strategy.
- **Published-files model (this approach):** institutions publish stable public files, while shared platform services handle registration, ingestion, validation, indexing, and end-user discovery experiences.

This significantly lowers operational burden and technical barrier for collection owners.

## 4. Collection model overview

The basic collection model has three conceptual layers:

1. collection manifest
2. item metadata
3. media files

The format is intentionally simple and storage-agnostic so it can work across:

- GitHub
- S3-compatible storage
- static hosting
- local folders
- cloud drives
- other public storage systems

## 5. Collection manifest

`collection.json` is the single entry point for a collection.

It describes the collection and gives the indexer a clear starting point for reading item records.

Example:

```json
{
  "version": "0.1",
  "id": "castle-collection",
  "title": "Castle Photo Collection",
  "description": "Historic castle images",
  "items": [
    "items/castle-001.json",
    "items/castle-002.json"
  ]
}
```

For very small collections, an inline-item form may also be allowed. However, the core concept remains the same: the manifest is the collection entry point.

## 6. Item metadata model

Each item has:

- a stable ID
- metadata
- one or more media references

The item ID identifies the record itself; it is not merely a file path.

Example:

```json
{
  "id": "castle-001",
  "title": "Castle ruins east wall",
  "description": "Historic photograph",
  "creator": "Local Archive",
  "date": "1900",
  "license": "CC-BY-4.0",
  "location": {
    "lat": 52.1234,
    "lon": 5.1234
  },
  "media": [
    {
      "url": "../media/castle-001.jpg",
      "mimeType": "image/jpeg"
    }
  ],
  "tags": ["castle", "ruins"]
}
```

Rules of thumb:

- item IDs must be stable
- item IDs must not depend only on file names
- media and metadata may be co-located or separate

## 7. Metadata storage patterns

The system should support multiple metadata storage patterns.

### Pattern A — Sidecar metadata next to media

```text
media/
  castle-001.jpg
  castle-001.json
```

This is simple and intuitive, and works well for local folders, GitHub repositories, and smaller collections.

### Pattern B — Separate metadata folder

```text
media/
  castle-001.jpg

items/
  castle-001.json
```

This can be cleaner for larger collections, especially when metadata is updated more often than media files.

### Pattern C — External metadata or external media references

Media and metadata do not have to be co-located. For example:

- metadata in a repository
- media in S3, Wikimedia, Internet Archive, or another storage provider

The indexer should rely on manifest and item references, not on a fixed folder layout.

### Pattern D — Inline items inside `collection.json`

Very small collections may include item data directly inside `collection.json`.

Supporting multiple patterns is a deliberate storage-agnostic design decision.

## 8. Recommended format rules

- `collection.json` is the single collection entry point.
- Item IDs must be stable.
- Item records must contain enough information to resolve their media.
- Media and metadata do not need to be co-located.
- Folder layout is flexible.
- The indexer should follow explicit references, not assume directory structure.
- Relative URLs are allowed.
- Public readable access is required for indexing.

## 9. Optional linked identifiers

The base format should remain simple while allowing linked-data-friendly extensions.

Recommended optional fields include:

- `links`
- `identifiers`

Example using `links`:

```json
{
  "id": "castle-001",
  "title": "Castle ruins east wall",
  "links": {
    "place": "https://www.wikidata.org/entity/Q67890",
    "creator": "https://www.wikidata.org/entity/Q12345"
  }
}
```

Example using `identifiers`:

```json
{
  "id": "castle-001",
  "identifiers": {
    "wikidata": "Q12345",
    "geonames": "2759794",
    "inventory": "INV-1900-12"
  }
}
```

Why this is useful:

- future compatibility with linked open data
- linking to external authority systems
- interoperability without requiring RDF complexity in the base format

These are optional extensions, not required fields.

## 10. IIIF compatibility strategy

Collector should not adopt IIIF as its primary native format.

Instead, the strategy is to keep the Collector format simple while ensuring item records contain enough information to support future export to a minimal IIIF Presentation manifest.

If item records include:

- stable `id`
- title
- description
- media URL
- mime type
- optional thumbnail
- license
- attribution/source

then a later IIIF mapping layer can be implemented.

Key point:

- Collector format remains native and simple.
- IIIF is a future export layer.
- The goal is interoperability without introducing IIIF complexity into the base system.

## 11. Why this is useful in practice

This model provides practical value by enabling:

- simple publishing workflows
- no need for every institution to run a database/API stack
- storage-provider-agnostic deployment
- easy hosting on common platforms
- straightforward indexing by TimeMap services
- future compatibility with linked identifiers and IIIF export
- lower technical barriers for cultural heritage groups

## 12. Suggested terminology

Recommended terms:

- `collection.json` → collection manifest
- item JSON → item record or item metadata record
- media file → media asset
- Collector → authoring/publication tool
- Registrator → registry/catalog service
- Indexer → ingestion/indexing service
