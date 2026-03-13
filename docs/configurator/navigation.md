# Navigation Model

## Header navigation

Header responsibilities:

- App title
- Workspace switching (`General`, `Products`, `Materials`)
- Organization selector

Header no longer mixes section-level navigation.

## Level transitions

### General

- Start: `general-sections`
- Open section: `general-entries`
- Back: returns to `general-sections`

### Products

- Start: `products-collections`
- Open collection: `products-sections`
- Open section: `products-entries`
- Open export section: `products-export`
- Back transitions one level at a time

### Materials

- Start: `materials-collections`
- Open collection: `materials-sections`
- Open section: `materials-entries`
- Back transitions one level at a time

## Panel behavior

Main panel behavior is level-driven:

- Collections level: collection list
- Sections level: section list
- Entries level: rows/cards editor list
- Export level: generated package preview

## Inspector behavior

Inspector is only shown at entry-editing levels:

- `general-entries`
- `products-entries`
- `materials-entries`

At other levels, inspector is hidden.

## Context actions

Main panel header actions are contextual by level:

- file open/save actions where relevant
- open collection/section actions
- export generate/download in products export level
