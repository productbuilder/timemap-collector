import { metadataStyles } from '../css/metadata.css.js';

class OpenCollectionsMetadataElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      mode: 'none',
      contextText: 'Select a collection or item.',
      collection: null,
      item: null,
      canSaveItem: false,
      mobileOpen: false,
    };
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.applyView();
    this.setMobileOpen(this.model.mobileOpen);
  }

  bindEvents() {
    this.shadowRoot.getElementById('closeEditorBtn')?.addEventListener('click', () => {
      this.dispatch('close-editor');
    });

    this.shadowRoot.getElementById('saveCollectionBtn')?.addEventListener('click', () => {
      this.dispatch('save-collection', { patch: this.getCollectionPatch() });
    });

    this.shadowRoot.getElementById('saveItemBtn')?.addEventListener('click', () => {
      this.dispatch('save-item', { patch: this.getItemPatch() });
    });
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  setMobileOpen(open) {
    this.model.mobileOpen = Boolean(open);
    const panel = this.shadowRoot?.querySelector('.editor-panel');
    if (panel) {
      panel.classList.toggle('is-mobile-editor-open', this.model.mobileOpen);
    }
  }

  setView(data = {}) {
    this.model = {
      ...this.model,
      ...data,
    };
    this.applyView();
  }

  getCollectionPatch() {
    return {
      title: this.shadowRoot.getElementById('collectionEditorTitle')?.value.trim() || '',
      description: this.shadowRoot.getElementById('collectionEditorDescription')?.value.trim() || '',
      license: this.shadowRoot.getElementById('collectionEditorLicense')?.value.trim() || '',
      publisher: this.shadowRoot.getElementById('collectionEditorPublisher')?.value.trim() || '',
      language: this.shadowRoot.getElementById('collectionEditorLanguage')?.value.trim() || '',
    };
  }

  tagsToArray(rawValue) {
    return String(rawValue || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  getItemPatch() {
    return {
      title: this.shadowRoot.getElementById('itemTitle')?.value.trim() || '',
      description: this.shadowRoot.getElementById('itemDescription')?.value.trim() || '',
      creator: this.shadowRoot.getElementById('itemCreator')?.value.trim() || '',
      date: this.shadowRoot.getElementById('itemDate')?.value.trim() || '',
      location: this.shadowRoot.getElementById('itemLocation')?.value.trim() || '',
      license: this.shadowRoot.getElementById('itemLicense')?.value.trim() || '',
      attribution: this.shadowRoot.getElementById('itemAttribution')?.value.trim() || '',
      source: this.shadowRoot.getElementById('itemSource')?.value.trim() || '',
      tags: this.tagsToArray(this.shadowRoot.getElementById('itemTags')?.value || ''),
      include: Boolean(this.shadowRoot.getElementById('itemInclude')?.checked),
      media: {
        type: this.shadowRoot.getElementById('itemType')?.value.trim() || '',
      },
    };
  }

  applyView() {
    const mode = this.model.mode || 'none';
    const title = this.shadowRoot?.getElementById('editorTitle');
    const context = this.shadowRoot?.getElementById('editorContext');
    const empty = this.shadowRoot?.getElementById('editorEmpty');
    const collectionForm = this.shadowRoot?.getElementById('collectionEditorForm');
    const itemForm = this.shadowRoot?.getElementById('editorForm');

    if (!title || !context || !empty || !collectionForm || !itemForm) {
      return;
    }

    // Enforce mutually exclusive editor states.
    empty.hidden = true;
    collectionForm.hidden = true;
    itemForm.hidden = true;

    if (mode === 'collection') {
      const selected = this.model.collection || null;
      title.textContent = 'Collection metadata';
      if (!selected) {
        context.textContent = 'Select a collection.';
        empty.hidden = false;
        return;
      }

      collectionForm.hidden = false;
      context.textContent = selected.id || '';
      this.shadowRoot.getElementById('collectionEditorTitle').value = selected.title || '';
      this.shadowRoot.getElementById('collectionEditorDescription').value = selected.description || '';
      this.shadowRoot.getElementById('collectionEditorLicense').value = selected.license || '';
      this.shadowRoot.getElementById('collectionEditorPublisher').value = selected.publisher || '';
      this.shadowRoot.getElementById('collectionEditorLanguage').value = selected.language || '';
      return;
    }

    if (mode === 'item') {
      const selected = this.model.item || null;
      title.textContent = 'Item metadata';
      if (!selected) {
        context.textContent = 'Select an item.';
        empty.hidden = false;
        return;
      }

      itemForm.hidden = false;
      context.textContent = this.model.canSaveItem
        ? `${selected.id} - ${selected.sourceDisplayLabel || selected.sourceLabel}`
        : `${selected.id} - ${selected.sourceDisplayLabel || selected.sourceLabel} (local edits)`;

      this.shadowRoot.getElementById('itemTitle').value = selected.title || '';
      this.shadowRoot.getElementById('itemDescription').value = selected.description || '';
      this.shadowRoot.getElementById('itemType').value = selected.media?.type || '';
      this.shadowRoot.getElementById('itemCreator').value = selected.creator || '';
      this.shadowRoot.getElementById('itemDate').value = selected.date || '';
      this.shadowRoot.getElementById('itemLocation').value = selected.location || '';
      this.shadowRoot.getElementById('itemLicense').value = selected.license || '';
      this.shadowRoot.getElementById('itemAttribution').value = selected.attribution || '';
      this.shadowRoot.getElementById('itemSource').value = selected.source || '';
      this.shadowRoot.getElementById('itemTags').value = Array.isArray(selected.tags) ? selected.tags.join(', ') : '';
      this.shadowRoot.getElementById('itemInclude').checked = selected.include !== false;
      this.shadowRoot.getElementById('saveItemBtn').disabled = false;
      return;
    }

    title.textContent = 'Metadata editor';
    context.textContent = 'Select a collection or item.';
    empty.hidden = false;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${metadataStyles}</style>

      <aside class="panel editor-panel" aria-label="Metadata editor">
        <div class="panel-header">
          <h2 id="editorTitle" class="panel-title">Metadata editor</h2>
          <div class="editor-header-meta">
            <p id="editorContext" class="editor-context"></p>
            <button class="btn editor-close-btn" id="closeEditorBtn" type="button">Close</button>
          </div>
        </div>
        <div class="editor-content">
          <div id="editorEmpty" class="editor-wrap">
            <div class="empty">Select a card to edit metadata.</div>
          </div>
          <form id="collectionEditorForm" class="editor-wrap" hidden>
            <div class="editor-section">
              <p class="editor-section-title">Collection details</p>
              <div class="field-row"><label for="collectionEditorTitle">Title</label><input id="collectionEditorTitle" type="text" /></div>
              <div class="field-row"><label for="collectionEditorDescription">Description</label><textarea id="collectionEditorDescription"></textarea></div>
              <div class="field-row"><label for="collectionEditorLicense">License</label><input id="collectionEditorLicense" type="text" /></div>
              <div class="field-row"><label for="collectionEditorPublisher">Publisher</label><input id="collectionEditorPublisher" type="text" /></div>
              <div class="field-row"><label for="collectionEditorLanguage">Language</label><input id="collectionEditorLanguage" type="text" /></div>
            </div>
            <button class="btn btn-primary" id="saveCollectionBtn" type="button">Save collection metadata</button>
          </form>
          <form id="editorForm" class="editor-wrap" hidden>
            <div class="editor-section">
              <p class="editor-section-title">Basic</p>
              <div class="field-row"><label for="itemTitle">Title</label><input id="itemTitle" type="text" /></div>
              <div class="field-row"><label for="itemDescription">Description</label><textarea id="itemDescription"></textarea></div>
              <div class="field-row"><label for="itemType">Type / Format</label><input id="itemType" type="text" /></div>
            </div>
            <div class="editor-section">
              <p class="editor-section-title">Authorship</p>
              <div class="field-row"><label for="itemCreator">Creator</label><input id="itemCreator" type="text" /></div>
              <div class="field-row"><label for="itemAttribution">Attribution</label><input id="itemAttribution" type="text" /></div>
            </div>
            <div class="editor-section">
              <p class="editor-section-title">Context</p>
              <div class="field-row"><label for="itemDate">Date / Period</label><input id="itemDate" type="text" /></div>
              <div class="field-row"><label for="itemLocation">Location</label><input id="itemLocation" type="text" /></div>
            </div>
            <div class="editor-section">
              <p class="editor-section-title">Rights</p>
              <div class="field-row"><label for="itemLicense">License</label><input id="itemLicense" type="text" /></div>
              <div class="field-row"><label for="itemSource">Source</label><input id="itemSource" type="text" /></div>
            </div>
            <div class="editor-section">
              <p class="editor-section-title">Classification</p>
              <div class="field-row"><label for="itemTags">Tags / Keywords (comma separated)</label><input id="itemTags" type="text" /></div>
            </div>
            <label class="checkbox-row" for="itemInclude"><span>Include in manifest</span><input id="itemInclude" type="checkbox" /></label>
            <button class="btn btn-primary" id="saveItemBtn" type="button">Save item metadata</button>
          </form>
        </div>
      </aside>
    `;
  }
}

if (!customElements.get('open-collections-metadata')) {
  customElements.define('open-collections-metadata', OpenCollectionsMetadataElement);
}

export { OpenCollectionsMetadataElement };
