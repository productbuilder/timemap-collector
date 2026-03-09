import { ComponentBase, normalizeCollection } from '../../../library/core/src/index.js';

class TimemapBrowserElement extends ComponentBase {
  constructor() {
    super();
    this.state = {
      collection: null,
      selectedId: null,
      viewerId: null,
    };
    this.shadow = this.attachShadow({ mode: 'open' });
    this.renderShell();
    this.cacheDom();
  }

  connectedCallback() {
    this.bindEvents();
    this.setStatus('Load a collection manifest to browse.', 'neutral');
    this.renderGrid();
    this.renderDetail();
  }

  renderShell() {
    this.shadow.innerHTML = `
      <style>
        :host { display:block; font-family: "Segoe UI", Tahoma, sans-serif; color:#111827; }
        * { box-sizing: border-box; }
        .shell { min-height: min(100dvh, 100vh); display:grid; grid-template-rows:auto 1fr; background:#f3f5f8; }
        .topbar { padding:0.8rem 1rem; border-bottom:1px solid #e2e8f0; background:#fff; display:grid; gap:0.55rem; }
        .title { margin:0; font-size:1rem; }
        .status { margin:0; font-size:0.85rem; color:#64748b; }
        .controls { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:0.5rem; }
        input { width:100%; font:inherit; border:1px solid #cbd5e1; border-radius:8px; padding:0.45rem 0.55rem; }
        .btn { border:1px solid #0f6cc6; background:#0f6cc6; color:#fff; border-radius:8px; padding:0.42rem 0.7rem; font:inherit; font-size:0.88rem; font-weight:600; cursor:pointer; }
        .content { padding:0.95rem; display:grid; gap:0.95rem; grid-template-columns:minmax(0,1fr) 320px; min-height:0; }
        .panel { background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; min-height:0; }
        .panel-header { padding:0.75rem 0.9rem; border-bottom:1px solid #e2e8f0; }
        .panel-title { margin:0; font-size:0.9rem; }
        .panel-body { padding:0.85rem; overflow:auto; min-height:0; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:0.65rem; }
        .card { border:1px solid #dbe3ec; border-radius:8px; padding:0.5rem; display:grid; gap:0.45rem; cursor:pointer; background:#fff; }
        .card.is-selected { border-color:#0f6cc6; box-shadow:0 0 0 1px #66a6e8 inset; background:#f5faff; }
        .thumb { width:100%; height:120px; border-radius:7px; object-fit:cover; border:1px solid #dbe3ec; background:#eef2f7; }
        .meta { margin:0; font-size:0.82rem; color:#475569; }
        .empty { border:1px dashed #cbd5e1; border-radius:8px; padding:1rem; text-align:center; color:#64748b; background:#f8fafc; }
        dialog { width:min(980px,96vw); border:1px solid #dbe3ec; border-radius:12px; padding:0; }
        dialog::backdrop { background: rgba(15,23,42,0.45); }
        .dialog-shell { display:grid; grid-template-rows:auto 1fr; max-height:min(85vh,760px); }
        .dialog-header { padding:0.75rem 0.9rem; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
        .dialog-body { padding:0.85rem; overflow:auto; }
        .viewer-media { width:100%; max-height:64vh; border-radius:8px; border:1px solid #dbe3ec; background:#f8fafc; }
        @media (max-width:1080px) { .content { grid-template-columns:minmax(0,1fr); } }
      </style>
      <div class="shell">
        <header class="topbar">
          <h1 class="title">TimeMap Browser</h1>
          <p id="statusText" class="status">Load a collection manifest to browse.</p>
          <div class="controls">
            <input id="manifestUrlInput" type="text" placeholder="https://example.org/collection.json" />
            <button id="loadBtn" class="btn" type="button">Load collection</button>
          </div>
        </header>
        <div class="content">
          <section class="panel">
            <div class="panel-header"><h2 class="panel-title">Collection items</h2></div>
            <div class="panel-body"><div id="grid" class="grid"></div></div>
          </section>
          <aside class="panel">
            <div class="panel-header"><h2 class="panel-title">Metadata (read-only)</h2></div>
            <div id="detail" class="panel-body"></div>
          </aside>
        </div>
      </div>
      <dialog id="viewerDialog" aria-label="Media viewer">
        <div class="dialog-shell">
          <div class="dialog-header">
            <h2 id="viewerTitle" class="panel-title">Viewer</h2>
            <button id="closeViewerBtn" type="button">Close</button>
          </div>
          <div id="viewerBody" class="dialog-body"></div>
        </div>
      </dialog>
    `;
  }

