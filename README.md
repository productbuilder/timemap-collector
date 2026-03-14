# open-collections

Open Collections now contains two focused applications in one repository:

- Collector: writable collection management (edit, publish, register placeholder)
- Browser: read-only collection browsing

## Quick links

- Landing page: `./index.html`
- Site demo: `./site/demo/`
- Site docs: `./site/docs/`
- Site examples: `./site/examples/`
- Collector app: `./src/apps/collector/`
- Browser app: `./src/apps/browser/`
- WordPress plugin scaffold: `./wordpress/open-collections/`

## App roles

### Collector

- Connect storage sources
- Manage collections per source (collection discovery scaffold where provider support is limited)
- Edit metadata for collection items
- Publish/export `collection.json`
- Open a registration placeholder flow from the header

### Browser

- Load collection manifests
- Browse cards/media/metadata in read-only mode
- No publishing or write controls

## Run locally

Serve repository root as static files:

```bash
python -m http.server 8080
```

Then open:

- <http://localhost:8080/>
- <http://localhost:8080/src/apps/collector/>
- <http://localhost:8080/src/apps/browser/>
- <http://localhost:8080/site/demo/>

## Structure

```text
src/
  apps/
    collector/
    browser/
    configurator/
  desktop/
    workbench/
  shared/
    platform/
  library/
    core/
  packages/
    collector-schema/
    provider-core/
    provider-github/
    provider-gdrive/
    provider-local/
    provider-public-url/

site/
  demo/
  docs/
  examples/

projects/
index.html
```

## Notes

- Implementation code now lives under `src/`.
- Site-facing content now lives under `site/`.
- Registration and richer collection discovery are scaffolded, not fully implemented yet.
- Collector uses OPFS for local draft/workspace persistence when browser support is available.
- Collector supports image ingestion via drag-and-drop and file picker for local drafts.
- Collector supports creating new collections from scratch as local drafts (`New collection`).
- Collection publishing now targets explicit collection roots (for example `<collection-slug>/collection.json`, `<collection-slug>/media/*`, `<collection-slug>/thumbs/*`).
- Collector generates image thumbnails for draft assets when possible.
- GitHub publish uploads originals (`media/`), thumbnails (`thumbs/`), and updates `collection.json`.
- Publishing remains provider-backed (GitHub/other storage), separate from OPFS local drafts.
- Secrets are not stored in OPFS.

- Desktop workbench shell (Tauri) is available under `src/desktop/workbench` and can launch Collector or Configurator from one native window.
- Shared browser/desktop file APIs are centralized in `src/shared/platform` to avoid direct Tauri API calls in app components.
