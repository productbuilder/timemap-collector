import { configuratorSectionBrowserStyles } from '../css/section-browser.css.js';
import '../../../collector/src/components/panel-shell.js';
import '../../../collector/src/components/view-toggle.js';

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function entryLabel(entry, index) {
  if (entry && typeof entry === 'object') {
    const label = String(entry.title || entry.name || entry.label || entry.id || '').trim();
    if (label) {
      return label;
    }
  }
  if (typeof entry === 'string' && entry.trim()) {
    return entry.trim();
  }
  return `Entry ${index + 1}`;
}

class OpenConfiguratorSectionBrowserElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      section: null,
      sectionValue: null,
      selectedEntryRef: null,
      showBack: false,
      showViewToggle: true,
      contextActions: [],
      overviewStats: [],
      overviewWarnings: [],
      exportPayload: null,
      viewMode: 'rows',
      sectionValidation: null,
      arrayActions: {
        canAdd: false,
        canDuplicate: false,
        canDelete: false,
        canMoveUp: false,
        canMoveDown: false,
      },
    };
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.renderContent();
  }

  bindEvents() {
    this.shadowRoot.getElementById('panelShell')?.addEventListener('panel-back', () => {
      this.dispatch('panel-back');
    });

    this.shadowRoot.getElementById('viewToggle')?.addEventListener('view-mode-change', (event) => {
      const mode = event.detail?.mode === 'cards' ? 'cards' : 'rows';
      this.dispatch('view-mode-change', { mode });
    });

    this.shadowRoot.getElementById('addEntryBtn')?.addEventListener('click', () => {
      this.dispatch('array-action', { action: 'add' });
    });
    this.shadowRoot.getElementById('duplicateEntryBtn')?.addEventListener('click', () => {
      this.dispatch('array-action', { action: 'duplicate' });
    });
    this.shadowRoot.getElementById('deleteEntryBtn')?.addEventListener('click', () => {
      this.dispatch('array-action', { action: 'delete' });
    });
    this.shadowRoot.getElementById('moveEntryUpBtn')?.addEventListener('click', () => {
      this.dispatch('array-action', { action: 'move-up' });
    });
    this.shadowRoot.getElementById('moveEntryDownBtn')?.addEventListener('click', () => {
      this.dispatch('array-action', { action: 'move-down' });
    });
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  update(data = {}) {
    this.model = { ...this.model, ...data };
    this.renderContent();
  }

  renderContent() {
    const panel = this.shadowRoot.getElementById('panelShell');
    const host = this.shadowRoot.getElementById('contentHost');
    const toolbar = this.shadowRoot.getElementById('toolbarWrap');
    const actionsWrap = this.shadowRoot.getElementById('actionsWrap');
    const viewToggle = this.shadowRoot.getElementById('viewToggle');
    const warningsHost = this.shadowRoot.getElementById('warningsHost');
    if (!panel || !host || !toolbar || !viewToggle || !warningsHost) {
      return;
    }

    const section = this.model.section;
    const sectionLabel = section?.label || 'Overview';
    const sectionKind = section?.kind || 'overview';
    let subtitle = 'No data loaded.';

    if (sectionKind === 'array' && Array.isArray(this.model.sectionValue)) {
      subtitle = `${this.model.sectionValue.length} entries`;
    } else if (sectionKind === 'object' && this.model.sectionValue && typeof this.model.sectionValue === 'object') {
      subtitle = `${Object.keys(this.model.sectionValue).length} keys`;
    } else if (sectionKind === 'export') {
      subtitle = 'Generated package preview';
    } else if (sectionKind === 'overview') {
      subtitle = 'Package summary';
    }

    panel.setAttribute('title', sectionLabel);
    panel.setAttribute('subtitle', subtitle);
    panel.setAttribute('show-back', this.model.showBack ? 'true' : 'false');

    this.renderContextActions();

    const showToggle = sectionKind === 'array' && this.model.showViewToggle !== false;
    const actions = this.model.arrayActions || {};
    const hasAnyArrayActions = Object.values(actions).some(Boolean);
    toolbar.style.display = showToggle ? 'flex' : 'none';
    viewToggle.setAttribute('mode', this.model.viewMode === 'cards' ? 'cards' : 'rows');

    if (actionsWrap) {
      actionsWrap.style.display = showToggle && hasAnyArrayActions ? 'flex' : 'none';
      const setDisabled = (id, disabled) => {
        const node = this.shadowRoot.getElementById(id);
        if (node) {
          node.disabled = Boolean(disabled);
        }
      };
      setDisabled('addEntryBtn', !actions.canAdd);
      setDisabled('duplicateEntryBtn', !actions.canDuplicate);
      setDisabled('deleteEntryBtn', !actions.canDelete);
      setDisabled('moveEntryUpBtn', !actions.canMoveUp);
      setDisabled('moveEntryDownBtn', !actions.canMoveDown);
    }

    warningsHost.innerHTML = this.renderWarnings();

    if (sectionKind === 'overview') {
      host.innerHTML = this.renderOverview();
      return;
    }

    if (sectionKind === 'export') {
      host.innerHTML = this.renderExportPreview();
      return;
    }

    if (sectionKind === 'array') {
      host.innerHTML = this.model.viewMode === 'cards'
        ? this.renderArrayCards(this.model.sectionValue)
        : this.renderArrayRows(this.model.sectionValue);
      this.bindArraySelection();
      return;
    }

    if (sectionKind === 'object') {
      host.innerHTML = this.renderObjectRows(this.model.sectionValue);
      this.bindObjectSelection();
      return;
    }

    host.innerHTML = '<div class="empty">This section is not editable in this version.</div>';
  }

  renderContextActions() {
    const wrap = this.shadowRoot.getElementById('contextActionsWrap');
    if (!wrap) {
      return;
    }

    const actions = Array.isArray(this.model.contextActions) ? this.model.contextActions : [];
    if (actions.length === 0) {
      wrap.innerHTML = '';
      return;
    }

    wrap.innerHTML = actions.map((action) => `
      <button
        class="btn ${action.variant === 'primary' ? 'btn-primary' : ''}"
        type="button"
        data-context-action-id="${action.id}"
        ${action.disabled ? 'disabled' : ''}
      >${escapeHtml(action.label || action.id)}</button>
    `).join('');

    wrap.querySelectorAll('[data-context-action-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const actionId = button.getAttribute('data-context-action-id') || '';
        if (actionId) {
          this.dispatch('panel-action', { actionId });
        }
      });
    });
  }

  renderOverview() {
    const stats = Array.isArray(this.model.overviewStats) ? this.model.overviewStats : [];
    const overviewWarnings = Array.isArray(this.model.overviewWarnings) ? this.model.overviewWarnings : [];
    if (stats.length === 0) {
      return '<div class="empty">Open a package JSON file to inspect its sections.</div>';
    }
    const cards = stats.map((stat) => `
      <article class="overview-card">
        <p class="overview-label">${escapeHtml(stat.label)}</p>
        <p class="overview-value">${Number.isFinite(stat.count) ? stat.count : '-'}</p>
      </article>
    `).join('');
    const warningBlock = overviewWarnings.length > 0
      ? `<div class="warning-box"><strong>Overview warnings</strong><ul>${overviewWarnings.map((msg) => `<li>${escapeHtml(msg)}</li>`).join('')}</ul></div>`
      : '';
    return `${warningBlock}<div class="overview-grid">${cards}</div>`;
  }

  renderExportPreview() {
    const payload = this.model.exportPayload && typeof this.model.exportPayload === 'object'
      ? this.model.exportPayload
      : {};
    const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
    const summary = Array.isArray(payload.summary) ? payload.summary : [];
    const jsonText = String(payload.jsonText || '{}');

    const warningBlock = warnings.length > 0
      ? `<div class="warning-box"><strong>Export warnings</strong><ul>${warnings.map((msg) => `<li>${escapeHtml(msg)}</li>`).join('')}</ul></div>`
      : '<div class="empty">No export warnings.</div>';
    const summaryCards = summary.length > 0
      ? `<div class="overview-grid">${summary.map((stat) => `
        <article class="overview-card">
          <p class="overview-label">${escapeHtml(stat.label)}</p>
          <p class="overview-value">${Number.isFinite(stat.count) ? stat.count : '-'}</p>
        </article>
      `).join('')}</div>`
      : '';

    return `
      ${warningBlock}
      ${summaryCards}
      <div class="json-wrap">
        <p class="json-title">Generated package JSON</p>
        <pre>${escapeHtml(jsonText)}</pre>
      </div>
    `;
  }

  warningForIndex(index) {
    const sectionValidation = this.model.sectionValidation || {};
    const entryWarnings = sectionValidation.entryWarnings || {};
    return Array.isArray(entryWarnings[index]) ? entryWarnings[index] : [];
  }

  renderWarnings() {
    const sectionValidation = this.model.sectionValidation || {};
    if (!sectionValidation.warningCount) {
      return '';
    }
    const lines = [];
    if (Array.isArray(sectionValidation.missingIds) && sectionValidation.missingIds.length > 0) {
      lines.push(`Missing id in ${sectionValidation.missingIds.length} entr${sectionValidation.missingIds.length === 1 ? 'y' : 'ies'}.`);
    }
    if (Array.isArray(sectionValidation.duplicateIds) && sectionValidation.duplicateIds.length > 0) {
      lines.push(`Duplicate ids: ${sectionValidation.duplicateIds.join(', ')}`);
    }
    if (lines.length === 0) {
      return '';
    }
    return `<div class="warning-box"><strong>Validation</strong><ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul></div>`;
  }

  renderArrayRows(value) {
    const entries = Array.isArray(value) ? value : [];
    if (entries.length === 0) {
      return '<div class="empty">This section has no entries.</div>';
    }
    const rows = entries.map((entry, index) => {
      const selected = this.model.selectedEntryRef?.index === index ? 'is-selected' : '';
      const warnings = this.warningForIndex(index);
      const label = entryLabel(entry, index);
      const id = entry && typeof entry === 'object' ? (entry.id || '') : '';
      return `
        <tr class="${selected}" data-entry-index="${index}">
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(valueType(entry))}</td>
          <td>${warnings.length > 0 ? `<span class="row-warn">${warnings.length}</span>` : ''}</td>
        </tr>
      `;
    }).join('');
    return `
      <div class="table-wrap">
        <table aria-label="Section entries">
          <thead><tr><th>Label</th><th>ID</th><th>Type</th><th>Warn</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  renderArrayCards(value) {
    const entries = Array.isArray(value) ? value : [];
    if (entries.length === 0) {
      return '<div class="empty">This section has no entries.</div>';
    }
    const cards = entries.map((entry, index) => {
      const selected = this.model.selectedEntryRef?.index === index ? 'is-selected' : '';
      const id = entry && typeof entry === 'object' ? String(entry.id || '').trim() : '';
      const type = valueType(entry);
      const warnings = this.warningForIndex(index);
      return `
        <article class="card ${selected}" data-entry-index="${index}">
          <p class="card-title">${escapeHtml(entryLabel(entry, index))}</p>
          <p class="card-meta">${escapeHtml(id || 'No ID')} | ${escapeHtml(type)}</p>
          ${warnings.length > 0 ? `<p class="card-warn">${warnings.length} warning${warnings.length === 1 ? '' : 's'}</p>` : ''}
        </article>
      `;
    }).join('');
    return `<div class="cards">${cards}</div>`;
  }

  renderObjectRows(value) {
    const source = value && typeof value === 'object' ? value : {};
    const keys = Object.keys(source);
    if (keys.length === 0) {
      return '<div class="empty">This object section has no keys yet.</div>';
    }
    const rows = keys.map((key) => {
      const selected = this.model.selectedEntryRef?.key === key ? 'is-selected' : '';
      const encodedKey = encodeURIComponent(key);
      return `
        <tr class="${selected}" data-entry-key="${encodedKey}">
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(valueType(source[key]))}</td>
        </tr>
      `;
    }).join('');
    return `
      <div class="table-wrap">
        <table aria-label="Object section keys">
          <thead><tr><th>Key</th><th>Type</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  bindArraySelection() {
    this.shadowRoot.querySelectorAll('[data-entry-index]').forEach((node) => {
      node.addEventListener('click', () => {
        const raw = node.getAttribute('data-entry-index');
        const index = Number(raw);
        if (Number.isInteger(index)) {
          this.dispatch('entry-select', { entryRef: { index } });
        }
      });
    });
  }

  bindObjectSelection() {
    this.shadowRoot.querySelectorAll('[data-entry-key]').forEach((node) => {
      node.addEventListener('click', () => {
        const encoded = node.getAttribute('data-entry-key') || '';
        const key = encoded ? decodeURIComponent(encoded) : '';
        if (key) {
          this.dispatch('entry-select', { entryRef: { key } });
        }
      });
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${configuratorSectionBrowserStyles}</style>
      <open-panel-shell id="panelShell" title="Overview" subtitle="No data loaded." show-back="false">
        <div id="contextActionsWrap" slot="header-actions" class="context-actions"></div>
        <div id="toolbarWrap" slot="toolbar" style="display:none">
          <open-view-toggle id="viewToggle" mode="rows"></open-view-toggle>
          <div id="actionsWrap" class="actions-wrap" style="display:none">
            <button class="btn small" id="addEntryBtn" type="button">Add</button>
            <button class="btn small" id="duplicateEntryBtn" type="button">Duplicate</button>
            <button class="btn small danger" id="deleteEntryBtn" type="button">Delete</button>
            <button class="btn small" id="moveEntryUpBtn" type="button">Up</button>
            <button class="btn small" id="moveEntryDownBtn" type="button">Down</button>
          </div>
        </div>
        <div id="warningsHost"></div>
        <div id="contentHost" class="content-wrap"></div>
      </open-panel-shell>
    `;
  }
}

if (!customElements.get('open-configurator-section-browser')) {
  customElements.define('open-configurator-section-browser', OpenConfiguratorSectionBrowserElement);
}

export { OpenConfiguratorSectionBrowserElement };
