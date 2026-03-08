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
- white SaaS-style header with toolbar actions
- source/provider controls in a dialog
- manifest export controls in a dialog
- responsive card grid viewport
- metadata edit sidebar for selected item

## Notes

- Built as ES modules with no build step.
- Intended for local static hosting from repository root.
