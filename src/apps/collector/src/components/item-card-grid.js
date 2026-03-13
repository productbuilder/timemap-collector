import { browserRendererStyles } from '../css/browser-renderers.css.js';

class OpenItemCardGridElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = { items: [], selectedItemId: null };
  }

  update(data = {}) {
    this.model = { ...this.model, ...data };
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  requiredFieldScore(item) {
    const checks = [Boolean(item.id), Boolean(item.title), Boolean(item.media && item.media.url), Boolean(item.license)];
    return `${checks.filter(Boolean).length}/${checks.length}`;
  }

  createPreviewMarkup(item) {
    const mediaType = (item.media?.type || '').toLowerCase();
    const isLocal = item.providerId === 'local';
    const url = isLocal
      ? (item.thumbnailPreviewUrl || item.previewUrl)
      : (item.thumbnailPreviewUrl || item.previewUrl || item.media?.thumbnailUrl || item.media?.url);

    if (!url) {
      return '<div class="thumb-placeholder">No preview</div>';
    }
    if (mediaType.includes('video')) {
      return `<video class="thumb" src="${url}" muted playsinline preload="metadata"></video>`;
    }
    return `<img class="thumb" src="${url}" alt="${item.title || item.id}" />`;
  }

  render() {
    const items = Array.isArray(this.model.items) ? this.model.items : [];
    if (items.length === 0) {
      this.shadowRoot.innerHTML = `<style>${browserRendererStyles}</style><div class="empty">This collection has no items yet. Add item to begin.</div>`;
      return;
    }

    const cards = items.map((item) => `
      <article class="asset-card ${this.model.selectedItemId === item.workspaceId ? 'is-selected' : ''}" role="button" tabindex="0" data-id="${item.workspaceId}">
        ${this.createPreviewMarkup(item)}
        <p class="card-title">${item.title || '(Untitled)'}</p>
        <div class="badge-row"><span class="badge">Completeness ${this.requiredFieldScore(item)}</span></div>
        <div class="card-actions"><button type="button" class="btn" data-open-id="${item.workspaceId}">View</button></div>
      </article>
    `).join('');

    this.shadowRoot.innerHTML = `<style>${browserRendererStyles}</style><div class="asset-grid">${cards}</div>`;

    this.shadowRoot.querySelectorAll('.asset-card[data-id]').forEach((card) => {
      card.addEventListener('click', () => {
        this.dispatch('item-select', { workspaceId: card.getAttribute('data-id') });
      });
    });
    this.shadowRoot.querySelectorAll('button[data-open-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.dispatch('item-view', { workspaceId: button.getAttribute('data-open-id') });
      });
    });
  }
}

if (!customElements.get('open-item-card-grid')) {
  customElements.define('open-item-card-grid', OpenItemCardGridElement);
}

export { OpenItemCardGridElement };
