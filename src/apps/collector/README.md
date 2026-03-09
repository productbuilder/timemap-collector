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
