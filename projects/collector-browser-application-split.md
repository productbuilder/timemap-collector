# Collector / Browser Application Split

## Summary

TimeMap now uses two app concepts in one repository:

- Collector: edit/publish/register workflow for managed collections.
- Browser: read-only exploration workflow for collection browsing.

## Product framing

### Collector

Collector is focused on collection management, not generic public browsing.

- Connect storage sources the user controls.
- Work with collections within a selected storage source.
- Edit item metadata.
- Publish/export `collection.json`.
- Keep registration in-flow as a placeholder for the next phase.

### Browser

Browser is focused on read-only exploration.

- Load one or more collection manifests.
- Browse cards/media/details.
- No write or publish controls.

## Source and collection model in Collector

- Sources represent storage systems (GitHub now, others scaffolded).
- Each source carries a collection list model.
- Current implementation scaffolds collection discovery with a default collection per source when provider discovery is unavailable.
- Selected source + selected collection drive active item visibility.

## Registration

- Registration is part of Collector UX now via a dedicated Register action.
- Backend registration integration is intentionally deferred.

## Repository structure

- Implementation root is `src/`.
- Site-facing assets are grouped under `site/`:
  - `site/demo`
  - `site/docs`
  - `site/examples`
- Root `index.html` remains at repository root as the landing entry.

## Shared code

- Minimal shared library introduced at `src/library/core`.
- Contains lightweight base component and collection model helpers.
- Avoids over-fragmenting into many packages at this stage.
