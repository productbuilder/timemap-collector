# TimeMap Collector — NDE Alignment and Metadata Format Strategy

## 1. Purpose

This document captures practical product and architecture decisions for TimeMap Collector in relation to the NDE direction. Specifically, it defines:

- how Collector aligns with the architectural direction described in *Van data naar dienst - Visie op de ontwikkeling van verbonden erfgoeddiensten*
- how Collector should approach open metadata formats
- what should be recommended for Collector v1 versus later extensions

The aim is to keep implementation pragmatic for participating organizations while preserving compatibility with a broader standards-based ecosystem.

## 2. Summary of the NDE vision

The NDE vision describes a transition from isolated, bespoke heritage platforms to a connected ecosystem of reusable services and open standards.

At a high level, the report emphasizes that:

- data ownership remains at the source organization
- data and presentation should be separated
- open standards are preferred over custom one-off solutions
- service platforms should expose reusable interfaces
- datalaag and presentatielaag should be clearly separated
- standard APIs and reusable presentation components should be encouraged
- linked data is a key enabling approach for interoperability
- Datasetregister, Termennetwerk, IIIF, and NDE-Schema.org are important enabling building blocks
- many current platforms are too bespoke, expensive, and difficult to sustain
- the preferred future is a reusable, standards-based ecosystem with lower integration costs

### High-level 10-step service platform model

The report’s service platform model can be summarized as:

1. source intake
2. metadata selection
3. normalization
4. transformation to a harmonized model
5. enrichment
6. knowledge graph
7. search index
8. expose data layer
9. retrieve metadata for presentation
10. present to users

The core logic is that source data is processed into reusable data services first, and then used by multiple presentation contexts.

## 3. How Collector relates to the NDE model

TimeMap Collector fits primarily at the publication and lightweight datalaag boundary.

Collector is **not** a storytelling or presentation environment. TimeMap Manager is responsible for indexing, stories, timelines, user-facing services, and presentation experiences.

Collector’s role is to help organizations publish media and metadata from their own storage in a reusable machine-readable way. In NDE terms, Collector acts as a practical publication layer that helps institutions participate in a distributed service ecosystem without requiring full linked-data infrastructure from day one.

| Layer / actor | Role in flow |
|---|---|
| Heritage organizations / source systems | Maintain source files and local metadata ownership |
| Collector | Publishes normalized collection manifest and item metadata |
| Published collection manifest + item metadata | Reusable machine-readable publication contract |
| TimeMap ingestion / indexing | Harvests and indexes published metadata |
| TimeMap services and experiences | Creates timelines, stories, interfaces, and user-facing applications |

Collector operationalizes NDE principles by:

- keeping ownership near the source
- separating publication from presentation
- supporting reusable machine-readable collection outputs
- reducing bespoke ingestion work
- lowering participation barriers for smaller organizations

## 4. Key points of alignment with NDE

### Decentralized ownership

Collector supports decentralized ownership by allowing institutions to publish from storage they already control, instead of transferring custody to a centralized platform.

### Separation of data and presentation

Collector publishes metadata and media references; it does not prescribe or implement storytelling interfaces. This keeps datalaag and presentatielaag separated.

### Reusable interfaces

By standardizing a collection manifest and item structure, Collector provides a reusable interface for ingestion and downstream use.

### Lightweight publication for smaller organizations

Collector lowers technical complexity compared with full linked-data pipelines and helps smaller institutions join a shared ecosystem.

### Support for persistent URLs

Collector should encourage stable public URLs for manifests, items, and media so references remain durable over time.

### Compatibility with richer standards later

Collector can remain simple in v1 while designing field semantics that can map to richer linked-data models later.

### Open/public machine-readable publication

Collector is aligned with open publication goals by producing public, machine-readable outputs that can be harvested and reused.

### Where Collector is intentionally simpler in v1

Collector v1 intentionally does **not** require:

- RDF-first publication
- SPARQL endpoints
- IIIF as a mandatory baseline
- a triplestore
- prior NDE-compatible linked-data maturity at every institution

This is a deliberate scope choice to maximize practical adoption.

## 5. Recommended place of Collector in the architecture

Collector should be positioned as:

- a public web component
- a metadata and publication layer
- storage-provider agnostic
- a layer between source storage and TimeMap ingestion

Collector should standardize the **publication contract**, not the storage provider.

That means Collector outputs should work regardless of whether source data is hosted on:

- GitHub public repositories
- S3-compatible buckets
- static hosting platforms
- institutional web servers
- other public HTTPS-readable storage environments

## 6. Metadata format landscape

### JSON-LD

