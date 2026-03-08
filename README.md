# timemap-collector

TimeMap Collector is now shipped as a reusable Web Component:

`timemap-collector`

It uses Shadow DOM and provides a clean SaaS-style shell for source connection, asset browsing, metadata editing, and manifest export.

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

- Connect to source/provider modes:
  - Example dataset (working)
  - Public URL manifest (working, read-only)
  - GitHub (stub)
- Browse assets as cards with thumbnail, metadata completeness, license, and include/exclude state
- Edit metadata for the selected item in a right-side editor column
- Open provider/source controls via header dialog
- Open manifest export controls via header dialog
- Generate, preview, copy, and download `collection.json`

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

## Provider status

- `local/example`: working
- `public-url`: working (read-only)
- `github`: scaffold/stub only
