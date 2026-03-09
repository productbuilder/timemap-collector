You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Implement a proper asset ingestion flow in Collector so users can drag and drop image files into a collection, immediately see them as cards, generate thumbnail assets, and later upload/publish them to the currently selected writable storage source.

Important product direction:
- Collector is for editing, publishing, and later registering collections
- Collector should support real collection authoring, not only loading/editing existing items
- Users should be able to add new images directly into the current collection
- New files should first become part of the local draft/workspace
- Publishing/uploading should remain explicit
- Thumbnails should be generated automatically for image assets if practical

This task should integrate cleanly with the current Collector app and the OPFS/local-draft direction that may already be in progress.

---

## Core workflow to implement

The target workflow is:

1. user opens a writable collection in Collector
2. user drags image files into Collector (or uses a file picker)
3. Collector immediately creates local draft items for those files
4. Collector shows the new items as cards in the grid
5. Collector generates a thumbnail for each image if possible
6. Collector creates metadata stubs for the new items
7. new items are marked as local / unpublished / pending upload
8. when the user publishes or uploads, Collector uploads:
   - original image
   - thumbnail
   - updated manifest / metadata
9. uploaded items become part of the remote collection

---

## What to implement

### 1. Add drag-and-drop upload support in Collector

Add a drag-and-drop file ingestion flow to the Collector collection viewport.

Requirements:
- users can drag image files onto the collection area
- the app should visually indicate the drop target
- support multiple files at once
- also provide a normal file picker button as fallback
- accepted file types should at least include common images:
  - jpg / jpeg
  - png
  - webp
  - gif optional if easy

Do not make drag-and-drop require a separate page.
It should feel like a natural part of the collection workspace.

### 2. Add new local draft items immediately

When files are dropped/selected:
- create in-memory draft items immediately
- add them to the currently selected collection draft
- show them in the card grid right away
- do not wait for remote upload before showing them

This is important for responsive UX.

Each new asset should have a clear local draft state such as:
- local only
- pending upload
- uploading
- uploaded
- failed

A simple first-pass status badge is enough.

### 3. Generate metadata stubs for new items

For each dropped image, create a starter item record.

The stub should include at least:
- id
- title derived from file name
- media type = image
- local preview URL
- thumbnail reference if available
- empty/default metadata fields such as:
  - description
  - creator
  - date
  - license
  - location
  - tags
  - include = true

The item should be editable in the existing metadata editor.

Suggested behavior:
- normalize filename into a usable item id
- derive a simple human title from the filename
- avoid breaking on duplicate names; ensure ids are unique in the draft

### 4. Generate local preview and thumbnail assets

For image files:
- generate an immediate local preview for the card UI
- generate a thumbnail image if practical

Recommended implementation approach:
- use browser APIs such as:
  - URL.createObjectURL
  - createImageBitmap
  - canvas
  - toBlob
- keep implementation straightforward
- produce a reasonable thumbnail size, for example:
  - around 300px width
  - preserving aspect ratio

The thumbnail should be treated as a real draft asset, not just a runtime-only preview if possible.

If thumbnail generation fails:
- still keep the original image
- fall back to the original preview
- do not fail the whole ingestion flow

### 5. Integrate with local draft / OPFS if available

If the OPFS local draft work is already in progress or present:
- store dropped originals and/or draft metadata references in local draft storage where practical
- store thumbnail artifacts locally where practical
- restore local draft uploaded files after reload if feasible

Do not overcomplicate this if the OPFS implementation is still partial.
But the upload flow should be compatible with local draft persistence.

At minimum:
- draft items should survive in app state
- if OPFS is available, use it where it fits naturally

### 6. Add explicit upload/publish behavior for new assets

Do not automatically upload files immediately unless that is already the established Collector publishing model.

Preferred model:
- dropped files become part of the local collection draft
- user explicitly publishes/uploads when ready

When publishing to a writable source, Collector should:
- upload original image files
- upload generated thumbnails if used
- update collection metadata/manifest
- preserve existing publish behavior where possible

For this pass, target the first practical writable provider:
- GitHub

### 7. Implement GitHub asset upload support for new files

If the selected source is a writable GitHub collection source:
- upload the original image file into the repo
- upload the thumbnail into the repo
- update `collection.json`
- commit changes via the GitHub API

