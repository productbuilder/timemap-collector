# Open Collections for WordPress (Scaffold)

This plugin folder is an **initial scaffold** for WordPress integration.

## Positioning

This plugin is an integration/adoption layer, not the protocol itself.

- **Open Collections Protocol** remains the public web contract.
- **Collection Manager** remains the core collection editing/publishing UX.
- **WordPress** provides configuration, permissions, routing, and placement surfaces.

## Current scaffold scope

Included in this pass:

- plugin bootstrap file (`open-collections.php`)
- service classes for settings/admin/embed scaffolding
- admin settings page scaffold
- admin mount page scaffold for Collection Manager
- shortcode scaffold: `[open_collections_manager]`
- JS/CSS asset scaffolding for embed startup

Not implemented yet:

- full registry backend
- full indexer backend
- advanced provider integrations
- full production publishing/media sync workflows

## Config passing direction

Current direction is a localized JS config object (`OpenCollectionsConfig`) that WordPress assembles from plugin settings.

Why this direction:

- keeps WordPress as environment/config source
- allows one stable JSON envelope to power admin mount + shortcode mount
- keeps Collection Manager runtime logic portable and reusable outside WordPress

Future implementation can evolve to include richer config transport via REST bootstrap endpoints where needed.

## Protocol-facing outputs (target model)

This scaffold points toward support for standard outputs:

- `collection.json`
- item detail URLs
- media URLs
- optional `/.well-known/collections.json`
- optional registry export later

Public consumers should rely on protocol outputs rather than WordPress internal storage schemas.
