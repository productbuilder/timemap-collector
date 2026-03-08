# TimeMap Collector — Requirements and Delivery Plan

## 1. Purpose

TimeMap Collector is a public web component that helps cultural heritage organizations publish media and lightweight metadata from their own storage in a way that is:

- public
- stable
- readable by machines
- simple for non-technical users
- storage-provider agnostic

Collector is not the final storytelling or presentation layer. Its purpose is to help organizations connect storage, describe media, publish collection metadata, and expose a standard collection entry point that TimeMap Manager can ingest.

TimeMap Manager remains responsible for:

- indexing
- collection ingestion
- search
- story creation
- timelines
- presentations
- thematic views

Collector focuses on the publication layer.

## 2. Product vision

Collector should provide an open and easy system to manage content across many storage providers, without forcing users into one hosting model.

The main principle is:

**standardize the publication format, not the storage provider**

This means a collection can be published from:

- GitHub public repositories
- S3-compatible buckets
- static web hosting
- institutional web servers
- object storage
- other public file-based storage systems

As long as the target can expose public URLs over HTTPS, Collector should be able to work with it.

## 3. Core problem to solve

Cultural heritage organizations often have:

- media spread across different storage systems
- little technical capacity
- inconsistent metadata
- no simple linked/open publication workflow
- no easy way to expose persistent machine-readable collections

Collector should solve this by giving them:

- a simple way to connect storage
- a simple metadata form per asset
- a collection-level publication manifest
- stable item identifiers
- validation before publication
- one URL that TimeMap can read

## 4. Goals

### 4.1 Primary goals

- Enable non-technical users to publish collections from existing storage.
- Support multiple public storage providers through adapters.
- Publish a simple open collection format that TimeMap can ingest.
- Store lightweight metadata per item.
- Allow a collection-level index / manifest.
- Keep the system public, portable, and storage-provider agnostic.

### 4.2 Secondary goals

- Encourage persistent URLs and open licenses.
- Make metadata entry easy enough for small organizations.
- Allow later extension toward linked open data and IIIF, without requiring them in v1.
- Support migration between providers with minimal metadata rewriting.

### 4.3 Non-goals for v1

- Full DAM replacement
- Full LOD authoring environment
- RDF/SPARQL-first workflows
- Deep museum cataloging standard support
- Story building or final presentation authoring
- Complex workflow approval systems

## 5. Users

### 5.1 Primary users

- local heritage organizations
- museums
- archives
- historical societies
- project teams with public media collections

### 5.2 Secondary users

- TimeMap admins
- TimeMap collection managers
- developers integrating new storage providers

## 6. Core use cases

### 6.1 Create a collection from public storage

A user connects a storage target, selects media, adds metadata, publishes a collection, and shares the collection manifest URL with TimeMap.

### 6.2 Manage metadata without moving media

A user keeps media in their existing storage provider and only manages metadata in Collector.

### 6.3 Publish a collection manifest

Collector generates a collection entry point that lists items or references per-item metadata records.

### 6.4 Update metadata later

A user edits metadata for an existing item without needing to re-upload the media.

### 6.5 Migrate between providers

A collection can be moved from GitHub to a bucket or another host while keeping the same conceptual data structure.

### 6.6 TimeMap ingestion

TimeMap reads the collection manifest, fetches item metadata, and indexes the results for story creation, timelines, and presentation workflows.

## 7. Product principles

1. **Storage agnostic**
   Collector must not depend on one provider.

2. **Public by design**
   Published collections must be readable by URL.

3. **Simple by default**
   Metadata should be lightweight and form-based.

4. **Portable**
   A collection should be movable between providers.

5. **Stable**
   Item identifiers should not depend on filenames alone.

6. **Extensible**
   The base format should allow future extensions.

7. **TimeMap-first ingestion**
   The published format should optimize for reliable TimeMap import.

## 8. Functional requirements

### 8.1 Storage provider support

Collector must support a provider adapter model.

Each adapter should declare which capabilities it supports.

#### Adapter capability levels

