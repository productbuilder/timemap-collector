You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Add initial Google Drive source support to TimeMap Collector, starting with public shared JSON manifest files.

Important product direction:
- Collector supports multiple readable sources
- Google Drive should become one of the supported source providers
- For this first pass, focus on **public shared collection manifests** stored in Google Drive
- Do not build full Google OAuth or full folder browsing yet unless it fits naturally
- Start with the simplest useful capability:
  - user pastes a Google Drive shared file URL
  - Collector normalizes it into a fetchable raw/download URL
  - Collector loads the JSON manifest
  - assets appear in the existing workspace

This should fit into the current multi-source/provider architecture.

---

## Problem to solve

Google Drive shared links are not raw file URLs by default.

Users may paste a link like:

`https://drive.google.com/file/d/FILE_ID/view`

But Collector needs to fetch the actual file content.

For public shared JSON manifests, the provider should:
1. accept a Google Drive shared file URL
2. extract the file ID
3. convert it into a usable fetch URL, such as:
   `https://drive.google.com/uc?export=download&id=FILE_ID`
4. fetch and parse the JSON
5. normalize it into the same internal collection/item format used by other providers

This should work for public shared `collection.json` files.

---

## What to implement

### 1. Add Google Drive as an enabled source provider

In the Sources dialog / provider picker:
- add Google Drive as an enabled provider
- label it clearly
- make it distinct from generic Public URL

Suggested provider label:
- `Google Drive`

If provider descriptions are shown, use something like:
- `Load a public shared collection manifest from Google Drive`

This is now a real provider, not a greyed-out placeholder.

---

### 2. Implement public Google Drive manifest source mode

For this first pass, support:
- public shared file URL
- JSON manifest file
- read-only source

The provider should accept links such as:
- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/uc?export=download&id=FILE_ID`
- possibly other common Drive file URL variants if practical

The provider should normalize these into a usable fetch URL.

### Required behavior
- extract Drive file ID where possible
- build normalized direct download URL:
  - `https://drive.google.com/uc?export=download&id=FILE_ID`
- fetch JSON from that URL
- parse manifest
- normalize assets/items into the Collector workspace

If the link is invalid, not public, or not JSON:
- return a clear user-friendly error message

---

### 3. Add Google Drive URL normalization helper(s)

Implement a clean helper utility for Drive URL parsing and normalization.

It should ideally support:
- extracting `FILE_ID` from a standard `/file/d/.../view` link
- recognizing already-normalized `uc?export=download&id=...` URLs
- optionally recognizing Drive API-style links if present

Keep this logic provider-local or in a small shared helper if it makes sense.

Do not overengineer.

---

### 4. Support current collection manifest shape

The Google Drive provider should support the current Collector manifest model, including inline items.

That means if the JSON file contains:
- collection metadata
- inline `items`
- media URLs
- optional `thumbnailUrl`

then those items should appear in the Collector grid just like with Public URL or GitHub manifest sources.

Use the existing internal normalization approach where possible.

---

### 5. Preserve read-only behavior

For this first Google Drive implementation:
- treat it as a **read-only source**
- do not attempt metadata write-back to Drive
- do not imply write capability
- clearly mark source capability as `Read`

This should fit the current source capability model.

---

### 6. Show useful source labeling

For Google Drive sources:
- derive a short source display label
- do not show the full long Drive URL on cards
- use something compact like:
  - `Google Drive`
  - or file-derived label if available
- make the source manager show more detail if useful

This should align with the recent source label cleanup work.

---

### 7. Add clear provider messaging

In the provider/source creation UI, explain the current scope.

For example:
- `Paste a public Google Drive file link to a shared collection.json manifest`
- `The file must be shared as Anyone with the link → Viewer`

Also include clear error/status handling, such as:
- `Loaded Google Drive collection`
- `File is not publicly accessible`
- `Could not parse JSON manifest`
- `Invalid Google Drive file URL`

---

### 8. Keep current provider architecture clean

Integrate Google Drive into the existing multi-source architecture.

Requirements:
- Google Drive source appears in connected sources
- source can be added without replacing existing sources
- assets merge into the workspace
- source badges / filters continue to work
- metadata sidebar continues to work

Do not special-case it in the UI beyond what is needed for provider-specific configuration.

---

## Optional but useful enhancements

If practical, add one or more of these:

### A. Friendly label inference
Try to infer a nicer label from:
- manifest title
- hostname
- file name
rather than just `Google Drive`

### B. Validation before add
When user pastes a Google Drive URL:
- validate format before attempting full source add

### C. Provider help text
Short note in the source dialog:
- `Google Drive support currently works with public shared manifest files`

These are optional if they fit naturally.

---

## Out of scope for this pass

Do NOT require implementation of:
- full Google OAuth
- Drive folder browsing
- write-back to Google Drive
- publishing to Drive
- Google Drive API token flow
- folder-to-collection conversion
- media upload to Drive

Focus first on:
- public shared `collection.json`
- Drive link normalization
- read-only manifest loading

---

## Suggested implementation approach

1. inspect current provider architecture
2. add Google Drive provider module or extend existing provider modules
3. implement URL parsing / file ID extraction
4. normalize to direct download URL
5. fetch and parse JSON manifest
6. normalize manifest items into workspace assets
7. add provider UI/config form in Sources dialog
8. add clear status/error messaging
9. update docs / implementation notes briefly

Avoid unnecessary rewrites.

---

## Example target behavior

User pastes a URL like:

`https://drive.google.com/file/d/1diFAVD17-_b7O22fYRLqB7dqWv0cgWNi/view`

Provider behavior:
- extract file ID:
  `1diFAVD17-_b7O22fYRLqB7dqWv0cgWNi`
- build raw URL:
  `https://drive.google.com/uc?export=download&id=1diFAVD17-_b7O22fYRLqB7dqWv0cgWNi`
- fetch JSON
- parse collection
- add items to the Collector workspace

---

## Documentation updates

Update docs briefly where needed, such as:
- README
- implementation notes
- docs page

Document:
- Google Drive source support exists for public shared manifest files
- users should share as `Anyone with the link → Viewer`
- this is currently read-only
- full Drive OAuth/folder support is a future step

Keep documentation concise.

---

## Acceptance criteria

This task is complete when:

1. Google Drive appears as an enabled source provider
2. user can paste a public Google Drive shared file link
3. provider converts it into a fetchable URL
4. `collection.json` can be loaded from Drive
5. items appear in the Collector grid
6. source badges/filters still work
7. source is treated as read-only
8. errors for invalid/non-public/non-JSON files are clear

---

## Output requirements

After making the changes:

1. show the git diff
2. summarize:
   - how Google Drive URL normalization works
   - what kinds of Drive links are supported
   - how the source is added to the workspace
   - what limitations remain
3. clearly separate:
   - completed functionality
   - partial/stubbed functionality
   - recommended next step
4. be honest about public access limitations
5. do not modify unrelated files unnecessarily