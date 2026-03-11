# WordPress Integration Plan

## Purpose

WordPress is a strong adoption path for:

- non-technical collection owners
- small institutions
- local history groups
- community publishers
- people who already run a WordPress website

WordPress is one implementation path, not the core architecture. Open Collections Protocol remains the open public contract.

## Core positioning

This plan keeps architecture boundaries explicit:

- Open Collections Protocol remains the public web contract
- Collection Manager remains the main editing and publishing UI
- WordPress provides hosting context, configuration, routing, and CMS integration
- protocol-facing outputs must stay standard and portable

## Plugin concept

Working public plugin name:

- **Open Collections for WordPress**

First plugin goals:

- embed Collection Manager
- manage WordPress-side configuration
- publish protocol-facing outputs
- optionally expose Domain-owned Collections Discovery (DCD)

## Main adoption question

How can WordPress provide an easy adoption path for non-technical users while preserving open, portable, web-native protocol outputs?

Proposed answer for phase 1:

- use familiar WordPress installation and admin workflows to reduce setup friction
- keep collection editing in the reusable Collection Manager component
- route all public output to stable, protocol-facing URLs (manifest, item, media, optional DCD)
- avoid coupling public contracts to WordPress data models

## Relationship to Collection Manager

The WordPress plugin should embed and use the existing Collection Manager web component.

- WordPress hosts Collection Manager in admin/editor-facing surfaces
- WordPress passes environment/configuration values into Collection Manager
- Collection Manager stays reusable outside WordPress and should not become WordPress-specific

Likely integration methods:

- shortcode render target
- block-based render target
- plugin admin screen mount
- page template embed
- settings-driven config injection into component initialization

## Suggested first implementation scope (Phase 1)

Deliver a practical MVP and avoid overbuilding.

- plugin settings page for base URLs, routes, and defaults
- Collection Manager embed support in WordPress admin or restricted page contexts
- collection root/output configuration
- basic publishing configuration (paths, URL roots, and exposure toggles)
- optional DCD output toggle and route
- protocol-facing manifest/item/media output routes

### Example phase-1 route targets

- `/collections/{slug}/collection.json`
- `/collections/{slug}/items/{item-id}`
- `/collections/{slug}/media/{asset-id}`
- optional `/.well-known/collections.json`

## Suggested later phases

### Phase 1 — Publishing + Manager embed

- embed Collection Manager
- provide basic plugin settings
- configure collection root/output paths
- expose/generate collection manifest
- expose optional DCD output

### Phase 2 — Browser + better UX

- embed Collection Browser
- improve admin/editor experience
- improve media library integration
- improve publishing flows

### Phase 3 — Registry participation

- optional Collection Registry participation
- registry export
- possibly lightweight registry functions inside WordPress

### Phase 4 — Advanced integrations

- provider-specific helpers
- richer permission models
- more flexible embedding/configuration API
- optional integrations with Collection Registry / Collection Indexer

## Responsibilities split

### WordPress responsibilities

- plugin install/update lifecycle
- settings storage and admin forms
- user roles and permissions integration
- admin UI and editorial context
- page/block/shortcode integration
- optional REST endpoints for plugin-level helpers
- optional WordPress media integration

### Collection Manager responsibilities

- collection editing UX
- metadata editing and validation
- asset organization behaviors
- collection output model
- publishing workflow logic
- reusable component behavior across environments

This split is important to keep portability and ecosystem reuse intact.

## Technical integration direction

Use concrete but implementation-flexible patterns:

- enqueue Collection Manager bundle from plugin assets or trusted hosted bundle
- render a mount element in shortcode/block/admin page
- pass config via shortcode/block attributes or injected config object
- expose stable protocol-facing output routes from WordPress rewrite/routing configuration
- keep route contracts explicit and testable independent of storage internals

## Output requirements

The plugin must preserve protocol-facing outputs:

- `collection.json`
- item detail URLs
- media URLs
- optional `/.well-known/collections.json`
- optional registry export later

Public contract emphasis:

- clients should integrate with protocol resources and URLs
- clients should not depend on WordPress storage internals or private plugin schemas

## Non-goals for v1

Do not include these in the first version:

- full Collection Registry backend implementation
- full Collection Indexer inside WordPress
- overly complex custom database modeling
- too many provider integrations at once

## Why this matters

This approach lowers adoption barriers while preserving the decentralized protocol model:

- non-technical users can start from familiar WordPress workflows
- institutions can adopt incrementally without replacing existing sites
- outputs remain open, portable, and interoperable across tools
- Collection Manager investment is reused across WordPress and non-WordPress deployments
