# Collector App

TimeMap Collector is the writable collection-management app.

## Scope

- Connect storage sources
- Select and manage collections per source (scaffolded where provider discovery is limited)
- Edit item metadata
- Publish/export `collection.json`
- Keep registration in-flow via placeholder UI

## Entry

- App host page: `/src/apps/collector/`
- Web component script: `/src/apps/collector/src/index.js`

## Current storage sources

- GitHub repository (primary writable flow)
- Google Drive connected source (read-only import mode currently)
- Planned: S3-compatible storage, WordPress/CMS, and other providers

## Notes

- Built with vanilla JS + Web Components.
- Browser-local source-memory keeps non-secret config only.
- Registration is currently a placeholder dialog.
- OPFS is used for local draft/workspace persistence when available.
- Draft workflow is explicit: `Save locally`, `Restore draft`, `Discard draft`.
- New collections can be created from scratch via `New collection` and start as local drafts.
- Image ingestion supports drag-and-drop and file picker (`jpg`, `jpeg`, `png`, `webp`, `gif`).
- New images are added immediately as local draft items with upload status badges.
- Thumbnails are generated automatically for image assets when possible.
- GitHub publish uploads `media/*`, `thumbs/*.thumb.jpg`, and updates `collection.json`.
- Publishing remains separate from OPFS and uses storage providers.
- Secrets (PATs, OAuth tokens, passwords) are never persisted in OPFS.
