import { shellStyles } from '../css/shell.css.js';

export function renderShell(shadowRoot) {
  shadowRoot.innerHTML = `
    <style>${shellStyles}</style>

    <div class="app-shell">
      <open-collections-header id="managerHeader"></open-collections-header>

      <div class="content-grid">
        <open-collections-browser id="collectionBrowser"></open-collections-browser>
        <open-collections-metadata id="metadataEditor"></open-collections-metadata>
      </div>
    </div>

    <dialog id="providerDialog" aria-label="Add host">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Add host</h2>
          <button class="btn" data-close="providerDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <open-collections-source-manager id="sourceManager"></open-collections-source-manager>
        </div>
      </div>
    </dialog>



    <dialog id="hostMenuDialog" aria-label="Host options">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Host</h2>
          <button class="btn" data-close="hostMenuDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <div class="dialog-actions">
            <button class="btn" id="openSourcePickerFromHostBtn" type="button">Switch host</button>
            <button class="btn" id="openAddHostFromHostBtn" type="button">Add host</button>
          </div>
        </div>
      </div>
    </dialog>

    <dialog id="sourcePickerDialog" aria-label="Select host">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Select host</h2>
          <button class="btn" data-close="sourcePickerDialog" type="button">Close</button>
        </div>
        <div id="sourcePickerList" class="dialog-body source-list"></div>
      </div>
    </dialog>

    <dialog id="publishDialog" aria-label="Publish collection">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Publish collection</h2>
          <button class="btn" data-close="publishDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <div class="field-row"><label for="collectionId">Collection ID</label><input id="collectionId" type="text" /></div>
          <div class="field-row"><label for="collectionTitle">Collection title</label><input id="collectionTitle" type="text" /></div>
          <div class="field-row"><label for="collectionDescription">Collection description</label><textarea id="collectionDescription"></textarea></div>
          <div class="field-row"><label for="collectionLicense">Collection license</label><input id="collectionLicense" type="text" /></div>
          <div class="field-row"><label for="collectionPublisher">Collection publisher</label><input id="collectionPublisher" type="text" /></div>
          <div class="field-row"><label for="collectionLanguage">Collection language</label><input id="collectionLanguage" type="text" /></div>
          <div class="dialog-actions">
            <button class="btn btn-primary" id="generateManifestBtn" type="button">Generate collection.json</button>
            <button class="btn btn-primary" id="publishToSourceBtn" type="button">Upload to GitHub</button>
            <button class="btn" id="copyManifestBtn" type="button">Copy</button>
            <button class="btn" id="downloadManifestBtn" type="button">Download</button>
            <button class="btn" id="saveLocalDraftBtn" type="button">Save locally</button>
            <button class="btn" id="restoreLocalDraftBtn" type="button">Restore draft</button>
            <button class="btn" id="discardLocalDraftBtn" type="button">Discard draft</button>
          </div>
          <p id="localDraftStatus" class="panel-subtext">Checking local draft storage...</p>
          <pre id="manifestPreview"></pre>
        </div>
      </div>
    </dialog>

    <dialog id="newCollectionDialog" aria-label="Create new collection">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Create new collection</h2>
          <button class="btn" data-close="newCollectionDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <div class="field-row"><label for="newCollectionTitle">Title</label><input id="newCollectionTitle" type="text" placeholder="My Collection" /></div>
          <div class="field-row"><label for="newCollectionSlug">ID / Slug</label><input id="newCollectionSlug" type="text" placeholder="my-collection" /></div>
          <div class="field-row"><label for="newCollectionDescription">Description</label><textarea id="newCollectionDescription"></textarea></div>
          <div class="field-row"><label for="newCollectionLicense">License (optional)</label><input id="newCollectionLicense" type="text" /></div>
          <div class="field-row"><label for="newCollectionPublisher">Publisher (optional)</label><input id="newCollectionPublisher" type="text" /></div>
          <div class="field-row"><label for="newCollectionLanguage">Language (optional)</label><input id="newCollectionLanguage" type="text" /></div>
          <div class="dialog-actions">
            <button class="btn btn-primary" id="createCollectionBtn" type="button">Create collection</button>
          </div>
        </div>
      </div>
    </dialog>

    <dialog id="registerDialog" aria-label="Collection registration">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Register collection</h2>
          <button class="btn" data-close="registerDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <div class="empty">
            Collection registration will be added here.
            Collection Manager will later register published collections with the registry.
          </div>
        </div>
      </div>
    </dialog>

    <dialog id="headerMenuDialog" aria-label="Header menu">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">More actions</h2>
          <button class="btn" data-close="headerMenuDialog" type="button">Close</button>
        </div>
        <div class="dialog-body">
          <div class="dialog-actions">
            <button class="btn" id="openRegisterFromMenuBtn" type="button">Register collection</button>
          </div>
        </div>
      </div>
    </dialog>

    <dialog id="storageOptionsDialog" class="storage-dialog" aria-label="Storage options guidance">
      <div class="dialog-shell">
        <div class="dialog-header">
          <h2 class="dialog-title">Storage options</h2>
          <button class="btn" data-close="storageOptionsDialog" type="button">Close</button>
        </div>
        <div class="dialog-body storage-layout">
          <section class="storage-section">
            <h3 class="storage-heading">Recommended options for open hosting</h3>
            <ul class="storage-list">
              <li><strong>GitHub</strong>: strong for public manifests, versioning, and easy Collection Manager integration.</li>
              <li><strong>Cloudflare Pages / R2</strong>: excellent static/browser delivery for JSON + media.</li>
              <li><strong>S3-compatible storage</strong>: robust long-term hosting for technical teams and institutions.</li>
              <li><strong>Static website hosting</strong>: simple and dependable for open <code>collection.json</code> publishing.</li>
            </ul>
          </section>

          <section class="storage-section">
            <h3 class="storage-heading">Provider comparison</h3>
            <div class="storage-table-wrap">
              <table class="storage-table" aria-label="Storage provider comparison">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Best use</th>
                    <th>Public hosting quality</th>
                    <th>Browser fetch compatibility</th>
                    <th>Good for media</th>
                    <th>Good for manifests</th>
                    <th>Recommended role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>GitHub <span class="storage-tag">Recommended</span></td>
                    <td>Open manifests, transparent version history</td>
                    <td>High</td>
                    <td>High</td>
                    <td>Medium</td>
                    <td>High</td>
                    <td>Primary hosting</td>
                  </tr>
                  <tr>
                    <td>Cloudflare Pages / R2 <span class="storage-tag">Recommended</span></td>
                    <td>Public static delivery and scalable media hosting</td>
                    <td>High</td>
                    <td>High</td>
                    <td>High</td>
                    <td>High</td>
                    <td>Primary hosting</td>
                  </tr>
                  <tr>
                    <td>S3-compatible storage <span class="storage-tag">Recommended</span></td>
                    <td>Institutional and technical storage workflows</td>
                    <td>High</td>
                    <td>High</td>
                    <td>High</td>
                    <td>High</td>
                    <td>Primary hosting</td>
                  </tr>
                  <tr>
                    <td>Static website hosting <span class="storage-tag">Recommended</span></td>
                    <td>Simple public hosting for JSON and media files</td>
                    <td>High</td>
                    <td>High</td>
                    <td>Medium</td>
                    <td>High</td>
                    <td>Primary hosting</td>
                  </tr>
                  <tr>
                    <td>Google Drive</td>
                    <td>Collaboration and import source for existing files</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Good source</td>
                  </tr>
                  <tr>
                    <td>OneDrive</td>
                    <td>Internal collaboration and source ingestion</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Good source</td>
                  </tr>
                  <tr>
                    <td>Dropbox</td>
                    <td>Team file sharing and temporary data exchange</td>
                    <td>Low to medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Medium</td>
                    <td>Import only</td>
                  </tr>
                  <tr>
                    <td>Internet Archive</td>
                    <td>Long-term public archival distribution</td>
                    <td>High</td>
                    <td>Medium</td>
                    <td>High</td>
                    <td>Medium</td>
                    <td>Specialized archive</td>
                  </tr>
                  <tr>
                    <td>Wikimedia Commons</td>
                    <td>Open media publication under supported licenses</td>
                    <td>High</td>
                    <td>Medium</td>
                    <td>High</td>
                    <td>Low to medium</td>
                    <td>Specialized archive</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="storage-section">
            <h3 class="storage-heading">Cloud drives in browser-first workflows</h3>
            <p class="panel-subtext">Google Drive, OneDrive, and Dropbox are useful source systems, but they are usually weaker as final public hosting for browser-first manifest delivery.</p>
            <p class="panel-subtext">Use them for collaboration/import, then publish to GitHub, Cloudflare, S3-compatible storage, or static hosting for stable public access.</p>
          </section>

          <section class="storage-section">
            <h3 class="storage-heading">Quick recommendations by scenario</h3>
            <ul class="storage-list">
              <li><strong>Small heritage organizations</strong> -> GitHub</li>
              <li><strong>Technical teams or institutions</strong> -> S3-compatible storage or Cloudflare R2</li>
              <li><strong>Files already in Google Drive or OneDrive</strong> -> import from drive, then publish to stronger public hosting</li>
              <li><strong>Archival public preservation</strong> -> Internet Archive or Wikimedia Commons where appropriate</li>
            </ul>
          </section>

          <p class="panel-subtext">
            Learn more: <a href="/docs/storage-options">/docs/storage-options</a> (placeholder; full guide TBD).
          </p>
        </div>
      </div>
    </dialog>

    <open-collections-asset-viewer id="assetViewer"></open-collections-asset-viewer>
  `;
}
