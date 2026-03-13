import { configuratorSectionNavStyles } from '../css/section-nav.css.js';

class OpenConfiguratorSectionNavElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      domains: [],
      activeDomainId: 'manufacturer',
      sections: [],
      selectedSectionId: 'overview',
    };
  }

  connectedCallback() {
    this.render();
  }

  update(data = {}) {
    this.model = { ...this.model, ...data };
    this.render();
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    const domains = Array.isArray(this.model.domains) ? this.model.domains : [];
    const domainButtons = domains.map((domain) => {
      const isActive = domain.id === this.model.activeDomainId;
      return `
        <button class="domain-btn ${isActive ? 'is-active' : ''}" type="button" data-domain-id="${domain.id}">
          <span class="domain-name">${domain.label}</span>
          <span class="meta">
            <span class="count">${domain.loaded ? 'Loaded' : 'Missing'}</span>
            ${domain.dirty ? '<span class="warn" title="Unsaved changes">* Unsaved</span>' : ''}
          </span>
        </button>
      `;
    }).join('');

    const sections = Array.isArray(this.model.sections) ? this.model.sections : [];
    const buttons = sections.map((section) => {
      const isActive = section.id === this.model.selectedSectionId;
      const count = Number.isFinite(section.count) ? section.count : null;
      const warningCount = Number.isFinite(section.warningCount) ? section.warningCount : 0;
      return `
        <button class="nav-btn ${isActive ? 'is-active' : ''}" type="button" data-section-id="${section.id}">
          <span class="name">${section.label}</span>
          <span class="meta">
            ${count === null ? '' : `<span class="count">${count}</span>`}
            ${warningCount > 0 ? `<span class="warn" title="${warningCount} warning${warningCount === 1 ? '' : 's'}">! ${warningCount}</span>` : ''}
          </span>
        </button>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${configuratorSectionNavStyles}</style>
      <nav class="nav-wrap" aria-label="Package sections">
        <p class="nav-title">Domains</p>
        <div class="domain-grid">${domainButtons || '<div class="empty">No domains</div>'}</div>
        <p class="nav-title">Sections</p>
        ${buttons || '<div class="empty">No sections</div>'}
      </nav>
    `;

    this.shadowRoot.querySelectorAll('button[data-domain-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const domainId = button.getAttribute('data-domain-id') || 'manufacturer';
        this.dispatch('domain-select', { domainId });
      });
    });

    this.shadowRoot.querySelectorAll('button[data-section-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const sectionId = button.getAttribute('data-section-id') || 'overview';
        this.dispatch('section-select', { sectionId });
      });
    });
  }
}

if (!customElements.get('open-configurator-section-nav')) {
  customElements.define('open-configurator-section-nav', OpenConfiguratorSectionNavElement);
}

export { OpenConfiguratorSectionNavElement };
