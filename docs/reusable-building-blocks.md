# Reusable Building Blocks

## Overview

A core idea behind LinkedCollections is that collections are not just pages and not just metadata records.

They are made of reusable building blocks.

These building blocks can be combined into different presentations, views, and collections.

This is one of the main ways LinkedCollections differs from the traditional Web.

---

# The Web Mostly Links Documents

The traditional Web mainly connects documents through hyperlinks.

Example:

page A → link → page B

When a user follows the link, they navigate from one document to another.

This model is powerful, but it is mostly about:

- navigation
- documents
- pages
- separate domains and websites

The Web is therefore best understood as a network of linked documents.

---

# RDF and Linked Data Tried to Make Meaning Explicit

RDF and Linked Data introduced a different goal.

Their purpose was to make relationships between things explicit.

Example:

HarborMap → creator → JohnSmith
HarborMap → location → Rotterdam

This makes data machine-readable and semantically explicit.

That approach is useful for:

- knowledge graphs
- semantic interoperability
- formal data linking

However, LinkedCollections has a different practical focus.

---

# LinkedCollections Focuses on Reusable Building Blocks

The main goal of LinkedCollections is not to build a full semantic web stack.

The main goal is to make collection objects reusable.

Examples of reusable objects include:

- items
- media assets
- product records
- material records
- map objects
- institutional collection objects

These objects can be reused across multiple collections and presentations.

Example:

Collection A
→ references item X

Collection B
→ also references item X

A map view, timeline view, browser view, or product catalog can all use the same underlying item.

---

# Reuse Instead of Only Navigation

This is the key difference.

Traditional hyperlinks mainly move a user from one document to another.

LinkedCollections should allow structured resources to be:

- referenced
- embedded
- recombined
- presented in new contexts

The same underlying object can appear in:

- a grid
- a map
- a timeline
- a thematic collection
- a product family overview
- a materials library

The data is reused while the presentation changes.

---

# Collections as Compositions

In LinkedCollections, a collection should be understood as a composition of reusable objects.

A collection is not only a container of copied records.

It can also be a curated set of references.

Example:

Collection A → object from institution A
Collection A → object from institution B
Collection A → object from institution C

This allows new collections to be created from existing published data.

---

# Building Blocks Instead of Semantic Triples

A useful way to understand the difference is:

- the Web links documents
- RDF links semantic facts
- LinkedCollections links reusable objects

The purpose is not to model the entire world in a formal ontology.

The purpose is to publish practical building blocks that applications can reuse.

This makes the system simpler and more usable for real-world tooling.

---

# Why This Matters

This concept enables:

- multiple presentations of the same data
- aggregation across institutions
- thematic collections
- product and material collections
- map and timeline interfaces
- lightweight interoperability

It also keeps the architecture aligned with web principles:

- URL-addressable resources
- portable published documents
- indexing for discovery
- recomposition of linked resources

---

# Guiding Principle

A good guiding principle for LinkedCollections is:

Collections should contain or reference reusable objects, not just link to separate pages.

Another way to say this:

LinkedCollections is a reusable web of collection objects.

---

# Conclusion

LinkedCollections builds on ideas from the Web and Linked Data, but its practical focus is different.

It is designed to make structured collection objects reusable across different applications and views.

This allows the same underlying data to support many forms of presentation without being tied to one interface or one platform.

---

End of document.
