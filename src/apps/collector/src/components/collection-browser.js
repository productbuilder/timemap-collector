import { browserStyles } from '../css/browser.css.js';

class OpenCollectionsBrowserElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      currentLevel: 'collections',
      viewportTitle: 'Collections',
      assetCountText: 'No assets loaded.',
      sourceOptions: [{ value: 'all', label: 'All hosts' }],
      sourceFilterValue: 'all',
      collectionOptions: [{ value: 'all', label: 'All collections' }],
      collectionFilterValue: 'all',
      collections: [],
      items: [],
      selectedCollectionId: null,
      selectedItemId: null,
      dropTargetActive: false,
    };
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.renderFrame();
    this.renderGrid();
    this.setDropTargetActive(this.model.dropTargetActive);
  }

  bindEvents() {
    this.shadowRoot.getElementById('backToCollectionsBtn')?.addEventListener('click', () => {
      this.dispatch('back-to-collections');
    });

    this.shadowRoot.getElementById('sourceFilter')?.addEventListener('change', (event) => {
      this.dispatch('source-filter-change', { value: event.target.value || 'all' });
    });

    this.shadowRoot.getElementById('collectionFilter')?.addEventListener('change', (event) => {
      this.dispatch('collection-filter-change', { value: event.target.value || 'all' });
    });

    this.shadowRoot.getElementById('addImagesBtn')?.addEventListener('click', () => {
      if (this.model.currentLevel === 'collections') {
        this.dispatch('add-collection');
        return;
      }
      this.dispatch('add-item');
      this.shadowRoot.getElementById('imageFileInput')?.click();
    });

    this.shadowRoot.getElementById('imageFileInput')?.addEventListener('change', (event) => {
      const files = Array.from(event.target?.files || []);
      if (files.length > 0) {
        this.dispatch('files-selected', { files });
      }
      event.target.value = '';
    });

    const assetWrap = this.shadowRoot.getElementById('assetWrap');
    assetWrap?.addEventListener('dragenter', (event) => {
      event.preventDefault();
      this.dispatch('drop-target-change', { active: true });
    });
    assetWrap?.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dispatch('drop-target-change', { active: true });
    });
    assetWrap?.addEventListener('dragleave', (event) => {
      event.preventDefault();
      if (!event.relatedTarget || !assetWrap.contains(event.relatedTarget)) {
        this.dispatch('drop-target-change', { active: false });
      }
    });
    assetWrap?.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dispatch('drop-target-change', { active: false });
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length > 0) {
        this.dispatch('files-selected', { files });
      }
    });
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  setSourceOptions(options, selectedValue = 'all') {
    this.model.sourceOptions = Array.isArray(options) ? options : [];
    this.model.sourceFilterValue = selectedValue || 'all';
    this.renderFilters();
  }

  setCollectionOptions(options, selectedValue = 'all') {
    this.model.collectionOptions = Array.isArray(options) ? options : [];
    this.model.collectionFilterValue = selectedValue || 'all';
    this.renderFilters();
  }

  setDropTargetActive(active) {
    this.model.dropTargetActive = Boolean(active);
    const overlay = this.shadowRoot?.getElementById('assetDropOverlay');
    if (overlay) {
      overlay.classList.toggle('is-active', this.model.dropTargetActive);
    }
  }

  update(data = {}) {
    this.model = {
      ...this.model,
      ...data,
    };
    if (!this.shadowRoot?.getElementById('viewportTitle')) {
      return;
    }
    this.renderFrame();
    this.renderGrid();
    this.setDropTargetActive(this.model.dropTargetActive);
  }

  requiredFieldScore(item) {
    const checks = [
      Boolean(item.id),
      Boolean(item.title),
      Boolean(item.media && item.media.url),
      Boolean(item.license),
    ];
    return `${checks.filter(Boolean).length}/${checks.length}`;
  }

  createPreviewNode(item) {
    const mediaType = (item.media?.type || '').toLowerCase();
    const url = item.thumbnailPreviewUrl || item.previewUrl || item.media?.thumbnailUrl || item.media?.url;

    if (!url) {
      const placeholder = document.createElement('div');
      placeholder.className = 'thumb-placeholder';
      placeholder.textContent = 'No preview';
      return placeholder;
    }

    if (mediaType.includes('video')) {
      const video = document.createElement('video');
      video.className = 'thumb';
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      return video;
    }

    const image = document.createElement('img');
    image.className = 'thumb';
    image.src = url;
    image.alt = item.title || item.id;
    return image;
  }

  renderFilters() {
    const sourceFilter = this.shadowRoot?.getElementById('sourceFilter');
    const collectionFilter = this.shadowRoot?.getElementById('collectionFilter');
    if (!sourceFilter || !collectionFilter) {
      return;
    }

    sourceFilter.innerHTML = '';
    for (const optionData of this.model.sourceOptions) {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      sourceFilter.appendChild(option);
    }
    sourceFilter.value = this.model.sourceFilterValue || 'all';

    collectionFilter.innerHTML = '';
    for (const optionData of this.model.collectionOptions) {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      collectionFilter.appendChild(option);
    }
    collectionFilter.value = this.model.collectionFilterValue || 'all';
  }

  renderFrame() {
    const title = this.shadowRoot.getElementById('viewportTitle');
    const backBtn = this.shadowRoot.getElementById('backToCollectionsBtn');
    const addBtn = this.shadowRoot.getElementById('addImagesBtn');
    const count = this.shadowRoot.getElementById('assetCount');
    if (!title || !backBtn || !addBtn || !count) {
      return;
    }

    title.textContent = this.model.viewportTitle || 'Collections';
    count.textContent = this.model.assetCountText || 'No assets loaded.';
    addBtn.textContent = this.model.currentLevel === 'collections' ? 'Add collection' : 'Add item';
    backBtn.classList.toggle('is-hidden', this.model.currentLevel === 'collections');

    this.renderFilters();
  }

  renderGrid() {
    const grid = this.shadowRoot.getElementById('assetGrid');
    if (!grid) {
      return;
    }
    grid.innerHTML = '';

    if (this.model.currentLevel === 'collections') {
      const collections = Array.isArray(this.model.collections) ? this.model.collections : [];
      if (collections.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No collections yet. Add a collection to begin.';
        grid.appendChild(empty);
        return;
      }

      for (const collection of collections) {
        const card = document.createElement('article');
        card.className = 'asset-card';
        if (this.model.selectedCollectionId === collection.id) {
          card.classList.add('is-selected');
        }
        card.addEventListener('click', () => {
          this.dispatch('collection-select', { collectionId: collection.id });
        });

        const title = document.createElement('p');
        title.className = 'card-title';
        title.textContent = collection.title || collection.id;

        const badges = document.createElement('div');
        badges.className = 'badge-row';
        const idBadge = document.createElement('span');
        idBadge.className = 'badge';
        idBadge.textContent = collection.id;
        badges.appendChild(idBadge);

        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'btn';
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          this.dispatch('collection-open', { collectionId: collection.id });
        });
        actions.appendChild(openBtn);

        card.append(title, badges, actions);
        grid.appendChild(card);
      }
      return;
    }

    const items = Array.isArray(this.model.items) ? this.model.items : [];
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'This collection has no items yet. Add item to begin.';
      grid.appendChild(empty);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'asset-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Select item ${item.title || item.id}`);
      if (this.model.selectedItemId === item.workspaceId) {
        card.classList.add('is-selected');
      }
      card.addEventListener('click', () => {
        this.dispatch('item-select', { workspaceId: item.workspaceId });
      });

      const preview = this.createPreviewNode(item);
      const title = document.createElement('p');
      title.className = 'card-title';
      title.textContent = item.title || '(Untitled)';

      const badges = document.createElement('div');
      badges.className = 'badge-row';
      const completeness = document.createElement('span');
      completeness.className = 'badge';
      completeness.textContent = `Completeness ${this.requiredFieldScore(item)}`;
      badges.append(completeness);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn';
      openBtn.textContent = 'View';
      openBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.dispatch('item-view', { workspaceId: item.workspaceId });
      });
      actions.append(openBtn);
      card.append(preview, title, badges, actions);
      grid.appendChild(card);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${browserStyles}</style>

      <section class="panel viewport-panel" aria-label="Collection browser">
        <div class="panel-header">
          <h2 id="viewportTitle" class="panel-title">Collections</h2>
          <div class="panel-header-meta">
            <button class="btn is-hidden" id="backToCollectionsBtn" type="button">Back</button>
            <div class="viewport-actions">
              <button class="btn" id="addImagesBtn" type="button">Add item</button>
              <input id="imageFileInput" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple hidden />
            </div>
            <select id="sourceFilter" class="source-filter" aria-label="Filter assets by source"></select>
            <select id="collectionFilter" class="source-filter" aria-label="Choose active collection"></select>
            <p id="assetCount" class="panel-subtext">No assets loaded.</p>
          </div>
        </div>
        <div id="assetWrap" class="asset-wrap">
          <div id="assetDropOverlay" class="drop-overlay">Drop image files to add them to this collection draft</div>
          <div id="assetGrid" class="asset-grid"></div>
        </div>
      </section>
    `;
  }
}

if (!customElements.get('open-collections-browser')) {
  customElements.define('open-collections-browser', OpenCollectionsBrowserElement);
}

export { OpenCollectionsBrowserElement };