**Level 1: Read-only source**
- Accept public asset URLs or discover public assets.
- Read asset metadata where available.
- No write support required.

**Level 2: Metadata publisher**
- Publish metadata and collection manifest to the target.
- Reference media already stored on the target.

**Level 3: Managed storage**
- Upload media, metadata, and collection manifest.
- Maintain a fully managed collection on the target.

#### Required v1 adapter coverage

Collector v1 should support at least:

- Generic public URL mode
- GitHub public repository mode
- S3-compatible storage mode

#### Candidate later adapters

- Cloudflare R2
- Backblaze B2
- generic static website hosting
- plain web folder / institutional hosting
- Internet Archive
- Wikimedia-related workflows
- WebDAV-like targets

### 8.2 Collection model

Collector must support a canonical internal model with at least:

- Collection
- Item
- Asset
- Rights
- Spatial info
- Temporal info
- Source / attribution

Collector must map provider-specific details into this canonical model.

### 8.3 Publication model

Collector must publish a storage-agnostic collection format.

#### Required publication components

- one collection manifest
- one or more item metadata records
- one or more public media URLs

#### Required access model

All published resources must be readable through direct public HTTPS URLs.

#### Directory listing

Collector must not depend on directory listing support from the storage provider.

The collection manifest is the official entry point.

### 8.4 Collection manifest

Each collection must have one manifest, for example:

- `collection.json`

#### Collection manifest requirements

The manifest must include:

- version
- collection id
- title
- description
- license
- item references or inline items

#### Recommended manifest fields

- rights summary
- publisher
- updated timestamp
- language
- source storage information
- validation status
- thumbnail / preview image

#### Manifest behavior

- must be fetchable by one public URL
- must be valid JSON
- must be stable enough for repeated TimeMap ingestion
- should support relative URLs where possible

### 8.5 Item metadata

Collector must support metadata per item.

#### Required item fields

- id
- title
- media
- rights.license

#### Recommended item fields

- description
- creator
- source attribution
- created date or period
- spatial location
- tags
- language
- thumbnail
- original source URL
- mime type

#### Media requirements

Each item must support one or more media entries containing at least:

- url

Optional:
- mimeType
- thumbnail
- width
- height
- duration

### 8.6 Stable identifiers

Collector must generate and maintain stable item identifiers.

#### Requirements

- IDs must not be based only on filenames.
- IDs must remain stable even if asset filenames change.
- IDs must be unique within a collection.
- Prefer slugged or generated IDs suitable for long-term referencing.

Example pattern:

- `org-collection-000001`
- `heritage-castles-000123`

### 8.7 Metadata editing UX

Collector must provide a simple non-technical metadata workflow.

#### Required UX capabilities

- add title
- add description
- add date / period
- add location
- add rights / license
- add attribution
- save changes
- publish or update collection

#### Desired UX capabilities

- bulk edit selected items
- duplicate metadata from similar items
- preview item cards
- validation hints
- missing metadata warnings

#### UX constraint

Users should not need to understand JSON, manifests, or linked data concepts in order to publish a valid collection.

### 8.8 Validation

Collector must validate collections before publication or export.

#### Required validation checks

- collection manifest exists
- manifest JSON is valid
- item IDs are unique
- item references resolve
- media URLs resolve
- required metadata fields exist
- license field exists
- provider target is publicly readable
- paths / URLs are not broken

#### Recommended validation checks

- mime type consistency
- duplicate media detection
- broken thumbnail URLs
- malformed dates
- missing geospatial coordinates when location is expected
- excessively large assets
- embed restrictions where relevant
- CORS checks where needed for browser-based retrieval

### 8.9 Import/export

Collector should support import and export flows.

#### Required v1

- import public asset URLs
- export a collection manifest and item metadata
- give the user one canonical manifest URL for TimeMap ingestion

#### Recommended later

- full collection export package
- provider migration export
- schema version upgrade tools

### 8.10 TimeMap integration

Collector must support a clean handoff into TimeMap.

