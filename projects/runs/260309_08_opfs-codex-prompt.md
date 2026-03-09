
# Codex Prompt — Add OPFS Local Draft Storage to Collector

You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Add an OPFS-backed local draft and workspace persistence layer to the Collector app.

Important product direction:
- Collector is for editing, publishing, and later registering collections
- Collector should support a strong local-first editing workflow
- OPFS should be used for local draft/workspace persistence
- OPFS should NOT be treated as the public source of truth
- OPFS should NOT be treated as secure secret storage
- Published collections still live on writable storage sources such as GitHub or other providers
- OPFS should make Collector feel like a real app: drafts survive reloads and users can explicitly publish when ready

This task should add a practical first OPFS implementation, not an overengineered storage framework.

---

## Core design principles

### Use OPFS for local drafts and workspace state

Persist:
- workspace state
- local collection drafts
- safe non‑secret source configuration
- cached manifests if useful

Do NOT use OPFS as:
- a hosting layer
- a registry
- a credential vault

### Keep implementation simple

For this first pass:
- JSON files
- small storage wrapper
- no SQLite
- no complex worker concurrency

### Preserve explicit publishing

Collector should clearly separate:

Local Draft → OPFS  
Published Collection → Storage Provider

---

## Storage service

Create a small OPFS storage module.

Example API:

isOpfsAvailable()

readJsonFile(path)

writeJsonFile(path, data)

deleteFile(path)

listFiles(path)

Use:

navigator.storage.getDirectory()

as the entry point.

---

## Suggested file layout

workspace.json

collections/
  collection-id.json

sources/
  source-id.json

---

## Workspace persistence

Persist:

- selected source
- selected collection
- collection draft
- UI context if useful

Never persist:

- GitHub PAT
- OAuth tokens
- passwords

---

## Startup restore behavior

On app start:

1. check OPFS availability
2. load workspace.json
3. restore selected source
4. restore collection draft
5. restore safe source config

If credentials are missing:

- mark source as "needs reconnect"

---

## Collector UI additions

Add simple actions:

Save locally

Restore draft

Discard draft

Optional:

Autosave indicator

Last saved timestamp

---

## Publishing rules

Publishing must remain separate from OPFS.

Publishing should:

- use current draft state
- send to storage provider (GitHub, S3, etc)
- report success or failure

OPFS remains the local working layer.

---

## Fallback behavior

If OPFS is unavailable:

- disable local draft persistence
- show notice:

"Local draft storage not available in this browser"

App must continue working.

---

## Implementation steps

1. inspect current Collector state model
2. implement OPFS storage module
3. define file layout
4. persist workspace and drafts
5. restore on startup
6. add UI save/restore actions
7. ensure secrets are never stored
8. update docs

---

## Optional enhancements

If easy:

- autosave drafts
- draft dirty state
- export draft JSON
- show last saved timestamp

---

## Documentation updates

Explain:

- Collector uses OPFS for local drafts
- Publishing still uses remote storage
- Secrets are not stored locally
- Browser support limitations

---

## Acceptance criteria

1. Collector saves workspace state to OPFS
2. drafts survive reload
3. non‑secret config restored
4. secrets never stored
5. publishing remains separate
6. graceful fallback if OPFS unavailable
