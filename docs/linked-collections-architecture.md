# LinkedCollections Architecture

## Overview

LinkedCollections is designed as a lightweight, decentralized system for publishing and discovering collections of digital assets.

The architecture intentionally follows patterns that made the Web scalable:

- decentralized publishing
- simple entry documents
- URL-addressable resources
- indexing for discovery

Rather than storing collections in centralized databases, collections are represented as **portable directories with a manifest file**.

This makes collections easy to publish, host, index, and reuse.

---

# Relationship to the Web

The architecture mirrors the structure of the Web.

| Web Concept | LinkedCollections Concept |
|-------------|---------------------------|
| Website | Collection |
| index.html | collection.json |
| Web page | Item |
| Images/files | Media assets |
| Hyperlinks | References between collections/items |
| Search engine | Indexer |

Just like a website starts with `index.html`, a collection starts with a **manifest**.

Example:

```
https://example.org/collections/harbor/
collection.json
```

The manifest is the entry point for tools such as:

- browsers
- indexers
- editors
- visual explorers

---

# Collection Manifest

The manifest acts as a **lightweight index** of the collection.

It should contain only information required to:

- identify the collection
- list items
- show thumbnails and basic metadata
- locate detailed metadata and media

Example structure:

```
collection/
collection.json
items/
media/
thumbs/
```

The manifest should remain small so it can load quickly and scale to large collections.

---

# Summary vs Detail

To support very large collections, the system separates:

**Collection index (summary)**  
Stored in `collection.json`

**Item detail**  
Stored in `items/{id}.json`

This allows applications to:

- load collection summaries quickly
- fetch item detail only when needed
- avoid loading large datasets at once

Example:

```
collection.json → item summaries
items/*.json → full metadata
```

This follows a key design rule:

> Summary everywhere, detail on demand.

---

# Addressable Resources

A core design rule is that important objects should have stable URLs.

Examples:

Collection

```
https://example.org/collections/harbor/
```

Item

```
https://example.org/collections/harbor/items/harbor-map
```

Media

```
https://example.org/collections/harbor/media/harbor-map.jpg
```

This enables:

- linking
- embedding
- indexing
- cross-collection references

---

# Collections as Portable Units

Each collection is a **portable directory**.

Example:

```
harbor-collection/
collection.json
items/
media/
thumbs/
```

This directory can be hosted anywhere:

- GitHub
- S3
- Netlify
- static hosting
- institutional servers

The only requirement is that `collection.json` is accessible.

---

# Indexing and Discovery

Collections are designed to be discovered by an **indexer**, similar to how search engines crawl websites.

The indexer workflow:

```
seed collection URLs
↓
fetch collection.json
↓
extract items
↓
extract metadata
↓
build search and exploration indexes
```

This enables global discovery without requiring a centralized database.

---

# Relationship to Linked Data

The architecture shares some principles with Linked Data:

- resources have identifiers (URLs)
- resources can reference each other
- datasets can be connected

However, LinkedCollections intentionally keeps the data model simple and developer-friendly.

Instead of requiring RDF or complex semantic frameworks, it uses:

- JSON manifests
- URLs
- indexing

Optional interoperability with systems like JSON-LD or IIIF can be added later.

---

# Collections as a Graph

Collections can reference:

- items in other collections
- external media
- institutional resources

Example:

```
collection A → references item in collection B
collection C → aggregates items from A and B
```

This creates a distributed **graph of collections**.

---

# Collector Role

The Collector application is the authoring environment for LinkedCollections.

Collector responsibilities include:

- creating collections
- managing items
- ingesting assets
- generating thumbnails
- editing metadata
- publishing collections to storage providers

Collector is designed to work with multiple collection types, including:

- cultural heritage collections
- product collections
- material collections

---

# Key Architectural Principles

1. Collections are portable directories
2. `collection.json` is the entry point
3. resources should be URL-addressable
4. manifests remain lightweight
5. detail metadata is loaded on demand
6. indexing enables discovery
7. collections can reference other collections

These principles allow the ecosystem to remain:

- decentralized
- scalable
- easy to host
- easy to index
- easy to extend

---

## Web Design Principles That Inspired LinkedCollections

LinkedCollections intentionally adopts several architectural ideas that made the Web successful.

Understanding these principles helps guide design decisions across the platform.

---

# 1. Simple Entry Points

On the Web, every website has a predictable entry point:

```
index.html
```

Browsers and crawlers know where to start.

LinkedCollections follows the same idea:

```
collection.json
```

This file is the canonical entry point for a collection.

From this single document a system can discover:

- collection metadata
- items
- media resources
- links to other collections

Keeping the entry point simple allows tools to interact with collections without requiring custom APIs.

---

# 2. Addressable Resources

One of the most important ideas of the Web is that **everything has a URL**.

Examples:

```
https://example.org/
https://example.org/page
https://example.org/image.jpg
```