Use a reasonable repo layout for new assets.

Choose one clear layout and apply it consistently, for example:

Option A:
- `media/<filename>`
- `thumbs/<filename>`
- `collection.json`

or Option B:
- `media/<filename>`
- `media/<basename>.thumb.<ext>`
- `collection.json`

Pick the simpler layout and document it.

The updated manifest should reference the uploaded asset URLs/paths correctly.

### 8. Keep manifest structure consistent

If the current collection format uses inline items in `collection.json`:
- add the new items inline
- update them cleanly
- preserve existing manifest structure as much as possible
- do not remove unknown fields

If later sidecar support exists, keep this pass focused on the currently active manifest model.

### 9. Add upload status feedback

Users should see clear status messages for new assets and publish behavior.

Examples:
- `3 files added to local draft`
- `Generating thumbnails...`
- `Ready to publish`
- `Uploading 3 assets to GitHub...`
- `Upload complete`
- `1 asset failed to upload`

Keep feedback simple and practical.

### 10. Preserve current Collector UX

Do not break:
- existing card selection
- metadata editing
- image viewer
- sources dialog
- publish dialog
- OPFS/local draft work if present
- current writable source behavior

This task should extend Collector into real authoring, not rewrite the app.

---

## Recommended UI approach

### In the collection viewport
Add one or both of:
- a visible upload button
- a drag-and-drop target area or empty-state prompt

A good UX pattern:
- if the collection is empty, show a larger dropzone
- otherwise allow dropping anywhere over the grid area, with a visible overlay on dragenter/dragover

### Card UI
New local items should display clearly.
Examples:
- badge: `Local`
- badge: `Pending upload`
- badge: `Uploading`

Keep this lightweight.

### Metadata editor
Selecting a newly dropped item should open the normal metadata editor with the stub fields ready to edit.

---

## Suggested implementation steps

1. inspect current Collector state and publish flow
2. add file input + drag/drop support
3. create local draft item ingestion logic
4. generate preview URLs
5. generate thumbnails
6. add local item status model
7. integrate new items into card grid and metadata editor
8. connect publish flow to upload originals + thumbnails for GitHub
9. update manifest writing logic
10. add clear status/error messaging
11. update docs / implementation notes briefly

Avoid unnecessary rewrites.

---

## Optional enhancements if they fit naturally

If practical, add one or more of these:

### A. Duplicate file handling
Warn or disambiguate when the same filename/id already exists.

### B. Basic image validation
Reject obviously unsupported file types or huge files with a helpful message.

### C. Simple rename support
Allow title/id adjustment before publish if needed.

### D. Thumbnail regeneration
If metadata or file changes later, allow thumbnail regeneration.

These are optional if they do not overcomplicate the implementation.

---

## Out of scope for this pass

Do NOT require implementation of:
- video transcoding
- audio waveform generation
- sidecar file upload if not already supported
- advanced batch editing
- image crop UI
- EXIF parsing
- full asset management system

Focus first on:
- drag/drop images
- local draft items
- thumbnail generation
- GitHub upload/publish

---

## Documentation updates

Update docs briefly where useful, such as:
- README
- implementation notes
- docs page if relevant

Document:
- Collector now supports drag-and-drop image ingestion
- new assets first enter the local draft
- thumbnails are generated automatically for images
- GitHub publish uploads originals + thumbnails + manifest updates
- current limitations

Keep docs concise and honest.

---

## Acceptance criteria

This task is complete when:

1. users can drag and drop image files into Collector
2. users can also add files via file picker
3. new dropped files appear immediately as cards
4. metadata stubs are created for new items
5. thumbnails are generated for image assets when possible
6. new items can be edited in the metadata editor
7. new items are clearly marked as local/pending until publish
8. publishing to a writable GitHub source uploads originals + thumbnails and updates `collection.json`
9. current Collector functionality still works

---

## Output requirements

After making the changes:

1. show the git diff
2. summarize:
   - how drag-and-drop ingestion works
   - how local draft items are created
   - how thumbnails are generated
   - how GitHub upload/publish works for new assets
3. clearly separate:
   - completed functionality
   - limitations
   - recommended next step
4. be honest about any remaining edge cases
5. do not modify unrelated files unnecessarily