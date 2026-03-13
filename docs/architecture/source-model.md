# Source Model and Entry Points

## Overview

The Open Collections ecosystem uses structured JSON documents stored on a host.

Typical hierarchy:

Host  
-> Source  
-> Collections  
-> Items

The Manager can start from different entry points, depending on which source URL or path is provided.

## Core Concepts

### Host

A **Host** is the storage location where collections live.

Examples:
- GitHub repository
- S3 bucket
- CMS
- static web host
- local folder

A host provides access to JSON files such as:

`collections.json`  
`collection.json`

A host is not a dataset itself. It is the place where datasets and manifests are stored.

For local-folder hosts, use one host root with a small index plus one folder per collection:

```text
host-root/
├─ collections.json
├─ maps/
│  ├─ collection.json
│  ├─ map1.jpg
│  └─ map2.jpg
└─ photos/
   ├─ collection.json
   ├─ photo1.jpg
   └─ photo2.jpg
```

Example hosts:

`https://github.com/productbuilder/opencollections-data`

or

`s3://museum-archive`

### Source

A **Source** is the entry point the Manager uses to load collections.

A source can point to either:

`collections.json`  
or  
`collection.json`

The Manager loads a source first, then navigates from there.

Examples:

`https://example.org/collections.json`

or

`https://example.org/maps/collection.json`

### collections.json

`collections.json` is an index of multiple collections.

Its purpose is to list available collections and point to their manifests.

Example structure:

```json
{
  "collections": [
    {
      "id": "maps",
      "manifest": "maps/collection.json"
    },
    {
      "id": "photos",
      "manifest": "photos/collection.json"
    }
  ]
}
```

When the Manager loads `collections.json`, it should show a list of collections.

Flow:

`collections.json`  
-> Collections view  
-> Select collection  
-> Load `collection.json`

### collection.json

`collection.json` is the manifest for a single collection.

It contains:
- collection metadata
- item list
- item metadata
- file paths that are relative to the collection folder (for example `"url": "map1.jpg"`)

Example structure:

```json
{
  "id": "maps",
  "title": "Historic Maps",
  "items": []
}
```

When the Manager loads `collection.json` directly, it should skip the collections list and open the items view.

Flow:

`collection.json`  
-> Items view

This makes `collection.json` a single-collection entry point.

### Collections

A **Collection** is a logical grouping of items.

Examples:
- Historic Maps
- City Photos
- Archive Letters

Collections contain items plus metadata describing the collection.

### Items

**Items** are the individual resources inside a collection.

Examples:
- image
- document
- video
- dataset

Each item can include metadata fields such as:
- title
- description
- creator
- license
- tags

## Manager Entry Modes

The Manager supports multiple entry modes based on the source.

### Mode 1 - Multi-collection source

Source = `collections.json`

Flow:

Source  
-> Collections list  
-> Collection selected  
-> Items

### Mode 2 - Single collection source

Source = `collection.json`

Flow:

Source  
-> Items view

No collections list is shown.

## Simplified Mental Model

A simple way to think about the system:

Source  
-> Collection(s)  
-> Items

The source may point to either `collections.json` or `collection.json`.

## Why This Model Exists

This model provides flexibility:
- supports repositories with many collections
- supports standalone collections
- works with GitHub, S3, CMS, and static hosting
- allows integration into different systems

Collections act as containers that group digital items and metadata, which is a common pattern in digital collection systems.

## Summary

Architecture summary:

Host  
-> Source  
-> `collections.json` (optional)  
-> `collection.json`  
-> Items

This flexible structure allows Open Collections tools to work with both large repositories and individual standalone collections.
