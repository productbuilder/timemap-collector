import { headerStyles } from '../css/header.css.js';

class OpenCollectionsHeaderElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._statusText = 'Not connected.';
    this._workspaceText = 'Host: none | Collection: none';
    this._hostLabel = 'Select host';
    this._statusTone = 'neutral';
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.setStatus(this._statusText, this._statusTone);
    this.setWorkspaceContext(this._workspaceText);
    this.setHostLabel(this._hostLabel);
  }

  bindEvents() {
    this.shadowRoot.getElementById('openHostManagerBtn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-host-menu', { bubbles: true, composed: true }));
    });
    this.shadowRoot.getElementById('openHeaderMenuBtn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-header-menu', { bubbles: true, composed: true }));
    });
  }

  setStatus(text, tone = 'neutral') {
    this._statusText = text;
    this._statusTone = tone;
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    const status = this.shadowRoot?.getElementById('statusText');
    if (!status) {
      return;
    }
    status.textContent = text;
    status.style.color = colors[tone] || colors.neutral;
  }

  setWorkspaceContext(text) {
    this._workspaceText = text;
    const workspace = this.shadowRoot?.getElementById('workspaceContext');
    if (workspace) {
      workspace.textContent = text;
    }
  }

  setHostLabel(text) {
    this._hostLabel = text;
    const host = this.shadowRoot?.getElementById('activeHostLabel');
    if (host) {
      host.textContent = text;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${headerStyles}</style>

      <header class="topbar">
        <div class="brand">
          <h1 class="title">Open Collections Manager</h1>
        </div>
        <div class="top-actions">
          <button class="btn" id="openHostManagerBtn" type="button">Host: <span id="activeHostLabel">Select host</span></button>
          <button class="btn" id="openHeaderMenuBtn" type="button">More</button>
        </div>
      </header>
    `;
  }
}

if (!customElements.get('open-collections-header')) {
  customElements.define('open-collections-header', OpenCollectionsHeaderElement);
}

export { OpenCollectionsHeaderElement };