#### Required integration behavior

TimeMap should only need:
- the collection manifest URL
- the published collection format
- public access to metadata and media

#### Collector must therefore provide

- a stable manifest URL
- predictable item records
- enough metadata for TimeMap indexing
- item-level source references

## 9. Non-functional requirements

### 9.1 Performance

- Collection manifest fetch should be lightweight.
- Item metadata should be chunkable / individually retrievable.
- Large collections should not require one giant JSON file in all cases.

### 9.2 Scalability

- Must support small collections with inline items.
- Must also support larger collections with per-item files.
- Architecture should allow background indexing by TimeMap later, even if Collector itself stays lightweight.

### 9.3 Reliability

- Publication format must be deterministic.
- Re-ingestion by TimeMap should produce consistent results.
- Updates should not silently break IDs or references.

### 9.4 Security

- Public collections must expose only intended metadata and asset URLs.
- Credentials for storage providers must be handled securely.
- Write access should be limited to authorized users.
- Public mode must not expose private storage accidentally.

### 9.5 Portability

- The same collection should be able to move between providers with minimal changes.
- Relative URL support should be used when appropriate.

### 9.6 Accessibility

- The UI should be usable by non-technical users.
- Forms should be clear and minimal.
- Validation messages should be understandable.

## 10. Data format requirements

### 10.1 Core format philosophy

The format should be:

- JSON-based
- simple to understand
- easy to host anywhere
- easy for TimeMap to ingest
- extensible later

### 10.2 Supported publication modes

#### Mode A: Per-item files

Best for medium and large collections.

Example:
- `collection.json`
- `items/item-001.json`
- `items/item-002.json`

#### Mode B: Inline items

Best for small collections and simple setups.

Example:
- `collection.json` containing all items inline

Collector should support both.

### 10.3 Base spec requirements

Do not require in v1:

- RDF
- SPARQL
- IIIF
- JSON-LD
- controlled vocabularies
- provider-specific APIs
- directory listing

These may be extensions later.

## 11. Suggested minimal schema

### 11.1 Collection manifest example

```json
{
  "version": "0.1",
  "id": "https://example.org/collections/castles/collection.json",
  "title": "Regional Castle Collection",
  "description": "Historical media and metadata for castles in the region",
  "license": "CC-BY-4.0",
  "items": [
    "https://example.org/collections/castles/items/castle-001.json",
    "https://example.org/collections/castles/items/castle-002.json"
  ]
}
```

### 11.2 Item metadata example

```json
{
  "id": "castle-001",
  "title": "Castle ruins, east wall",
  "description": "Photograph of the eastern remains",
  "media": [
    {
      "url": "https://example.org/collections/castles/media/castle-001.jpg",
      "mimeType": "image/jpeg"
    }
  ],
  "rights": {
    "license": "CC-BY-4.0",
    "attribution": "Local Heritage Group"
  },
  "spatial": {
    "name": "Old Castle Hill",
    "lat": 52.1234,
    "lon": 5.1234
  },
  "temporal": {
    "label": "circa 1900"
  }
}
```

## 12. Recommended architecture

### 12.1 Logical architecture

Storage target → Collector adapter → Collector canonical model → published manifest + item metadata → TimeMap ingest

### 12.2 Components

#### A. Adapter layer

Responsible for:

- connecting to provider
- reading assets
- optionally writing metadata / manifests
- validating public access

#### B. Canonical model layer

Responsible for:

- normalizing collection, item, asset, and rights data

#### C. Metadata editor UI

Responsible for:

- item forms
- collection settings
- validation feedback
- publish actions

#### D. Publisher

Responsible for:

- generating collection manifest
- generating item records
- managing relative and absolute URLs
- export / write flows

#### E. Validator

Responsible for:

- field validation
- URL checks
- publication readiness checks

#### F. TimeMap handoff

Responsible for:

- exposing one manifest URL
- supporting import in TimeMap Manager

## 13. Delivery plan

### Phase 0 — Product definition

Goals:

