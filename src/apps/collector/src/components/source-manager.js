import { sourceManagerStyles } from '../css/source-manager.css.js';

class OpenCollectionsSourceManagerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      providerCatalog: [],
      sources: [],
      selectedProviderId: 'github',
      capabilities: {},
      connectionStatusText: 'Not connected.',
      connectionStatusTone: 'neutral',
      gdriveAuthStatusText: 'Disconnected.',
      gdriveAuthStatusTone: 'neutral',
      localFolderStatusText: 'No folder selected.',
      localFolderStatusTone: 'neutral',
      configValues: {
        githubToken: '',
        githubOwner: '',
        githubRepo: '',
        githubBranch: 'main',
        githubPath: '',
        publicUrlInput: '',
        gdriveSourceMode: 'auth-manifest-file',
        gdriveUrlInput: '',
        gdriveClientIdInput: '',
        gdriveFileIdInput: '',
        gdriveAccessTokenInput: '',
        localPathInput: '',
        localFolderName: '',
      },
    };
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
    this.applyState();
  }

  bindEvents() {
    this.shadowRoot.getElementById('providerCatalog')?.addEventListener('click', (event) => {
      const card = event.target.closest('.provider-card');
      if (!card) {
        return;
      }
      const providerId = card.dataset.providerId || '';
      if (!providerId || card.classList.contains('is-disabled')) {
        return;
      }
      this.dispatch('select-provider', { providerId });
    });

    this.shadowRoot.getElementById('sourceList')?.addEventListener('click', (event) => {
      const actionButton = event.target.closest('button[data-action][data-source-id]');
      if (!actionButton) {
        return;
      }
      const action = actionButton.dataset.action || '';
      const sourceId = actionButton.dataset.sourceId || '';
      if (!sourceId) {
        return;
      }

      if (action === 'refresh') {
        this.dispatch('refresh-source', { sourceId });
      } else if (action === 'inspect') {
        this.dispatch('inspect-source', { sourceId });
      } else if (action === 'remove') {
        this.dispatch('remove-source', { sourceId });
      } else if (action === 'show-only') {
        this.dispatch('show-only-source', { sourceId });
      }
    });

    this.shadowRoot.getElementById('openStorageOptionsBtn')?.addEventListener('click', () => {
      this.dispatch('open-storage-options');
    });

    this.shadowRoot.getElementById('connectBtn')?.addEventListener('click', () => {
      this.dispatch('connect-provider');
    });

    this.shadowRoot.getElementById('pickLocalFolderBtn')?.addEventListener('click', () => {
      this.dispatch('pick-local-folder');
    });

    this.shadowRoot.getElementById('gdriveSourceMode')?.addEventListener('change', () => {
      this.renderGoogleDriveMode();
      this.dispatch('gdrive-mode-change', { mode: this.getGoogleDriveSourceMode() });
    });

    this.shadowRoot.getElementById('gdriveConnectAuthBtn')?.addEventListener('click', () => {
      this.dispatch('gdrive-connect-auth');
    });
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  isReady() {
    return Boolean(this.shadowRoot?.getElementById('providerCatalog'));
  }

  applyState() {
    if (!this.isReady()) {
      return;
    }
    this.renderProviderCatalog();
    this.renderSourcesList();
    this.renderProviderVisibility();
    this.applyConfigValues();
    this.renderGoogleDriveMode();
    this.setCapabilities(this.model.capabilities);
    this.setConnectionStatus(this.model.connectionStatusText, this.model.connectionStatusTone);
    this.setGoogleDriveAuthStatus(this.model.gdriveAuthStatusText, this.model.gdriveAuthStatusTone);
    this.setLocalFolderStatus(this.model.localFolderStatusText, this.model.localFolderStatusTone);
  }

  setProviderCatalog(catalog = []) {
    this.model.providerCatalog = Array.isArray(catalog) ? catalog : [];
    if (this.isReady()) {
      this.renderProviderCatalog();
      this.renderProviderVisibility();
    }
  }

  setSelectedProvider(providerId) {
    this.model.selectedProviderId = providerId || 'github';
    if (!this.isReady()) {
      return;
    }
    this.renderProviderCatalog();
    this.renderProviderVisibility();
  }

  setSources(sources = []) {
    this.model.sources = Array.isArray(sources) ? sources : [];
    if (this.isReady()) {
      this.renderSourcesList();
    }
  }

  setConnectionStatus(text, tone = 'neutral') {
    this.model.connectionStatusText = text || 'Not connected.';
    this.model.connectionStatusTone = tone || 'neutral';
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    const node = this.shadowRoot?.getElementById('connectionStatus');
    if (!node) {
      return;
    }
    node.textContent = this.model.connectionStatusText;
    node.style.color = colors[this.model.connectionStatusTone] || colors.neutral;
  }

  setCapabilities(capabilities) {
    this.model.capabilities = capabilities || {};
  }

  setGoogleDriveAuthStatus(text, tone = 'neutral') {
    this.model.gdriveAuthStatusText = text || '';
    this.model.gdriveAuthStatusTone = tone || 'neutral';
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    const node = this.shadowRoot?.getElementById('gdriveAuthStatus');
    if (!node) {
      return;
    }
    node.textContent = this.model.gdriveAuthStatusText;
    node.style.color = colors[this.model.gdriveAuthStatusTone] || colors.neutral;
  }

  setLocalFolderStatus(text, tone = 'neutral') {
    this.model.localFolderStatusText = text || 'No folder selected.';
    this.model.localFolderStatusTone = tone || 'neutral';
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    const node = this.shadowRoot?.getElementById('localFolderStatus');
    if (!node) {
      return;
    }
    node.textContent = this.model.localFolderStatusText;
    node.style.color = colors[this.model.localFolderStatusTone] || colors.neutral;
  }

  setConfigValues(nextValues = {}) {
    this.model.configValues = {
      ...this.model.configValues,
      ...(nextValues || {}),
    };
    this.applyConfigValues();
    if (Object.prototype.hasOwnProperty.call(nextValues || {}, 'gdriveSourceMode')) {
      this.renderGoogleDriveMode();
    }
    if (Object.prototype.hasOwnProperty.call(nextValues || {}, 'localFolderName')) {
      const folderName = String(nextValues.localFolderName || '').trim();
      this.setLocalFolderStatus(folderName ? `Selected folder: ${folderName}` : 'No folder selected.', folderName ? 'ok' : 'neutral');
    }
  }

  applyConfigValues() {
    if (!this.isReady()) {
      return;
    }
    const values = this.model.configValues || {};
    const mapping = {
      githubToken: 'githubToken',
      githubOwner: 'githubOwner',
      githubRepo: 'githubRepo',
      githubBranch: 'githubBranch',
      githubPath: 'githubPath',
      publicUrlInput: 'publicUrlInput',
      gdriveSourceMode: 'gdriveSourceMode',
      gdriveUrlInput: 'gdriveUrlInput',
      gdriveClientIdInput: 'gdriveClientIdInput',
      gdriveFileIdInput: 'gdriveFileIdInput',
      gdriveAccessTokenInput: 'gdriveAccessTokenInput',
      localPathInput: 'localPathInput',
      localFolderName: 'localFolderName',
    };
    for (const [key, id] of Object.entries(mapping)) {
      const input = this.shadowRoot.getElementById(id);
      if (!input) {
        continue;
      }
      const raw = values[key];
      if (raw === undefined || raw === null) {
        continue;
      }
      input.value = String(raw);
    }
  }

  getGoogleDriveSourceMode() {
    return this.shadowRoot?.getElementById('gdriveSourceMode')?.value || this.model.configValues.gdriveSourceMode || 'auth-manifest-file';
  }

  getProviderConfig(providerId) {
    const root = this.shadowRoot;
    const config = {};
    if (!root) {
      return config;
    }

    if (providerId === 'local') {
      config.path = root.getElementById('localPathInput')?.value.trim() || '';
      config.localDirectoryName = root.getElementById('localFolderName')?.value.trim() || '';
    }

    if (providerId === 'public-url') {
      config.manifestUrl = root.getElementById('publicUrlInput')?.value.trim() || '';
    }

    if (providerId === 'gdrive') {
      config.sourceMode = root.getElementById('gdriveSourceMode')?.value || 'auth-manifest-file';
      config.manifestUrl = root.getElementById('gdriveUrlInput')?.value.trim() || '';
      config.fileId = root.getElementById('gdriveFileIdInput')?.value.trim() || '';
      config.accessToken = root.getElementById('gdriveAccessTokenInput')?.value.trim() || '';
      config.oauthClientId = root.getElementById('gdriveClientIdInput')?.value.trim() || '';
    }

    if (providerId === 'github') {
      config.token = root.getElementById('githubToken')?.value || '';
      config.owner = root.getElementById('githubOwner')?.value || '';
      config.repo = root.getElementById('githubRepo')?.value || '';
      config.branch = root.getElementById('githubBranch')?.value || '';
      config.path = root.getElementById('githubPath')?.value || '';
    }

    return config;
  }

  renderGoogleDriveMode() {
    const mode = this.getGoogleDriveSourceMode();
    const isAuthMode = mode === 'auth-manifest-file';
    const authConfig = this.shadowRoot?.getElementById('gdriveAuthConfig');
    const publicConfig = this.shadowRoot?.getElementById('gdrivePublicConfig');
    if (authConfig) {
      authConfig.classList.toggle('is-hidden', !isAuthMode);
    }
    if (publicConfig) {
      publicConfig.classList.toggle('is-hidden', isAuthMode);
    }
    if (isAuthMode) {
      const text = (this.shadowRoot?.getElementById('gdriveAuthStatus')?.textContent || '').trim();
      if (!text) {
        this.setGoogleDriveAuthStatus('Disconnected.', 'neutral');
      }
      return;
    }
    const accessTokenInput = this.shadowRoot?.getElementById('gdriveAccessTokenInput');
    if (accessTokenInput) {
      accessTokenInput.value = '';
    }
    this.setGoogleDriveAuthStatus('Public shared URL mode selected.', 'neutral');
  }

  providerById(providerId) {
    return this.model.providerCatalog.find((entry) => entry.id === providerId) || null;
  }

  renderProviderVisibility() {
    const selected = this.providerById(this.model.selectedProviderId);
    const providerLabel = selected?.label || this.model.selectedProviderId || 'Host';
    const providerConfigTitle = this.shadowRoot?.getElementById('providerConfigTitle');
    if (providerConfigTitle) {
      providerConfigTitle.textContent = `${providerLabel} host configuration`;
    }

    const sections = {
      github: this.shadowRoot?.getElementById('githubConfig'),
      'public-url': this.shadowRoot?.getElementById('publicUrlConfig'),
      gdrive: this.shadowRoot?.getElementById('gdriveConfig'),
      local: this.shadowRoot?.getElementById('localConfig'),
      placeholder: this.shadowRoot?.getElementById('placeholderConfig'),
    };

    Object.values(sections).forEach((node) => {
      if (node) {
        node.classList.add('is-hidden');
      }
    });

    if (this.model.selectedProviderId === 'github') {
      sections.github?.classList.remove('is-hidden');
    } else if (this.model.selectedProviderId === 'gdrive') {
      sections.gdrive?.classList.remove('is-hidden');
      this.renderGoogleDriveMode();
    } else if (this.model.selectedProviderId === 'public-url') {
      sections['public-url']?.classList.remove('is-hidden');
    } else if (this.model.selectedProviderId === 'local') {
      sections.local?.classList.remove('is-hidden');
    } else {
      sections.placeholder?.classList.remove('is-hidden');
    }

    const connectBtn = this.shadowRoot?.getElementById('connectBtn');
    if (connectBtn) {
      connectBtn.disabled = selected?.enabled === false;
    }
  }

  renderProviderCatalog() {
    const wrap = this.shadowRoot?.getElementById('providerCatalog');
    if (!wrap) {
      return;
    }
    wrap.innerHTML = '';
    for (const entry of this.model.providerCatalog) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'provider-card';
      button.dataset.providerId = entry.id;
      button.disabled = entry.enabled === false;
      if (entry.enabled === false) {
        button.classList.add('is-disabled');
      }
      if (this.model.selectedProviderId === entry.id) {
        button.classList.add('is-selected');
      }

      button.innerHTML = `
        <div class="provider-card-label-row">
          <strong>${entry.label}</strong>
          <span class="pill ${entry.enabled === false ? 'is-muted' : ''}">${entry.statusLabel || 'Available'}</span>
        </div>
        <span class="panel-subtext">${entry.description || ''}</span>
      `;
      wrap.appendChild(button);
    }
  }

  renderSourcesList() {
    const list = this.shadowRoot?.getElementById('sourceList');
    if (!list) {
      return;
    }
    list.innerHTML = '';

    if (!this.model.sources.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No hosts added yet.';
      list.appendChild(empty);
      return;
    }

    for (const source of this.model.sources) {
      const card = document.createElement('article');
      card.className = 'source-card';

      const top = document.createElement('div');
      top.className = 'source-card-top';

      const labelBlock = document.createElement('div');
      const label = document.createElement('p');
      label.className = 'source-card-label';
      label.textContent = source.displayLabel || source.label;
      const detail = document.createElement('p');
      detail.className = 'panel-subtext';
      detail.textContent = source.detailLabel || `${source.providerLabel} | ${source.itemCount || 0} items`;
      labelBlock.append(label, detail);

      const badges = document.createElement('div');
      badges.className = 'badge-row';
      const readBadge = document.createElement('span');
      readBadge.className = 'pill';
      readBadge.textContent = source.capabilities?.canSaveMetadata ? 'Read + Write' : 'Read';
      const authBadge = document.createElement('span');
      authBadge.className = 'pill';
      if (source.needsCredentials) {
        authBadge.textContent = source.providerId === 'gdrive' ? 'Re-auth required' : 'Token required';
      } else if (source.authMode === 'google-auth') {
        authBadge.textContent = 'Google auth';
      } else if (source.authMode === 'token') {
        authBadge.textContent = 'Token auth';
      } else {
        authBadge.textContent = 'Public';
      }
      badges.append(readBadge, authBadge);
      top.append(labelBlock, badges);

      const status = document.createElement('p');
      status.className = 'panel-subtext';
      status.textContent = source.status || 'Connected';

      const meta = document.createElement('div');
      meta.className = 'source-card-meta';
      const statusPill = document.createElement('span');
      statusPill.className = 'pill';
      statusPill.textContent = source.needsReconnect ? 'Needs reconnect' : 'Connected';
      const countPill = document.createElement('span');
      countPill.className = 'pill';
      countPill.textContent = `${source.itemCount || 0} items`;
      const collectionPill = document.createElement('span');
      collectionPill.className = 'pill';
      collectionPill.textContent = `${source.collections?.length || 0} collections`;
      meta.append(statusPill, countPill, collectionPill);

      const actions = document.createElement('div');
      actions.className = 'source-card-actions';
      actions.innerHTML = `
        <button type="button" class="btn" data-action="refresh" data-source-id="${source.id}">Refresh</button>
        <button type="button" class="btn" data-action="inspect" data-source-id="${source.id}">Inspect</button>
        <button type="button" class="btn" data-action="show-only" data-source-id="${source.id}">Show only</button>
        <button type="button" class="btn" data-action="remove" data-source-id="${source.id}">Remove</button>
      `;

      card.append(top, status, meta, actions);
      list.appendChild(card);
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${sourceManagerStyles}</style>
      <div class="source-manager">
        <div class="provider-layout single-column">
          <div>
            <p class="config-section-title">Choose host provider</p>
            <div id="providerCatalog" class="provider-list"></div>
          </div>
          <div id="providerConfig" class="provider-config">
            <p id="providerConfigTitle" class="config-section-title">Host configuration</p>

            <div id="localConfig" class="is-hidden">
              <p class="panel-subtext">Pick a folder from your computer to use as a local host.</p>
              <div class="dialog-actions">
                <button class="btn" id="pickLocalFolderBtn" type="button">Select folder</button>
              </div>
              <p id="localFolderStatus" class="panel-subtext">No folder selected.</p>
              <div class="field-row is-hidden"><label for="localPathInput">Collection path</label><input id="localPathInput" type="text" /></div>
              <input id="localFolderName" type="hidden" value="" />
            </div>

            <div id="githubConfig" class="is-hidden">
              <div class="field-row"><label for="githubToken">GitHub token (PAT)</label><input id="githubToken" type="password" /></div>
              <div class="field-row"><label for="githubOwner">Repository owner</label><input id="githubOwner" type="text" /></div>
              <div class="field-row"><label for="githubRepo">Repository name</label><input id="githubRepo" type="text" /></div>
              <div class="field-row"><label for="githubBranch">Branch</label><input id="githubBranch" type="text" value="main" /></div>
              <div class="field-row"><label for="githubPath">Folder path (optional)</label><input id="githubPath" type="text" placeholder="media/" /></div>
            </div>

            <div id="publicUrlConfig" class="is-hidden">
              <div class="field-row"><label for="publicUrlInput">Manifest URL</label><input id="publicUrlInput" type="text" placeholder="https://example.org/collection.json" /></div>
            </div>

            <div id="gdriveConfig" class="is-hidden">
              <div class="field-row">
                <label for="gdriveSourceMode">Google Drive source mode</label>
                <select id="gdriveSourceMode">
                  <option value="auth-manifest-file">Authenticated manifest file (Drive API)</option>
                  <option value="public-manifest-url">Public shared manifest URL</option>
                </select>
              </div>

              <div id="gdriveAuthConfig">
                <p class="panel-subtext">Connect your Google account to access Drive files.</p>
                <p class="panel-subtext">Authenticated Google Drive sources are currently read-only.</p>
                <div class="field-row"><label for="gdriveClientIdInput">Google OAuth Client ID</label><input id="gdriveClientIdInput" type="text" placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com" /></div>
                <div class="field-row"><label for="gdriveFileIdInput">Drive file ID (collection.json)</label><input id="gdriveFileIdInput" type="text" placeholder="1diFAVD17-_b7O22fYRLqB7dqWv0cgWNi" /></div>
                <div class="dialog-actions">
                  <button class="btn" id="gdriveConnectAuthBtn" type="button">Connect Google Drive</button>
                </div>
                <div class="field-row"><label for="gdriveAccessTokenInput">Access token (session only, optional override)</label><input id="gdriveAccessTokenInput" type="password" placeholder="Automatically filled after Google auth" /></div>
                <p id="gdriveAuthStatus" class="panel-subtext">Disconnected.</p>
              </div>

              <div id="gdrivePublicConfig" class="is-hidden">
                <div class="field-row"><label for="gdriveUrlInput">Google Drive shared file URL</label><input id="gdriveUrlInput" type="text" placeholder="https://drive.google.com/file/d/FILE_ID/view" /></div>
                <p class="panel-subtext">Paste a public Google Drive file link to a shared <code>collection.json</code> manifest.</p>
                <p class="panel-subtext">The file must be shared as Anyone with the link -> Viewer.</p>
              </div>
            </div>

            <div id="placeholderConfig" class="is-hidden">
              <div class="empty">This provider is planned and not yet available in this MVP.</div>
            </div>

            <div class="dialog-actions">
              <button class="btn btn-primary" id="connectBtn" type="button">Add host</button>
            </div>
          </div>
        </div>

        <div>
          <p class="config-section-title">Connected hosts</p>
          <div id="sourceList" class="source-list"></div>
          <button class="btn storage-help-btn" id="openStorageOptionsBtn" type="button">Storage options</button>
        </div>

        <p id="connectionStatus" class="panel-subtext">Not connected.</p>
      </div>
    `;
  }
}

if (!customElements.get('open-collections-source-manager')) {
  customElements.define('open-collections-source-manager', OpenCollectionsSourceManagerElement);
}

export { OpenCollectionsSourceManagerElement };
