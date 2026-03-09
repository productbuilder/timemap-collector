# timemap-collector

TimeMap Collector is shipped as a reusable Web Component:

`timemap-collector`

It uses Shadow DOM and provides a SaaS-style shell for source management, merged asset browsing, metadata editing, and manifest export.

## Quick links

- Landing page: `./index.html`
- Demo page: `./demo/`
- Docs page: `./docs/`
- Collector app entry: `./code/apps/collector-ui/`
- Example dataset: `./examples/test-collection/`

## Web Component usage

```html
<script type="module" src="/code/apps/collector-ui/src/index.js"></script>
<timemap-collector></timemap-collector>
```

## MVP currently does

- Sources manager dialog with a multi-source roadmap UI
- In-app storage guidance available from Sources (`Storage options`) with provider comparison
- Working providers:
  - GitHub (authenticated via Personal Access Token, read + import + manifest export)
  - Google Drive (public shared `collection.json` file link, read-only)
  - Public URL manifest (working, read-only)
  - Example dataset (working, local)
- Planned placeholders (disabled in UI):
  - S3-compatible storage
  - Wikimedia Commons
  - Internet Archive
- Browse assets as cards with thumbnail, metadata completeness, license, and include/exclude state
- Merge assets from multiple connected read sources into one workspace grid
- Show source badges on cards and filter the grid by source
- Edit metadata for selected assets in a scrollable sidebar
- Group metadata fields into readable editor sections
- Open assets in a viewer dialog for larger preview and details
- Generate, preview, copy, and download `collection.json`
- Remember non-secret source configuration locally for faster workspace restore

## Source and destination direction

- Read sources can be added multiple times per workspace/session.
- Publishing remains explicit and separate; this pass includes lightweight `publishDestination` state scaffolding in the app model.
- Local source memory excludes secrets (tokens/passwords are not persisted).

## GitHub provider (this MVP pass)

Implemented:
- Token-based authentication (`repo` scope PAT recommended)
- Repository configuration: owner, repo, branch, folder/path
- Manifest-first loading: checks `<configured-path>/collection.json` and imports inline `items` when present
- Recursive media discovery from the configured path (image/video files)
- Load GitHub assets into the existing Collector card grid
- Save inline `collection.json` item metadata back to GitHub when PAT has repo write permission
- Continue using metadata editing and manifest export on loaded assets

Not yet implemented:
- Browser OAuth/GitHub App flow

## Google Drive provider (first pass)

Implemented:
- Public shared file link import for `collection.json` manifests
- Accepts common Drive file URL variants (for example `/file/d/<FILE_ID>/view` and `uc?export=download&id=<FILE_ID>`)
- Normalizes links to direct download URL format (`https://drive.google.com/uc?export=download&id=<FILE_ID>`)
- Loads inline manifest `items` into the existing merged workspace grid
- Read-only source behavior (`Read` capability only)
- Authenticated source scaffold with Google Identity Services token flow (`Connect Google Drive`)
- Authenticated Drive API read path for manifest by file ID (`drive/v3/files/<FILE_ID>?alt=media`)
- Session-only token handling (token is not persisted by source-memory storage)
- Requires a valid Google OAuth Client ID in the source configuration

Required sharing mode:
- `Anyone with the link` -> `Viewer`

Not yet implemented:
- Full production OAuth hardening (backend token broker/refresh strategy)
- Folder browsing / picker UX
- Write-back / publishing to Drive

## Run locally

Serve the repository root as static files:

```bash
python -m http.server 8080
```

Then open:

- <http://localhost:8080/>
- <http://localhost:8080/demo/>
- <http://localhost:8080/code/apps/collector-ui/>

## Repository structure

```text
code/apps/              -> app implementations
code/packages/          -> shared packages and providers
examples/               -> example collections and test data
demo/                   -> demo / consumer-style entry page
docs/                   -> documentation page
src/                    -> lightweight root web entry layer
index.html              -> landing page
projects/               -> planning and architecture docs
```