This makes resources:

- linkable
- shareable
- cacheable
- indexable

LinkedCollections adopts the same principle.

Examples:

Collection

```
https://example.org/collections/harbor/
```

Item

```
https://example.org/collections/harbor/items/harbor-map
```

Media

```
https://example.org/collections/harbor/media/harbor-map.jpg
```

Stable URLs allow collections to interconnect across the web.

---

# 3. Decentralized Publishing

The Web works because anyone can publish a website.

There is no central server controlling all content.

LinkedCollections follows the same model.

Collections can be hosted anywhere:

- GitHub
- S3
- Netlify
- static hosting
- institutional servers

The system only requires that the collection manifest is reachable via HTTP.

---

# 4. Indexing for Discovery

Search engines made the Web usable at large scale.

They do this by:

```
crawl → index → search
```

LinkedCollections follows the same pattern.

An indexer can:

```
discover collection URLs
fetch collection.json
extract items and metadata
build search indexes
```

This allows discovery without requiring a centralized database.

---

# 5. Loose Coupling

The Web succeeds because systems interact through simple protocols.

A website does not need to know who will read it.

Any browser can load any site.

LinkedCollections uses the same idea.

Tools only need to understand:

- HTTP
- JSON
- the collection manifest format

Examples of tools that can consume collections:

- Collector (editor)
- Browser (viewer)
- Indexer (search)
- TimeMap (visual explorer)

Each tool remains independent.

---

# 6. Progressive Enhancement

The Web allows simple content to work everywhere while richer features can be layered on top.

LinkedCollections follows the same pattern.

Basic collections only require:

- collection.json
- item references
- media URLs

More advanced features can be added later:

- thumbnails
- item detail files
- annotations
- IIIF integration
- Linked Data / JSON-LD export

Systems that do not understand these extensions can still read the basic collection.

---

# 7. Linking Instead of Copying

The Web encourages linking resources instead of duplicating them.

LinkedCollections allows collections to reference:

- external media
- items from other collections
- institutional resources

Example:

```
collection A → references item in collection B
collection C → aggregates items from A and B
```

This creates a distributed graph of collections.

---

# 8. Portable Units

Websites are often deployed as portable directories.

LinkedCollections adopts the same model.

```
collection/
collection.json
items/
media/
thumbs/
```

This structure can be moved between hosts without changing its internal structure.

---

# Conclusion

LinkedCollections is designed as a protocol for publishing collections that follows the same architectural principles that made the Web successful:

- simple entry points
- addressable resources
- decentralized publishing
- indexing for discovery
- loose coupling
- progressive enhancement
- linking between resources
- portable content units

By following these principles the ecosystem can scale naturally across institutions and platforms.


---

# Why Collections Are Not Databases

A key design principle of LinkedCollections is that collections are **published documents**, not records inside a centralized database.

This distinction is important for scalability and interoperability.

Traditional systems often work like this:

```
application
↓
database
↓
API
↓
clients
```

In this model:

- data lives inside one system
- access requires a specific API
- other systems depend on the application

This architecture creates tight coupling and limits portability.

---

# The Web Model

The Web works differently.

Instead of storing content in centralized databases, the Web publishes **documents at URLs**.

Example:

```
https://example.org/index.html
```

A browser can fetch this document without knowing anything about the server implementation.

The document is the interface.

Search engines can crawl it, cache it, and index it.

---

# LinkedCollections Uses the Same Model

LinkedCollections treats collections as **published documents**.

Example:

```
https://example.org/collections/harbor/collection.json
```

This manifest is the public interface to the collection.

Applications interact with collections by fetching the manifest and following the links it contains.

This means collections can be:

- hosted anywhere
- mirrored
- cached
- indexed
- reused

without requiring access to a central service.

---

# Advantages of Document-Based Collections

This model provides several benefits.

## Portability

Collections are stored as directories.

Example:

```
collection/
collection.json
items/
media/
thumbs/
```

The directory can be moved between hosts without changing its structure.

---

## Interoperability

Any system that understands the manifest format can read the collection.

Examples:

- Collector (authoring tool)
- Browser (viewer)
- Indexer (search)
- visualization tools

No specific backend service is required.

---

## Resilience

Because collections are static resources:

- they can be cached by CDNs
- they can be mirrored
- they remain usable even if the original application disappears

This mirrors the resilience of the Web itself.

---

# Databases Still Have a Role

Databases can still be used internally by tools such as:

- indexers
- search services
- editing environments

However these systems should treat collections as **external published documents**, not as their primary storage format.

In other words:

```
collection.json is the source of truth
```

not a database table.

---

# Guiding Principle

The system should always prefer:

- publishing documents
- linking resources
- indexing externally

over:

- centralized storage
- tightly coupled APIs
- proprietary data formats

This keeps the ecosystem open, portable, and scalable.


---

End of document.
