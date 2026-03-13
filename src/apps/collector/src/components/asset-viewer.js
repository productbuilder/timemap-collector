import { viewerStyles } from '../css/viewer.css.js';

class OpenCollectionsAssetViewerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.item = null;
    this.formatSourceBadgeFn = null;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.renderItem();
  }

  bindEvents() {
    this.shadowRoot.getElementById('closeViewerBtn')?.addEventListener('click', () => {
      this.close();
    });

    this.shadowRoot.getElementById('viewerDialog')?.addEventListener('close', () => {
      this.dispatchCloseEvent();
    });

    this.shadowRoot.getElementById('viewerDialog')?.addEventListener('cancel', () => {
      this.dispatchCloseEvent();
    });
  }

  dispatchCloseEvent() {
    this.dispatchEvent(new CustomEvent('close-viewer', { bubbles: true, composed: true }));
  }

  setItem(item, formatSourceBadgeFn = null) {
    this.item = item || null;
    this.formatSourceBadgeFn = typeof formatSourceBadgeFn === 'function' ? formatSourceBadgeFn : null;
    this.renderItem();
  }

  clear() {
    this.item = null;
    this.renderItem();
  }

  open() {
    const dialog = this.shadowRoot?.getElementById('viewerDialog');
    if (!dialog || dialog.open) {
      return;
    }
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    dialog.setAttribute('open', 'open');
  }

  close() {
    const dialog = this.shadowRoot?.getElementById('viewerDialog');
    if (!dialog || !dialog.open) {
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }
    dialog.removeAttribute('open');
  }

  resolveSourceBadge(item) {
    if (!item) {
      return 'Source';
    }
    if (this.formatSourceBadgeFn) {
      return this.formatSourceBadgeFn(item);
    }
    return item.sourceDisplayLabel || item.sourceLabel || item.providerId || 'Source';
  }

  renderItem() {
    const title = this.shadowRoot?.getElementById('viewerTitle');
    const description = this.shadowRoot?.getElementById('viewerDescription');
    const badges = this.shadowRoot?.getElementById('viewerBadges');
    const media = this.shadowRoot?.getElementById('viewerMedia');
    const openOriginal = this.shadowRoot?.getElementById('viewerOpenOriginal');
    if (!title || !description || !badges || !media || !openOriginal) {
      return;
    }

    badges.innerHTML = '';
    media.innerHTML = '';

    if (!this.item) {
      title.textContent = 'Asset viewer';
      description.textContent = 'No item selected.';
      const placeholder = document.createElement('div');
      placeholder.className = 'empty';
      placeholder.textContent = 'Select an item to view its media preview.';
      media.appendChild(placeholder);
      openOriginal.removeAttribute('href');
      openOriginal.classList.add('is-hidden');
      return;
    }

    const item = this.item;
    title.textContent = item.title || item.id || 'Asset viewer';
    description.textContent = item.description || 'No description available.';

    const sourceBadge = document.createElement('span');
    sourceBadge.className = 'badge source-badge';
    sourceBadge.textContent = this.resolveSourceBadge(item);

    const typeBadge = document.createElement('span');
    typeBadge.className = 'badge';
    typeBadge.textContent = `Type: ${item.media?.type || 'unknown'}`;

    const licenseBadge = document.createElement('span');
    const hasLicense = Boolean(item.license);
    licenseBadge.className = `badge ${hasLicense ? 'ok' : 'warn'}`;
    licenseBadge.textContent = hasLicense ? `License: ${item.license}` : 'License missing';
    badges.append(sourceBadge, typeBadge, licenseBadge);

    const mediaType = (item.media?.type || '').toLowerCase();
    const isLocal = item.providerId === 'local';
    const mediaUrl = isLocal
      ? (item.previewUrl || item.thumbnailPreviewUrl || '')
      : (item.previewUrl || item.thumbnailPreviewUrl || item.media?.url || item.media?.thumbnailUrl || '');
    if (mediaUrl && mediaType.includes('image')) {
      const image = document.createElement('img');
      image.className = 'viewer-image';
      image.src = mediaUrl;
      image.alt = item.title || item.id || 'Asset image';
      media.appendChild(image);
    } else if (mediaUrl && mediaType.includes('video')) {
      const video = document.createElement('video');
      video.className = 'viewer-video';
      video.src = mediaUrl;
      video.controls = true;
      video.preload = 'metadata';
      media.appendChild(video);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'empty';
      placeholder.textContent = mediaUrl
        ? 'Large preview is not available for this media type yet.'
        : 'No media URL available for this asset.';
      media.appendChild(placeholder);
    }

    const openOriginalUrl = isLocal
      ? (item.previewUrl || item.thumbnailPreviewUrl || '')
      : (item.media?.url || mediaUrl);
    if (openOriginalUrl) {
      openOriginal.href = openOriginalUrl;
      openOriginal.classList.remove('is-hidden');
    } else {
      openOriginal.removeAttribute('href');
      openOriginal.classList.add('is-hidden');
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${viewerStyles}</style>
      <dialog id="viewerDialog" aria-label="Asset viewer">
        <div class="dialog-shell">
          <div class="dialog-header">
            <h2 id="viewerTitle" class="dialog-title">Asset viewer</h2>
            <button class="btn" id="closeViewerBtn" type="button">Close</button>
          </div>
          <div class="dialog-body">
            <div id="viewerMedia" class="viewer-media-wrap"></div>
            <div class="viewer-details">
              <p id="viewerDescription" class="viewer-text"></p>
              <div id="viewerBadges" class="badge-row"></div>
              <div class="dialog-actions">
                <a id="viewerOpenOriginal" class="btn" href="#" target="_blank" rel="noreferrer noopener">Open original</a>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    `;
  }
}

if (!customElements.get('open-collections-asset-viewer')) {
  customElements.define('open-collections-asset-viewer', OpenCollectionsAssetViewerElement);
}

export { OpenCollectionsAssetViewerElement };
