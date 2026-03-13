# Storage Model

## Overview

Open Collections is designed to store collections on existing infrastructure instead of requiring a dedicated backend database.

Collections are represented as JSON documents plus media assets stored on common platforms such as Git repositories, object storage, CMS systems, or static web hosting.

This model keeps collections portable, transparent, and easy to host.

## Design Principles

The storage model follows these principles:

- No mandatory backend service
- Use existing storage infrastructure
- Collections remain simple files
- Metadata stored as JSON
- Media stored as standard files
- Hosting can be decentralized

These choices keep collections easier to maintain, migrate, and archive.

## Storage Structure

A typical layout looks like this:

```text
repository or bucket
│
├─ collections.json
│
├─ maps/
│  ├─ collection.json
│  ├─ map1.jpg
│  ├─ map2.jpg
│
├─ photos/
│  ├─ collection.json
│  ├─ photo1.jpg
│  ├─ photo2.jpg
```

Roles:

- `collections.json`: host-level index of available collections
- `collection.json`: manifest for one collection
- collection files: media and other files referenced by that collection, stored beside `collection.json`

Minimal `collections.json` example:

```json
{
  "collections": [
    { "id": "maps", "manifest": "maps/collection.json" },
    { "id": "photos", "manifest": "photos/collection.json" }
  ]
}
```

## Supported Storage Types

The protocol intentionally supports multiple storage backends.

### Git Repositories

Examples:
- GitHub
- GitLab
- self-hosted Git

Benefits:
- version history
- collaboration
- transparency
- static hosting options

Commits provide a natural publishing mechanism.

### Object Storage

Examples:
- S3
- Cloudflare R2
- MinIO
- institutional storage systems

Benefits:
- scalable
- efficient for large media collections
- widely used in institutional environments

### Static Web Hosting

Examples:
- static website hosting
- institutional web servers
- GitHub Pages
- Netlify

Benefits:
- simple hosting model
- accessible over HTTP

### CMS Systems

Examples:
- WordPress
- Drupal
- custom CMS

CMS platforms can expose collection data through structured endpoints.

### Local Filesystem

The Manager may also support local editing workflows.

Example:

```text
/Users/username/collections/
```

Local mode allows preparation and validation before publishing.

## Publishing Model

In many storage setups, saving changes also publishes them.

Examples:
- GitHub commit
- S3 upload
- CMS save

Editing and publishing can therefore be the same action.

Optional preview and staged publish workflows can still be supported, especially for local editing flows.

## Advantages of File-Based Collections

File-based collections provide clear operational benefits:

- portable
- easy backups
- transparent data
- long-term preservation
- simple hosting

Institutions often prefer file-based approaches because data remains accessible even if application layers change.

## Relation to Open Collections Manager

The Manager connects to storage hosts and edits collections directly in those locations.

Typical workflow:

Host  
-> `collections.json`  
-> Collections  
-> Items

The Manager updates JSON manifests and media assets directly in host storage.

## Summary

Collections are files, not database records.

This storage philosophy lets Open Collections work across many hosting environments while keeping collections simple, portable, and durable.