- define the v0.1 publication spec
- define adapter capability model
- define minimal metadata schema
- define TimeMap import contract

Deliverables:

- requirements document
- collection spec draft
- sample JSON examples
- provider capability matrix
- import contract for TimeMap Manager

### Phase 1 — Proof of concept

Goals:

- test the model end to end
- prove TimeMap can ingest collections reliably

Scope:

- one collection manifest
- per-item metadata
- one simple metadata form
- GitHub or generic public URL support
- manual publication flow

Deliverables:

- basic collector UI
- example public collection
- TimeMap import test
- validation checklist

Success criteria:

- a sample collection can be published
- TimeMap can ingest it from one URL
- media and metadata resolve publicly
- non-technical users can understand the workflow

### Phase 2 — v1 MVP

Goals:

- make Collector usable by real organizations

Scope:

- adapter framework
- generic public URL mode
- GitHub mode
- S3-compatible mode
- collection manifest publishing
- per-item metadata editing
- validation UI
- stable item IDs
- TimeMap import handoff

Deliverables:

- deployable Collector web component
- v1 collection schema
- first three adapters
- validation and error reporting
- manifest URL copy/share flow

Success criteria:

- users can connect storage
- users can describe assets
- users can publish a manifest
- TimeMap can import collections consistently

### Phase 3 — usability and scale

Goals:

- reduce manual work
- improve large collection handling

Scope:

- bulk metadata editing
- batch import
- better previews
- inline vs per-item publication choice
- collection update workflows
- improved validation

Deliverables:

- bulk edit flows
- collection dashboard
- collection health checks
- update and republish workflow

### Phase 4 — open ecosystem and extensions

Goals:

- make Collector an open publication ecosystem

Scope:

- public spec publication
- extension model
- optional IIIF compatibility
- optional linked-data fields
- provider export packs
- migration tools

Deliverables:

- public format documentation
- extension registry or guide
- interoperability examples
- migration guidance

## 14. Prioritization

### Must have for v1

- storage-agnostic publication model
- collection manifest
- lightweight item metadata
- stable IDs
- generic public URL support
- GitHub support
- S3-compatible support
- validation
- one manifest URL for TimeMap import

### Should have for v1.x

- bulk editing
- inline item mode
- previews and thumbnails
- export package
- provider capability display

### Could have later

- IIIF extension
- JSON-LD extension
- multilingual metadata enhancements
- rights vocab helpers
- authority linking

## 15. Risks and mitigations

### Risk: provider differences are too large

Mitigation:

- use adapter capability levels
- avoid provider-specific publication assumptions

### Risk: public URLs are not truly stable

Mitigation:

- validate targets
- recommend persistence guidance
- separate item IDs from filenames

### Risk: non-technical users find metadata too complex

Mitigation:

- keep required fields minimal
- use guided forms
- add validation hints and templates

### Risk: collections become inconsistent over time

Mitigation:

- enforce manifest validation
- lock ID stability
- provide republish checks

### Risk: browser access constraints block reading

Mitigation:

- validate public fetch behavior
- warn about CORS / embedding limitations
- allow server-side retrieval in TimeMap where appropriate

## 16. Open questions

- Should Collector metadata live in the user’s storage from day one, or may Collector host metadata initially?
- Should v1 support both per-item files and inline items immediately, or start with one mode?
- Does TimeMap ingestion prefer absolute URLs only, or should relative URL resolution be supported from the start?
- Should Collector manage thumbnails, or only reference them?
- How much provider-specific write support is required in v1?

## 17. Recommended v1 product position

**Collector is an open publication layer for cultural heritage media. It connects to public storage, lets non-technical users add lightweight metadata, and publishes a standard collection manifest that TimeMap can ingest.**

## 18. Recommended repository output

Suggested path in the `productbuilder/timemap-collector` repo:

- `projects/collector-requirements-and-plan.md`

Optional later companion docs:

- `projects/collector-spec-v0.1.md`
- `projects/collector-adapter-model.md`
- `projects/collector-metadata-schema.md`
