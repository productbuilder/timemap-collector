# Configurator production-readiness plan

## Goal

Move the configurator from a promising local editor prototype toward a production-ready workflow that can open, edit, save, link, and export real source files that currently live in separate domain repositories.

## Current reality

The real source data is currently organized by domain, not by organization:

- manufacturer info lives in a manufacturers repo
- blocks/products live in a blocks repo
- materials live in a materials repo

At the same time, the product model we want in the UI is organization-centered:

- an organization has general settings
- an organization has multiple product collections
- an organization has multiple material collections
- an organization can use collections from other organizations

So the app needs to support both:

- an organization-centered editing model in the UI
- a domain-repo-centered source model in storage

## Main workstreams

### 1. Production source and workspace model

This is the first priority.

A workspace should be able to connect to:

- one manufacturer source
- one products source
- one materials source

Each source may live in a different repo or storage location.

This needs a clear model for:

- how a source is identified
- how a source is opened
- how a source is authenticated
- how a source is saved back
- how the workspace remembers those source locations
- how local and GitHub-backed workflows relate

This becomes the **workspace connection model**.

### 2. Linked collections from other organizations

This is also essential because exports already need this concept.

Examples:

- 4x6 sofa uses Kvadrat materials
- later, an organization may also use product collections from another organization

We need a model for:

- local vs external ownership
- how a linked collection is identified
- what metadata is stored about a linked collection
- how the UI presents linked collections
- how export resolves linked collections

This becomes the **linked collection model**.

### 3. Export correctness

The current export uses a first-pass additive merge heuristic. That is a useful start, but not a final production rule set.

We need an explicit export specification that defines:

- which source acts as the base
- which fields come from manufacturer
- which fields come from products
- which fields come from materials
- how linked external collections are merged
- what happens when fields overlap
- what validation rules apply before export
- what warnings vs hard errors should be surfaced

This becomes the **export mapping spec**.

### 4. Creating new source files

Production readiness is not only about opening existing files.

We also need to verify that the app can create:

- new manufacturer files
- new products/blocks files
- new materials files

And then:

- save them back correctly
- link them into a workspace
- export from them

This will expose:

- missing defaults
- weak templates
- missing required fields
- awkward workflows

This becomes the **new-source creation flow**.

### 5. Asset and media pipeline

This is an important workstream, but it should come after the source model and export model are clearer.

This includes:

- UUID generation
- GLB upload
- thumbnail generation
- 3D preview/viewer
- additional asset ingest
- file placement conventions
- maybe validation of asset references

This becomes the **asset pipeline**.

## Recommended priority order

### Priority 1
Production source and workspace model

### Priority 2
Export mapping specification

### Priority 3
Linked collection model

### Priority 4
Create-new source flows

### Priority 5
Asset and media pipeline

## Immediate next step

The best next implementation-focused step is to define the production workspace/source connection model.

This should answer:

- how the configurator connects to manufacturer, products, and materials sources
- how those sources may live in different repos
- how the workspace stores those source connections
- how save/open should work in local and GitHub-backed flows

## Why this is the right next step

Without a solid source connection model:

- UI work risks being built on the wrong storage assumptions
- export remains fragile
- linked collections remain vague
- production rollout remains blocked

With a solid source connection model:

- the workspace becomes real
- save/open behavior becomes production-ready
- linked collections can be defined clearly
- export rules can target real source locations

## Practical next sequence

1. define the production workspace/source connection model
2. turn that into an implementation prompt
3. define the export mapping spec
4. define linked collection handling
5. test real create/save/export workflows end to end

## One-sentence summary

The configurator is now at the point where the most important work is no longer generic UI, but defining how real source files from separate domain repositories are connected, edited, linked, and exported in a production-safe way.
