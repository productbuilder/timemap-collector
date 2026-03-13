import { configuratorHeaderStyles } from '../css/header.css.js';

const WORKSPACE_LABELS = {
  general: 'General',
  products: 'Products',
  materials: 'Materials',
};

class OpenConfiguratorHeaderElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      activeWorkspace: 'general',
      organizations: [{ id: 'org-default', label: 'Default organization' }],
      currentOrganizationId: 'org-default',
      statusText: '',
    };
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.applyModel();
  }

  bindEvents() {
    this.shadowRoot.querySelectorAll('[data-workspace-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const workspace = button.getAttribute('data-workspace-id') || 'general';
        this.dispatch('workspace-select', { workspace });
      });
    });

    this.shadowRoot.getElementById('organizationSelect')?.addEventListener('change', (event) => {
      const organizationId = event.target?.value || '';
      if (organizationId) {
        this.dispatch('organization-select', { organizationId });
      }
    });
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  setState(nextState = {}) {
    this.model = { ...this.model, ...nextState };
    this.render();
    this.bindEvents();
    this.applyModel();
  }

  applyModel() {
    const select = this.shadowRoot.getElementById('organizationSelect');
    this.shadowRoot.querySelectorAll('[data-workspace-id]').forEach((button) => {
      const workspace = button.getAttribute('data-workspace-id');
      button.classList.toggle('is-active', workspace === this.model.activeWorkspace);
    });

    if (select) {
      select.value = this.model.currentOrganizationId || '';
    }
  }

  render() {
    const organizations = Array.isArray(this.model.organizations) ? this.model.organizations : [];
    const orgOptions = organizations.map((org) => `
      <option value="${org.id}">${org.label}</option>
    `).join('');

    const workspaceTabs = Object.entries(WORKSPACE_LABELS).map(([id, label]) => `
      <button class="tab-btn ${this.model.activeWorkspace === id ? 'is-active' : ''}" type="button" data-workspace-id="${id}">
        ${label}
      </button>
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>${configuratorHeaderStyles}</style>
      <header class="topbar">
        <div class="left-stack">
          <div class="title-row">
            <h1 class="title">Configurator Package Manager</h1>
            <div class="workspace-tabs" role="tablist" aria-label="Workspaces">
              ${workspaceTabs}
            </div>
          </div>
        </div>
        <div class="right-stack">
          <label class="org-label" for="organizationSelect">Organization</label>
          <select id="organizationSelect" class="org-select" aria-label="Select organization">
            ${orgOptions}
          </select>
        </div>
      </header>
    `;
  }
}

if (!customElements.get('open-configurator-header')) {
  customElements.define('open-configurator-header', OpenConfiguratorHeaderElement);
}

export { OpenConfiguratorHeaderElement };
