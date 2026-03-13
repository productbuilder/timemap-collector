# Configurator Overview

The configurator is now organized as a local-first workspace editor with a clear hierarchy:

1. Organization context
2. Workspace type (`General`, `Products`, `Materials`)
3. Collections inside a workspace
4. Sections inside a collection
5. Entries inside a section

## Core model

- `General` is organization-level configuration.
- `Products` is collection-first. Users open a product collection before editing sections.
- `Materials` is collection-first. Users open a material collection before editing sections.
- Package export is inside the **Products** flow, not a top-level workspace.

## Local-first workflow

- Open manufacturer source JSON.
- Open one or more product collection JSON files.
- Open one or more material collection JSON files.
- Edit sections and entries with the right inspector at entry level.
- Generate and download package export from the product collection export level.

## Export placement

Export is contextual to a selected product collection:

- Enter product collection
- Open `Export / Package`
- Generate preview
- Review warnings
- Download generated package JSON

## Future-ready direction

The UI and state model are prepared for linked external collections:

- Collections have owner/source organization metadata.
- Product collections can later use material collections from other organizations.
- The organization selector in the header is the top-level workspace context.
