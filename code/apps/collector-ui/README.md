# Collector UI (Web Component MVP)

TimeMap Collector UI is exposed as a Web Component:

`timemap-collector`

## Embedding

```html
<script type="module" src="/code/apps/collector-ui/src/index.js"></script>
<timemap-collector></timemap-collector>
```

## Features

- Shadow DOM component shell with encapsulated styles
- White SaaS-style header with toolbar actions
- Sources manager dialog with connected sources, refresh/remove actions, and add-source forms
- Storage options guidance dialog in Sources with recommended hosting patterns and provider comparison
- Source roadmap placeholders for planned integrations
- Manifest export controls in a dialog
- Responsive bounded workspace layout (header + split panes)
- Scrollable merged card viewport across multiple sources
- Scrollable metadata sidebar for selected item
- Asset viewer dialog for large preview and details
- Source badges on cards (source label + provider where useful)
- Source filter in the main workspace (`All sources` or one source)
- Grouped metadata sections (Basic, Authorship, Context, Rights, Classification)
- Source list/config remembered locally between reloads (safe fields only)

## Source model in MVP

Enabled providers:
- GitHub (manifest-first import; inline metadata save to repo when PAT has write permission)
- Google Drive:
  - Public shared `collection.json` link mode (read-only)
  - Authenticated manifest-by-file-ID mode via Google OAuth token (read-only scaffold)
- Public URL (read-only)
- Example dataset (local editable)

Planned placeholders:
- S3-compatible storage
- Wikimedia Commons
- Internet Archive

## Notes

- Built as ES modules with no build step.
- Intended for local static hosting from repository root.
- Workspace state is in-memory and can combine assets from multiple sources at once.
- Source and publish concerns are now separate in state (`sources[]` with placeholder `publishDestination` scaffolding).
- Card interaction model: click selects, `View` button (or double-click) opens the asset viewer.
- Secrets are not persisted locally (for example GitHub PAT); remembered GitHub sources may require re-entering token.
- GitHub inline `collection.json` item edits can be saved back to repo when PAT has write permission.
- Google Drive authenticated mode currently loads one manifest file by Drive file ID and does not persist tokens.
- Google Drive first pass public mode supports shared file links (`Anyone with the link` -> `Viewer`).
- Google authenticated mode expects Google Identity Services plus a valid OAuth Client ID configured in the source dialog.