  cacheDom() {
    const root = this.shadow;
    this.dom = {
      statusText: root.getElementById('statusText'),
      manifestUrlInput: root.getElementById('manifestUrlInput'),
      loadBtn: root.getElementById('loadBtn'),
      grid: root.getElementById('grid'),
      detail: root.getElementById('detail'),
      viewerDialog: root.getElementById('viewerDialog'),
      viewerTitle: root.getElementById('viewerTitle'),
      viewerBody: root.getElementById('viewerBody'),
      closeViewerBtn: root.getElementById('closeViewerBtn'),
    };
  }

  bindEvents() {
    if (this._eventsBound) {
      return;
    }
    this._eventsBound = true;
    this.dom.loadBtn.addEventListener('click', async () => {
      await this.loadCollection();
    });
    this.dom.closeViewerBtn.addEventListener('click', () => {
      this.closeDialog(this.dom.viewerDialog);
    });
  }

  setStatus(text, tone = 'neutral') {
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    this.dom.statusText.textContent = text;
    this.dom.statusText.style.color = colors[tone] || colors.neutral;
  }

  async loadCollection() {
    const manifestUrl = this.dom.manifestUrlInput.value.trim();
    if (!manifestUrl) {
      this.setStatus('Enter a manifest URL.', 'warn');
      return;
    }

    this.setStatus('Loading collection...', 'neutral');
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        this.setStatus(`Could not load manifest (${response.status}).`, 'warn');
        return;
      }
      const json = await response.json();
      this.state.collection = normalizeCollection(json);
      this.state.selectedId = this.state.collection.items[0]?.id || null;
      this.setStatus(`Loaded ${this.state.collection.title} (${this.state.collection.items.length} items).`, 'ok');
      this.renderGrid();
      this.renderDetail();
    } catch (error) {
      this.setStatus(`Load failed: ${error.message}`, 'warn');
    }
  }

  renderGrid() {
    this.dom.grid.innerHTML = '';
    const items = this.state.collection?.items || [];
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items loaded.';
      this.dom.grid.appendChild(empty);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'card';
      if (this.state.selectedId === item.id) {
        card.classList.add('is-selected');
      }
      card.addEventListener('click', () => {
        this.state.selectedId = item.id;
        this.renderGrid();
        this.renderDetail();
      });
      card.addEventListener('dblclick', () => {
        this.openViewer(item.id);
      });

      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = item.media.thumbnailUrl || item.media.url || '';
      thumb.alt = item.title || item.id;

      const title = document.createElement('strong');
      title.textContent = item.title || item.id;

      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = item.license ? `License: ${item.license}` : 'License not set';

      card.append(thumb, title, meta);
      this.dom.grid.appendChild(card);
    }
  }

  renderDetail() {
    this.dom.detail.innerHTML = '';
    const selected = (this.state.collection?.items || []).find((item) => item.id === this.state.selectedId);
    if (!selected) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Select an item to view metadata.';
      this.dom.detail.appendChild(empty);
      return;
    }

    const fields = [
      ['Title', selected.title || ''],
      ['Description', selected.description || ''],
      ['Creator', selected.creator || ''],
      ['Date', selected.date || ''],
      ['Location', selected.location || ''],
      ['License', selected.license || ''],
      ['Source', selected.source || ''],
    ];

    for (const [label, value] of fields) {
      const row = document.createElement('p');
      row.className = 'meta';
      row.innerHTML = `<strong>${label}:</strong> ${value || '-'}`;
      this.dom.detail.appendChild(row);
    }
  }

  openViewer(itemId) {
    const item = (this.state.collection?.items || []).find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    this.dom.viewerTitle.textContent = item.title || item.id;
    this.dom.viewerBody.innerHTML = '';
    const mediaType = (item.media.type || '').toLowerCase();
    if (mediaType.includes('video')) {
      const video = document.createElement('video');
      video.className = 'viewer-media';
      video.src = item.media.url;
      video.controls = true;
      this.dom.viewerBody.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.className = 'viewer-media';
      image.src = item.media.url || item.media.thumbnailUrl || '';
      image.alt = item.title || item.id;
      this.dom.viewerBody.appendChild(image);
    }
    this.openDialog(this.dom.viewerDialog);
  }
}

if (!customElements.get('timemap-browser')) {
  customElements.define('timemap-browser', TimemapBrowserElement);
}
