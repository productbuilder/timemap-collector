
# Codex Prompt — Add "Create New Collection" Flow to Collector

You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Add a proper **Create New Collection** flow to Collector so users can start a collection from scratch, edit it locally, add assets later, and publish it when ready.

Important product direction:
- Collector is for **editing, publishing, and later registering collections**
- Collector must not depend only on opening an existing remote `collection.json`
- Users should be able to create a **brand new collection draft locally**
- This should integrate cleanly with the **local draft / OPFS model**
- New collection creation should become a **core Collector workflow**

This task should make Collector feel like a **real authoring tool**.

---

# Core workflow

Target flow:

1. user opens Collector  
2. user clicks **New collection**  
3. user fills in basic metadata  
4. Collector creates a **local draft collection**  
5. Collector opens the new collection immediately  
6. user can edit metadata  
7. user can add assets later  
8. user can publish to a writable storage source  
9. registration can remain a placeholder for now

---

# Features to implement

## 1. Add "New collection" action

Add a visible **New collection** button.

Recommended locations:

- Collector header
- Empty state when no collection is open

Example label:

`New collection`

or

`Create collection`

---

## 2. Add collection creation dialog

Open a modal dialog when creating a collection.

Suggested fields:

Required:

- title
- id / slug

Optional:

- description
- license
- publisher
- language

If slug is empty, derive it from the title.

---

## 3. Create initial collection draft

When created, generate a valid draft collection object.

Example:

{
  "id": "my-collection",
  "title": "My Collection",
  "description": "",
  "license": "",
  "publisher": "",
  "items": []
}

Adjust if the project already uses a slightly different collection model.

Requirements:

- collection must be valid immediately
- metadata editor must work
- asset upload must work later
- publish flow must work later

---

## 4. Open collection immediately

After creation:

- make it the active collection
- show empty grid
- activate metadata editor
- ready for asset upload

User should feel like they **entered the collection workspace**.

---

## 5. Integrate with OPFS local draft storage

If OPFS storage exists:

- save the new collection draft locally
- restore it after reload
- integrate with workspace persistence

If OPFS is unavailable:

- still create collection in memory
- fail gracefully

---

## 6. Add empty state UI

If a collection has no items show helpful empty state.

Example:

This collection is empty.
Drag and drop images to add items.
or click Upload to add assets.

---

## 7. Ensure publish compatibility

A new collection must be publishable later.

The model must work with:

- publish/export
- GitHub upload
- future storage providers

Do not introduce a structure incompatible with publishing.

---

## 8. Preserve existing Collector features

Do not break:

- card grid
- metadata editor
- image viewer
- source manager
- publish/export
- OPFS draft persistence

This task **adds the new collection workflow**, not rewrite existing logic.

---

# Recommended UX

Header:

New Collection | Sources | Publish | Register

After creation:

- collection workspace opens
- metadata editor visible
- empty card grid ready for uploads

---

# Suggested implementation steps

1. inspect Collector state model
2. add New Collection action
3. build creation dialog
4. generate collection draft
5. activate collection workspace
6. integrate with OPFS storage
7. add empty state
8. test publish compatibility
9. update docs

---

# Optional enhancements

If easy:

### Auto slug generation

Create slug automatically from title.

### Duplicate id detection

Warn if id already exists locally.

### Direct upload CTA

After creation show:

Add images to this collection

### Collection metadata editor

Ensure collection-level metadata editing works cleanly.

---

# Out of scope

Do NOT implement:

- registry backend
- multi-step wizards
- remote collection creation APIs
- templates
- user accounts

Focus on **local collection creation**.

---

# Documentation updates

Update:

- README
- docs

Explain:

- Collector supports **creating collections from scratch**
- new collections start as **local drafts**
- assets can be added later
- publishing is explicit

---

# Acceptance criteria

This feature is complete when:

- Collector has a **New collection** button
- users can create collections from scratch
- a valid draft collection is created
- the workspace opens automatically
- empty collections show helpful state
- OPFS persistence works when available
- publish still works
- existing Collector features remain intact

---

# Output requirements

After implementation:

Show:

1. git diff
2. summary of new collection workflow
3. how drafts are stored
4. how empty state works
5. limitations
