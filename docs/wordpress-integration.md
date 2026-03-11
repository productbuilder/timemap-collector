# WordPress Integration in the Open Collections Protocol Ecosystem

WordPress is a practical adoption and integration layer for Open Collections Protocol.

Open Collections Protocol remains the core publication/discovery layer. WordPress is one implementation path, not the protocol itself.

## 1) Why WordPress matters

WordPress is a strong path for:

- non-technical collection owners
- small institutions
- local history groups
- community publishers
- teams that already run a WordPress website

It lowers onboarding friction by reusing familiar admin workflows, hosting, and plugin-based distribution.

## 2) Core positioning

A WordPress integration should preserve these boundaries:

- Open Collections Protocol remains the public web contract
- Collection Manager remains the main editing/publishing UI
- WordPress provides hosting context, configuration, and routing
- protocol-facing outputs stay standard and portable

## 3) Plugin concept (first implementation)

A practical first plugin direction is:

- **Open Collections for WordPress**

Phase-1 plugin focus:

- embed Collection Manager
- manage WordPress-side configuration
- publish protocol-facing outputs
- optionally expose Domain-owned Collections Discovery (DCD)

## 4) Relationship to Collection Manager

The plugin should embed/use the existing Collection Manager web component.

- WordPress hosts and configures Collection Manager
- Collection Manager remains reusable outside WordPress
- WordPress should not replace Collection Manager with a WordPress-only editor

Likely integration methods include:

- shortcode
- block
- admin screen mount
- page embed
- settings-driven configuration passed into component initialization

## 5) Suggested implementation roadmap

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

## 6) Responsibilities split

### WordPress responsibilities

- plugin install/update
- settings storage
- user roles/permissions
- admin UI
- page/block/shortcode integration
- optional REST endpoints
- optional WordPress media integration

### Collection Manager responsibilities

- collection editing UX
- metadata editing
- asset organization
- collection output model
- publishing workflow logic
- reusable component behavior

## 7) Output requirements

A WordPress integration should preserve standard protocol resources:

- collection manifest (`collection.json`)
- item detail URLs
- media URLs
- optional `/.well-known/collections.json`
- optional registry export later

Public consumers should integrate with these outputs, not internal WordPress storage structures.

## 8) Non-goals for v1

Avoid overbuilding in the first version:

- full registry backend inside WordPress
- full indexer inside WordPress
- complex custom data modeling too early
- too many provider integrations at once

## 9) Why this matters

This path lowers adoption barriers while preserving open interoperability:

- easier starting point for non-technical users
- incremental adoption for existing organizations
- portable, web-native outputs remain central
- decentralized protocol architecture remains intact

## 10) Plan reference

See implementation scaffold and phase details:

- [WordPress Integration Plan](../projects/plans/26-03-11/wordpress-integration-plan.md)
