Refactor the file:

src/apps/manager/src/app.js

into a modular architecture while preserving ALL functionality.

The current file is too large and mixes:
- UI rendering
- app state
- provider logic
- OPFS storage
- manifest generation
- dialogs
- asset ingestion

The goal is to split the code into logical modules while keeping the main
OpenCollectionsManagerElement as the orchestrator.

IMPORTANT RULES

Do NOT change behavior.

Do NOT change the header architecture.

Do NOT change collections.json loading logic.

Do NOT change collection management behavior.

Do NOT change provider logic.

Do NOT change OPFS draft logic.

Do NOT introduce frameworks.

Use ES modules only.

The final app must behave exactly the same.

---

TARGET ARCHITECTURE

Refactor into the following structure:

src/apps/manager/src/

app.js

components/
manager-header.js
collection-browser.js
metadata-editor.js

render/
render-shell.js
render-assets.js
render-editor.js
render-viewer.js
render-source-ui.js

services/
manifest-service.js
collection-service.js
asset-service.js
draft-service.js

state/
initial-state.js

utils/
id-utils.js
path-utils.js

---

STEP 1 — Extract initial state

Create:

state/initial-state.js

Move the initial state object from the constructor into:

export function createInitialState()

Return the current state structure exactly as it exists.

Then in app.js:

this.state = createInitialState()

---

STEP 2 — Extract utilities

Create:

utils/id-utils.js

Move:

makeSourceId()
toWorkspaceItemId()

Export them.

---

Create:

utils/path-utils.js

Move:

slugifySegment()
hostNameFromPath()
normalizeCollectionRootPath()
joinCollectionRootPath()

Export them.

---

STEP 3 — Extract rendering shell

Create:

render/render-shell.js

Move:

renderShell()

Export:

export function renderShell(shadowRoot)

The function should receive the shadowRoot and inject the HTML.

In app.js replace:

this.renderShell()

with

renderShell(this.shadow)

---

STEP 4 — Extract asset rendering

Create:

render/render-assets.js

Move:

renderAssets()
createPreviewNode()
requiredFieldScore()

Export:

export function renderAssets(component)

Where component is the manager instance.

Replace calls in app.js with:

renderAssets(this)

---

STEP 5 — Extract editor rendering

Create:

render/render-editor.js

Move:

renderEditor()
renderMetadataMode()

Export:

export function renderEditor(component)

---

STEP 6 — Extract viewer rendering

Create:

render/render-viewer.js

Move:

renderViewer()
openViewer()
closeViewer()

Export functions and call them from the manager.

---

STEP 7 — Extract source UI logic

Create:

render/render-source-ui.js

Move:

renderSourcesList()
renderSourceFilter()
renderCollectionFilter()
renderSourcePicker()
renderSourceContext()

Export them.

---

STEP 8 — Extract asset ingestion logic

Create:

services/asset-service.js

Move:

ingestImageFiles()
generateThumbnailBlob()
rememberLocalAssetFiles()
loadLocalAssetBlob()
rehydrateLocalDraftAssetUrls()

Export them.

They should receive the manager instance as argument.

Example:

export async function ingestImageFiles(manager, files)

---

STEP 9 — Extract collection logic

Create:

services/collection-service.js

Move:

createNewCollectionDraft()
ensureUniqueCollectionId()
collectionIdExists()
buildInitialCollectionManifest()
openCollectionView()
leaveCollectionView()
saveSelectedCollectionMetadata()

---

STEP 10 — Extract manifest logic

Create:

services/manifest-service.js

Move:

generateManifest()
buildManifestFromState()
toManifestItem()
copyManifestToClipboard()
downloadManifest()

---

STEP 11 — Extract draft storage

Create:

services/draft-service.js

Move:

initializeLocalDraftState()
saveLocalDraft()
restoreLocalDraft()
discardLocalDraft()
persistWorkspaceToOpfs()
persistSourcesToOpfs()
loadRememberedSourcesFromOpfs()

---

STEP 12 — Keep providers and OPFS in app.js

Leave these in app.js:

providerFactories
providerCatalog
provider connection logic
publishActiveSourceDraft

These belong to the main orchestrator.

---

STEP 13 — Update imports

Update app.js imports:

import { createInitialState } from './state/initial-state.js'

import { renderShell } from './render/render-shell.js'
import { renderAssets } from './render/render-assets.js'
import { renderEditor } from './render/render-editor.js'
import { renderViewer } from './render/render-viewer.js'
import { renderSourceUI } from './render/render-source-ui.js'

import * as AssetService from './services/asset-service.js'
import * as CollectionService from './services/collection-service.js'
import * as ManifestService from './services/manifest-service.js'
import * as DraftService from './services/draft-service.js'

import * as IdUtils from './utils/id-utils.js'
import * as PathUtils from './utils/path-utils.js'

---

STEP 14 — Keep the main class

The main file should still export:

class OpenCollectionsManagerElement extends HTMLElement

This class remains the orchestrator and calls the modules.

---

STEP 15 — Ensure build still works

After refactor:

- app compiles
- manager loads
- collections UI works
- metadata editor works
- mobile overlay works
- host manager works
- publishing works

---

EXPECTED RESULT

app.js shrinks from ~4000 lines to ~900–1200 lines.

Modules become easier to maintain.

Future features like:

collection registry
WordPress plugin
collection browser component

can reuse these modules.

---

Do not remove any functionality.

Refactor only.