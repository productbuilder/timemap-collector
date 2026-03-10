# Collections of Collections

## Overview

In LinkedCollections, a collection is not only a container of items.

A collection is itself a reusable object that can be referenced by other collections.

This means that collections can form hierarchical or graph structures.

Example:

Collection A  
→ item 1  
→ item 2  
→ collection B

This allows the system to support **collections of collections**.

---

# Collections as First-Class Objects

In many systems, collections are only containers.

LinkedCollections treats collections as **first-class objects**.

This means:

- collections have identifiers
- collections have URLs
- collections can be referenced by other collections
- collections can be aggregated

Example:

European Maps Collection  
→ Rotterdam Maps Collection  
→ Amsterdam Maps Collection  
→ Paris Maps Collection

Each subcollection remains independently hosted.

---

# Example Manifest

A collection referencing other collections may look like this:

```json
{
  "id": "european-maps",
  "title": "European Maps",
  "items": [
    {
      "id": "rotterdam-maps",
      "type": "collection",
      "url": "https://museum-a.org/collections/rotterdam/"
    },
    {
      "id": "amsterdam-maps",
      "type": "collection",
      "url": "https://museum-b.org/collections/amsterdam/"
    }
  ]
}
```

Applications can fetch these referenced collections and combine them into a single view.

---

# Federation

Collections of collections enable federation across institutions.

Example:

Global Map Collection
→ Museum A collection
→ Museum B collection
→ Library collection

Each institution publishes its own collections.

A higher-level collection aggregates them without copying the data.

---

# Recursive Structure

Because collections can reference other collections, the structure becomes recursive.

Conceptually:

collection
→ items
→ assets

But also:

collection
→ items
→ collection

This creates a flexible hierarchy or graph of collections.

---

# Relationship to the Web

The Web works in a similar way.

Websites contain pages, and pages link to other websites.

Example:

website
→ pages
→ links to other websites

LinkedCollections mirrors this pattern:

collection
→ items
→ links to other collections

This allows the ecosystem to grow organically.

---

# Practical Applications

Collections of collections enable several important use cases.

Aggregated cultural collections
Example: World War II Maps combining collections from multiple archives.

Product catalogs
Example: Furniture catalog containing sofa collections, chair collections, and table collections.

Material libraries
Example: Materials collection containing wood, metal, and fabric collections.

Thematic collections
Example: Curated selections across institutions.

---

# Design Principle

A useful design principle for LinkedCollections is:

A collection is a reusable object and may itself be referenced as an item.

This principle allows collections to act as building blocks for larger collections.

---

# Implementation Guidance

To support this concept, item summaries may include:

type: "collection"

and a reference to the collection URL.

Example:

```
{
  "type": "collection",
  "url": "https://example.org/collections/rotterdam/"
}
```

Applications should treat these references as nested collections that can be fetched and explored.

---

# Conclusion

By allowing collections to reference other collections, LinkedCollections becomes a composable system.

Collections become building blocks that can be aggregated, reused, and recombined across the web.

This enables distributed collaboration while keeping collections independently hosted.