JSON-LD is a W3C standard and the most practical universal JSON-based format for linked open data compatibility. It aligns well with long-term interoperability goals and works naturally with Schema.org vocabularies. However, it is often harder for beginners due to concepts such as `@context`, `@type`, and graph-oriented modeling.

### Schema.org

Schema.org is a widely adopted vocabulary with strong discovery and interoperability value. For Collector, it is a strong semantic basis for core field meanings, and is commonly expressed via JSON-LD.

### Dublin Core

Dublin Core remains a simple, familiar conceptual basis for minimal descriptive metadata. It is useful for baseline field design, though less expressive for richer relationship modeling.

### IIIF

IIIF is highly relevant in cultural heritage, especially for advanced image delivery and annotation use cases. It is powerful but more complex, so it should be treated as an extension track rather than a base requirement for Collector v1.

### DCAT

DCAT is primarily useful for dataset cataloging and discovery. For Collector, it is more relevant at collection/dataset description level than for per-item media metadata.

In summary: JSON-LD is the closest practical universal format for linked open metadata, but raw JSON-LD is often too complex as a mandatory starting point for non-technical contributors.

## 7. Recommended metadata strategy for Collector v1

Recommended strategy:

**Use a simple JSON core model, designed to be JSON-LD compatible later.**

Design principles:

- keep the core format very simple
- use familiar field names
- align semantics with Dublin Core and Schema.org concepts
- allow optional JSON-LD fields and profiles later
- support both relative and absolute URLs
- support per-item files and inline items

Collector v1 should **not** require:

- RDF
- SPARQL
- IIIF
- JSON-LD
- controlled vocabularies

But the model should remain extensible and mappable to those approaches in future versions.

## 8. Recommended minimal metadata fields

Suggested minimal item fields:

- `id` (required)
- `title` (required)
- `description` (recommended)
- `media` (required)
- `rights` / `license` (recommended)
- `creator` (recommended)
- `date` or `period` (recommended)
- `location` (recommended)
- `source` attribution (recommended)
- `tags` (optional but useful)

Guidance:

- IDs must be stable over time
- IDs must not depend only on filenames
- media entries should include resolvable URLs and MIME types where possible

## 9. Example formats

### 9.1 Simple Collector item JSON

```json
{
  "id": "castle-001",
  "title": "Castle ruins",
  "description": "Photograph of the eastern remains",
  "creator": "Local Heritage Group",
  "date": "1900",
  "location": {
    "lat": 52.1234,
    "lon": 5.1234
  },
  "media": [
    {
      "url": "https://example.org/media/castle-001.jpg",
      "mimeType": "image/jpeg"
    }
  ],
  "license": "CC-BY-4.0",
  "source": "Local archive"
}
```

### 9.2 JSON-LD compatible version

```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "@id": "https://example.org/items/castle-001",
  "identifier": "castle-001",
  "name": "Castle ruins",
  "description": "Photograph of the eastern remains",
  "creator": {
    "@type": "Organization",
    "name": "Local Heritage Group"
  },
  "dateCreated": "1900",
  "contentUrl": "https://example.org/media/castle-001.jpg",
  "encodingFormat": "image/jpeg",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "spatialCoverage": {
    "@type": "Place",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 52.1234,
      "longitude": 5.1234
    }
  },
  "isBasedOn": "Local archive"
}
```

### 9.3 Collection manifest example

```json
{
  "version": "0.1",
  "id": "local-heritage-castles",
  "title": "Local Heritage Castles Collection",
  "description": "A small public collection of castle-related heritage images",
  "license": "CC-BY-4.0",
  "items": [
    {
      "id": "castle-001",
      "title": "Castle ruins",
      "media": [
        {
          "url": "https://example.org/media/castle-001.jpg",
          "mimeType": "image/jpeg"
        }
      ]
    },
    {
      "id": "castle-002",
      "title": "Castle gate",
      "media": [
        {
          "url": "https://example.org/media/castle-002.jpg",
          "mimeType": "image/jpeg"
        }
      ]
    }
  ]
}
```

The `collection.json` manifest is the single entry point for TimeMap ingestion.

## 10. Recommended direction

Practical recommendation for Collector roadmap:

- use a simple JSON-based publication format for Collector v1
- keep the solution storage-agnostic
- optimize for ease of use by non-technical heritage groups
- design core fields for later JSON-LD / Schema.org compatibility
- treat IIIF and richer linked-data capabilities as optional extensions
- position Collector as a practical bridge between smaller institutions and the broader NDE ecosystem

## 11. Suggested follow-up documents

- `projects/collector-spec-v0.1.md`
- `projects/collector-json-schema-v0.1.md`
- `projects/collector-nde-mapping.md`
