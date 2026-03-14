import { createLocalProvider } from '../../../packages/provider-local/src/index.js';
import { createPublicUrlProvider } from '../../../packages/provider-public-url/src/index.js';
import { createGithubProvider } from '../../../packages/provider-github/src/index.js';
import {
  createGoogleDriveProvider,
  normalizeGoogleDriveManifestUrl,
  requestGoogleDriveAccessToken,
} from '../../../packages/provider-gdrive/src/index.js';
import { COLLECTOR_CONFIG } from './config.js';
import { createOpfsStorage } from './services/opfs_storage.js';
import { pickLocalHostDirectory } from './platform/collector-source-api.js';
import { createInitialState } from './state/initial-state.js';
import { makeSourceId, toWorkspaceItemId } from './utils/id-utils.js';
import './components/manager-header.js';
import './components/collection-browser.js';
import './components/metadata-editor.js';
import './components/pane-layout.js';
import './components/source-manager.js';
import './components/asset-viewer.js';
import {
  slugifySegment as slugifySegmentUtil,
  hostNameFromPath as hostNameFromPathUtil,
  normalizeCollectionRootPath as normalizeCollectionRootPathUtil,
  joinCollectionRootPath as joinCollectionRootPathUtil,
} from './utils/path-utils.js';
import { renderShell } from './render/render-shell.js';
import * as AssetService from './services/asset-service.js';
import * as CollectionService from './services/collection-service.js';
import * as ManifestService from './services/manifest-service.js';
import * as DraftService from './services/draft-service.js';

const SOURCES_STORAGE_KEY = 'timemap_collector_sources_v1';
const COLLECTIONS_DIR_PATH = 'collections';
const SOURCES_DIR_PATH = 'sources';
const DRAFT_ASSETS_DIR_PATH = 'draft-assets';

class OpenCollectionsManagerElement extends HTMLElement {
  constructor() {
    super();

    this.state = createInitialState();

    this.opfsStorage = createOpfsStorage();
    this._autosaveTimer = null;
    this.localAssetBlobs = new Map();
    this.objectUrls = new Set();
    this.selectedLocalDirectoryHandle = null;

    this.providerFactories = {
      local: createLocalProvider(),
      'public-url': createPublicUrlProvider(),
      github: createGithubProvider(),
      gdrive: createGoogleDriveProvider(),
    };

    this.providers = {
      local: createLocalProvider,
      'public-url': createPublicUrlProvider,
      github: createGithubProvider,
      gdrive: createGoogleDriveProvider,
    };

    this.providerCatalog = [
      {
        ...this.providerFactories.local.getDescriptor(),
        label: 'Local folder',
        description: 'Use a folder on this device as a local host (browser support required).',
      },
      {
        ...this.providerFactories.github.getDescriptor(),
        label: 'GitHub storage',
        description: 'Writable storage source for managed collections (recommended).',
      },
      {
        ...this.providerFactories.gdrive.getDescriptor(),
        label: 'Google Drive',
        description: 'Connected Drive source (currently read-only import for managed collections).',
      },
      {
        id: 's3',
        label: 'S3-compatible storage',
        category: 'external',
        enabled: false,
        statusLabel: 'Coming soon',
        description: 'Writable object storage source for institutional collection management.',
      },
    ];

    this.shadow = this.attachShadow({ mode: 'open' });
    this.renderShell();
    this.cacheDom();
  }

  connectedCallback() {
    this.bindEvents();
    this.setStatus('No hosts connected yet.', 'neutral');
    this.setConnectionStatus('No hosts connected.', 'neutral');
    this.renderCapabilities(this.providerFactories.local.getCapabilities());
    this.renderProviderCatalog();
    this.setSelectedProvider('local');
    this.renderSourcesList();
    this.renderSourceFilter();
    this.renderAssets();
    this.renderEditor();
    this.renderWorkspaceContext();
    this.renderSourceContext();
    this.setLocalDraftStatus('Checking local draft storage...', 'neutral');
    this.setLocalDraftControlsEnabled(false);
    this.initializeLocalDraftState();
    this.syncEditorVisibility();
    this._handleWindowResize = () => this.syncEditorVisibility();
    window.addEventListener('resize', this._handleWindowResize);
  }

  disconnectedCallback() {
    if (this._handleWindowResize) {
      window.removeEventListener('resize', this._handleWindowResize);
      this._handleWindowResize = null;
    }
  }

  renderShell() {
    renderShell(this.shadow);
  }

  cacheDom() {
    const root = this.shadow;
    this.dom = {
      managerHeader: root.getElementById('managerHeader'),
      paneLayout: root.getElementById('paneLayout'),
      collectionBrowser: root.getElementById('collectionBrowser'),
      metadataEditor: root.getElementById('metadataEditor'),
      sourceManager: root.getElementById('sourceManager'),
      assetViewer: root.getElementById('assetViewer'),
      providerDialog: root.getElementById('providerDialog'),
      hostMenuDialog: root.getElementById('hostMenuDialog'),
      sourcePickerDialog: root.getElementById('sourcePickerDialog'),
      sourcePickerList: root.getElementById('sourcePickerList'),
      publishDialog: root.getElementById('publishDialog'),
      newCollectionDialog: root.getElementById('newCollectionDialog'),
      registerDialog: root.getElementById('registerDialog'),
      headerMenuDialog: root.getElementById('headerMenuDialog'),
      openSourcePickerFromHostBtn: root.getElementById('openSourcePickerFromHostBtn'),
      openAddHostFromHostBtn: root.getElementById('openAddHostFromHostBtn'),
      openRegisterFromMenuBtn: root.getElementById('openRegisterFromMenuBtn'),
      storageOptionsDialog: root.getElementById('storageOptionsDialog'),
      collectionId: root.getElementById('collectionId'),
      collectionTitle: root.getElementById('collectionTitle'),
      collectionDescription: root.getElementById('collectionDescription'),
      collectionLicense: root.getElementById('collectionLicense'),
      collectionPublisher: root.getElementById('collectionPublisher'),
      collectionLanguage: root.getElementById('collectionLanguage'),
      newCollectionTitle: root.getElementById('newCollectionTitle'),
      newCollectionSlug: root.getElementById('newCollectionSlug'),
      newCollectionDescription: root.getElementById('newCollectionDescription'),
      newCollectionLicense: root.getElementById('newCollectionLicense'),
      newCollectionPublisher: root.getElementById('newCollectionPublisher'),
      newCollectionLanguage: root.getElementById('newCollectionLanguage'),
      createCollectionBtn: root.getElementById('createCollectionBtn'),
      generateManifestBtn: root.getElementById('generateManifestBtn'),
      publishToSourceBtn: root.getElementById('publishToSourceBtn'),
      copyManifestBtn: root.getElementById('copyManifestBtn'),
      downloadManifestBtn: root.getElementById('downloadManifestBtn'),
      saveLocalDraftBtn: root.getElementById('saveLocalDraftBtn'),
      restoreLocalDraftBtn: root.getElementById('restoreLocalDraftBtn'),
      discardLocalDraftBtn: root.getElementById('discardLocalDraftBtn'),
      localDraftStatus: root.getElementById('localDraftStatus'),
      manifestPreview: root.getElementById('manifestPreview'),
    };

    this.dom.sourceManager?.setConfigValues({
      localPathInput: COLLECTOR_CONFIG.defaultLocalManifestPath,
      localFolderName: '',
      gdriveClientIdInput: COLLECTOR_CONFIG.googleDriveOAuth?.clientId || '',
      githubBranch: 'main',
    });
    this.dom.sourceManager?.setGoogleDriveAuthStatus('Disconnected.', 'neutral');
    this.dom.collectionId.value = COLLECTOR_CONFIG.defaultCollectionMeta.id;
    this.dom.collectionTitle.value = COLLECTOR_CONFIG.defaultCollectionMeta.title;
    this.dom.collectionDescription.value = COLLECTOR_CONFIG.defaultCollectionMeta.description;
    this.dom.collectionLicense.value = '';
    this.dom.collectionPublisher.value = '';
    this.dom.collectionLanguage.value = '';
    this.dom.manifestPreview.textContent = '{}';
  }

  bindEvents() {
    if (this._eventsBound) {
      return;
    }

    this._eventsBound = true;

    this.dom.managerHeader.addEventListener('open-host-menu', () => this.openDialog(this.dom.hostMenuDialog));
    this.dom.managerHeader.addEventListener('open-header-menu', () => this.openDialog(this.dom.headerMenuDialog));
    this.dom.sourceManager.addEventListener('open-storage-options', () => this.openDialog(this.dom.storageOptionsDialog));
    this.dom.sourceManager.addEventListener('select-provider', (event) => {
      const providerId = event.detail?.providerId || '';
      if (providerId) {
        this.setSelectedProvider(providerId);
      }
    });
    this.dom.sourceManager.addEventListener('connect-provider', async () => {
      await this.connectCurrentProvider();
    });
    this.dom.sourceManager.addEventListener('refresh-source', async (event) => {
      const sourceId = event.detail?.sourceId || '';
      if (sourceId) {
        await this.refreshSource(sourceId);
      }
    });
    this.dom.sourceManager.addEventListener('inspect-source', (event) => {
      const sourceId = event.detail?.sourceId || '';
      if (sourceId) {
        this.inspectSource(sourceId);
      }
    });
    this.dom.sourceManager.addEventListener('remove-source', (event) => {
      const sourceId = event.detail?.sourceId || '';
      if (sourceId) {
        this.removeSource(sourceId);
      }
    });
    this.dom.sourceManager.addEventListener('show-only-source', (event) => {
      const sourceId = event.detail?.sourceId || '';
      if (!sourceId) {
        return;
      }
      this.state.activeSourceFilter = sourceId;
      this.renderSourceFilter();
      const visible = this.getVisibleAssets();
      this.state.selectedItemId = visible[0]?.workspaceId || null;
      this.renderAssets();
      this.renderEditor();
    });
    this.dom.sourceManager.addEventListener('gdrive-mode-change', () => {
      this.renderGoogleDriveMode();
    });
    this.dom.sourceManager.addEventListener('gdrive-connect-auth', async () => {
      await this.connectGoogleDriveAuth();
    });
    this.dom.sourceManager.addEventListener('pick-local-folder', async () => {
      await this.pickLocalFolder();
    });
    this.dom.openSourcePickerFromHostBtn.addEventListener('click', () => {
      this.closeDialog(this.dom.hostMenuDialog);
      this.renderSourcePicker();
      this.openDialog(this.dom.sourcePickerDialog);
    });
    this.dom.openAddHostFromHostBtn.addEventListener('click', () => {
      this.closeDialog(this.dom.hostMenuDialog);
      this.openDialog(this.dom.providerDialog);
    });
    this.dom.openRegisterFromMenuBtn.addEventListener('click', () => {
      this.closeDialog(this.dom.headerMenuDialog);
      this.openDialog(this.dom.registerDialog);
    });
    this.dom.collectionBrowser.addEventListener('back-to-collections', () => this.leaveCollectionView());
    this.dom.metadataEditor.addEventListener('close-editor', () => this.closeMobileEditor());
    this.dom.assetViewer.addEventListener('close-viewer', () => {
      this.state.viewerItemId = null;
    });
    this.dom.collectionBrowser.addEventListener('source-filter-change', (event) => {
      this.state.activeSourceFilter = event.detail?.value || 'all';
      this.state.selectedCollectionId = 'all';
      this.state.currentLevel = 'collections';
      this.state.openedCollectionId = null;
      this.state.selectedItemId = null;
      this.renderCollectionFilter();
      this.syncMetadataModeFromState();
      this.closeMobileEditor();
      this.renderSourceContext();
      this.renderAssets();
      this.renderEditor();
      if (this.state.opfsAvailable) {
        this.persistWorkspaceToOpfs().catch(() => {});
      }
    });
    this.dom.collectionBrowser.addEventListener('collection-filter-change', (event) => {
      this.state.selectedCollectionId = event.detail?.value || 'all';
      if (this.state.currentLevel === 'items') {
        if (this.state.selectedCollectionId === 'all') {
          this.state.currentLevel = 'collections';
          this.state.openedCollectionId = null;
          this.state.selectedItemId = null;
          this.closeMobileEditor();
        } else if (this.state.openedCollectionId !== this.state.selectedCollectionId) {
          this.state.openedCollectionId = this.state.selectedCollectionId;
          this.state.selectedItemId = null;
        }
      }
      this.syncMetadataModeFromState();
      this.renderAssets();
      this.renderEditor();
      if (this.state.opfsAvailable) {
        this.persistWorkspaceToOpfs().catch(() => {});
      }
    });
    this.dom.collectionBrowser.addEventListener('collection-select', (event) => {
      this.state.selectedCollectionId = event.detail?.collectionId || 'all';
      this.state.currentLevel = 'collections';
      this.state.openedCollectionId = null;
      this.state.selectedItemId = null;
      this.syncMetadataModeFromState();
      this.renderAssets();
      this.renderEditor();
      if (this.isMobileViewport()) {
        this.openMobileEditor();
      }
    });
    this.dom.collectionBrowser.addEventListener('collection-open', (event) => {
      this.openCollectionView(event.detail?.collectionId || '');
    });
    this.dom.collectionBrowser.addEventListener('item-select', (event) => {
      this.selectItem(event.detail?.workspaceId || '');
    });
    this.dom.collectionBrowser.addEventListener('item-view', (event) => {
      this.openViewer(event.detail?.workspaceId || '');
    });
    this.dom.collectionBrowser.addEventListener('view-mode-change', (event) => {
      this.setBrowserViewMode(event.detail?.level || 'collections', event.detail?.mode || 'cards');
    });
    this.dom.collectionBrowser.addEventListener('add-collection', () => {
      this.openNewCollectionDialog();
    });
    this.dom.collectionBrowser.addEventListener('files-selected', async (event) => {
      const files = Array.isArray(event.detail?.files) ? event.detail.files : [];
      if (files.length > 0) {
        await this.ingestImageFiles(files);
      }
    });
    this.dom.collectionBrowser.addEventListener('drop-target-change', (event) => {
      this.setDropTargetState(Boolean(event.detail?.active));
    });
    this.dom.metadataEditor.addEventListener('save-item', async (event) => {
      const selected = this.findSelectedItem();
      if (!selected) {
        return;
      }
      const patch = event.detail?.patch || this.collectEditorPatch();
      await this.updateItem(selected.workspaceId, patch, { explicitSave: true });
    });
    this.dom.metadataEditor.addEventListener('save-collection', async (event) => {
      const patch = event.detail?.patch || null;
      await this.saveSelectedCollectionMetadata(patch);
    });

    this.shadow.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialogId = button.getAttribute('data-close');
        this.closeDialog(this.shadow.getElementById(dialogId));
      });
    });
    this.dom.newCollectionTitle.addEventListener('input', () => {
      const currentSlug = (this.dom.newCollectionSlug.value || '').trim();
      if (!currentSlug) {
        this.dom.newCollectionSlug.value = this.slugifySegment(this.dom.newCollectionTitle.value.trim(), 'new-collection');
      }
    });
    this.dom.createCollectionBtn.addEventListener('click', async () => {
      await this.createNewCollectionDraft();
    });

    this.dom.generateManifestBtn.addEventListener('click', async () => {
      await this.generateManifest();
    });

    this.dom.copyManifestBtn.addEventListener('click', async () => {
      await this.copyManifestToClipboard();
    });

    this.dom.downloadManifestBtn.addEventListener('click', () => {
      this.downloadManifest();
    });
    this.dom.publishToSourceBtn.addEventListener('click', async () => {
      await this.publishActiveSourceDraft();
    });
    this.dom.saveLocalDraftBtn.addEventListener('click', async () => {
      await this.saveLocalDraft();
    });
    this.dom.restoreLocalDraftBtn.addEventListener('click', async () => {
      await this.restoreLocalDraft();
    });
    this.dom.discardLocalDraftBtn.addEventListener('click', async () => {
      await this.discardLocalDraft();
    });
  }

  openDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (dialog.open) {
      return;
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }

    dialog.setAttribute('open', 'open');
  }

  closeDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  isMobileViewport() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
  }

  openMobileEditor() {
    this.state.mobileEditorOpen = true;
    this.syncEditorVisibility();
  }

  closeMobileEditor() {
    this.state.mobileEditorOpen = false;
    this.syncEditorVisibility();
  }

  syncEditorVisibility() {
    if (!this.dom?.metadataEditor || !this.dom?.paneLayout) {
      return;
    }

    // Shell controls inspector placement; browser view mode should not hard-code layout.
    const inspectorPlacement = this.normalizeInspectorPlacement(this.state.inspectorPlacement);
    this.state.inspectorPlacement = inspectorPlacement;
    this.dom.paneLayout.inspectorPlacement = inspectorPlacement;

    const shouldShowOverlay = this.isMobileViewport() && this.state.mobileEditorOpen;
    this.dom.metadataEditor.setMobileOpen(shouldShowOverlay);
  }

  normalizeInspectorPlacement(placement) {
    return placement === 'bottom' || placement === 'hidden' || placement === 'right' ? placement : 'right';
  }

  setInspectorPlacement(placement = 'right') {
    this.state.inspectorPlacement = this.normalizeInspectorPlacement(placement);
    this.syncEditorVisibility();
  }

  applyInspectorModeForViewMode(mode) {
    void mode;
    // Intentionally no-op: inspector placement is a shell-level concern.
  }

  renderProviderCatalog() {
    this.dom.sourceManager?.setProviderCatalog(this.providerCatalog);
  }

  setSelectedProvider(providerId) {
    const selected = this.providerCatalog.find((entry) => entry.id === providerId);
    if (!selected) {
      return;
    }

    this.state.selectedProviderId = providerId;
    this.dom.sourceManager?.setSelectedProvider(providerId);
    if (providerId === 'gdrive') {
      this.renderGoogleDriveMode();
    }
    this.renderCapabilities(this.providerFactories[providerId]?.getCapabilities?.() || selected.capabilities || {});
  }

  renderGoogleDriveMode() {
    this.dom.sourceManager?.renderGoogleDriveMode();
    const mode = this.dom.sourceManager?.getGoogleDriveSourceMode() || 'auth-manifest-file';
    const isAuthMode = mode === 'auth-manifest-file';
    if (this.state.selectedProviderId === 'gdrive') {
      this.renderCapabilities({
        canListAssets: true,
        canGetAsset: true,
        canSaveMetadata: false,
        canExportCollection: true,
        authRequired: isAuthMode,
      });
    }
  }

  setGoogleDriveAuthStatus(text, tone = 'neutral') {
    this.dom.sourceManager?.setGoogleDriveAuthStatus(text, tone);
  }

  async connectGoogleDriveAuth() {
    const gdriveConfig = this.dom.sourceManager?.getProviderConfig('gdrive') || {};
    const sourceMode = gdriveConfig.sourceMode || 'auth-manifest-file';
    if (sourceMode !== 'auth-manifest-file') {
      this.setGoogleDriveAuthStatus('Switch to authenticated mode to connect Google Drive.', 'warn');
      return;
    }

    const clientId = (gdriveConfig.oauthClientId || '').trim();
    if (!clientId) {
      this.setGoogleDriveAuthStatus('Enter a Google OAuth Client ID to start authentication.', 'warn');
      return;
    }

    this.setGoogleDriveAuthStatus('Connecting to Google Drive...', 'neutral');

    try {
      const tokenResult = await requestGoogleDriveAccessToken({
        clientId,
        scope: COLLECTOR_CONFIG.googleDriveOAuth?.scope || 'https://www.googleapis.com/auth/drive.readonly',
      });

      this.dom.sourceManager?.setConfigValues({ gdriveAccessTokenInput: tokenResult.accessToken || '' });
      this.setGoogleDriveAuthStatus('Connected. Access token is loaded for this session.', 'ok');
      this.setConnectionStatus('Google Drive authentication completed for this session.', 'ok');
      this.setStatus('Google Drive authenticated. Add source to load the selected manifest file.', 'ok');
    } catch (error) {
      this.setGoogleDriveAuthStatus(error.message, 'warn');
      this.setConnectionStatus(`Google Drive auth failed: ${error.message}`, 'warn');
      this.setStatus(`Google Drive auth failed: ${error.message}`, 'warn');
    }
  }

  setStatus(text, tone = 'neutral') {
    this.dom.managerHeader?.setStatus(text, tone);
  }

  setConnectionStatus(text, tone = false) {
    const resolvedTone = typeof tone === 'boolean' ? (tone ? 'ok' : 'warn') : tone;
    this.dom.sourceManager?.setConnectionStatus(text, resolvedTone);
  }

  setLocalDraftStatus(text, tone = 'neutral') {
    const colors = {
      neutral: '#64748b',
      ok: '#166534',
      warn: '#9a3412',
    };
    this.state.opfsStatus = text;
    if (this.dom?.localDraftStatus) {
      this.dom.localDraftStatus.textContent = text;
      this.dom.localDraftStatus.style.color = colors[tone] || colors.neutral;
    }
  }

  setLocalDraftControlsEnabled(enabled) {
    const disabled = !enabled;
    if (this.dom?.saveLocalDraftBtn) {
      this.dom.saveLocalDraftBtn.disabled = disabled;
      this.dom.restoreLocalDraftBtn.disabled = disabled;
      this.dom.discardLocalDraftBtn.disabled = disabled;
    }
  }

  draftCollectionId() {
    return (
      this.dom.collectionId.value.trim() ||
      COLLECTOR_CONFIG.defaultCollectionMeta.id ||
      'collection-draft'
    );
  }

  draftFilePath(collectionId = this.draftCollectionId()) {
    return `${COLLECTIONS_DIR_PATH}/${collectionId}.json`;
  }

  sourceFilePath(sourceId) {
    return `${SOURCES_DIR_PATH}/${sourceId}.json`;
  }

  setDropTargetState(active) {
    this.state.isDropTargetActive = Boolean(active);
    this.dom.collectionBrowser?.setDropTargetActive(this.state.isDropTargetActive);
  }

  isSupportedImageFile(file) {
    if (!file) {
      return false;
    }
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/jpeg') || mime.startsWith('image/png') || mime.startsWith('image/webp') || mime.startsWith('image/gif')) {
      return true;
    }
    return /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');
  }

  toWorkspaceItemId(sourceId, itemId) {
    return toWorkspaceItemId(sourceId, itemId);
  }

  slugifySegment(value, fallback = 'item') {
    return slugifySegmentUtil(value, fallback);
  }

  hostNameFromPath(path, fallback = 'Local host') {
    return hostNameFromPathUtil(path, fallback);
  }

  normalizeCollectionRootPath(rootPath, fallbackId = '') {
    return normalizeCollectionRootPathUtil(rootPath, fallbackId);
  }

  joinCollectionRootPath(collectionRootPath, relativePath = '') {
    return joinCollectionRootPathUtil(
      collectionRootPath,
      relativePath,
      this.state.selectedCollectionId || 'collection',
    );
  }

  activeCollectionRootPath() {
    const collectionId = (this.state.selectedCollectionId || '').trim();
    if (!collectionId || collectionId === 'all') {
      return '';
    }
    const activeSource = this.state.activeSourceFilter !== 'all' ? this.getSourceById(this.state.activeSourceFilter) : null;
    if (activeSource) {
      const sourceCollection = (activeSource.collections || []).find((entry) => entry.id === collectionId);
      if (sourceCollection?.rootPath) {
        return this.normalizeCollectionRootPath(sourceCollection.rootPath, collectionId);
      }
    }
    const localCollection = this.state.localDraftCollections.find((entry) => entry.id === collectionId);
    if (localCollection?.rootPath) {
      return this.normalizeCollectionRootPath(localCollection.rootPath, collectionId);
    }
    return this.normalizeCollectionRootPath(`${collectionId}/`, collectionId);
  }

  renderWorkspaceContext() {
    const source =
      this.state.activeSourceFilter !== 'all'
        ? this.getSourceById(this.state.activeSourceFilter)
        : null;
    const sourceLabel = source?.displayLabel || source?.label || 'none';
    const collectionId = this.state.selectedCollectionId && this.state.selectedCollectionId !== 'all'
      ? this.state.selectedCollectionId
      : 'none';
    const rootPath = collectionId !== 'none' ? this.activeCollectionRootPath() : 'n/a';
    this.dom.managerHeader?.setWorkspaceContext(`Host: ${sourceLabel} | Collection: ${collectionId} | Root: ${rootPath}`);
  }

  readableTitleFromFilename(name, fallbackId) {
    const base = String(name || '').replace(/\.[^.]+$/, '');
    const cleaned = base.replace(/[_-]+/g, ' ').trim();
    return cleaned || fallbackId;
  }

  openNewCollectionDialog() {
    this.dom.newCollectionTitle.value = '';
    this.dom.newCollectionSlug.value = '';
    this.dom.newCollectionDescription.value = '';
    this.dom.newCollectionLicense.value = '';
    this.dom.newCollectionPublisher.value = '';
    this.dom.newCollectionLanguage.value = '';
    this.openDialog(this.dom.newCollectionDialog);
  }

  setCollectionMetaFields(meta = {}) {
    this.dom.collectionId.value = meta.id || this.dom.collectionId.value;
    this.dom.collectionTitle.value = meta.title || this.dom.collectionTitle.value;
    this.dom.collectionDescription.value = meta.description || '';
    this.dom.collectionLicense.value = meta.license || '';
    this.dom.collectionPublisher.value = meta.publisher || '';
    this.dom.collectionLanguage.value = meta.language || '';
  }

  collectionIdExists(collectionId) {
    return CollectionService.collectionIdExists(this, collectionId);
  }

  ensureUniqueCollectionId(baseId) {
    return CollectionService.ensureUniqueCollectionId(this, baseId);
  }

  buildInitialCollectionManifest(meta) {
    return CollectionService.buildInitialCollectionManifest(this, meta);
  }

  async createNewCollectionDraft() {
    return CollectionService.createNewCollectionDraft(this);
  }

  extensionFromName(name = '', fallback = '.jpg') {
    const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : fallback;
  }

  uniqueDraftItemId(base, sourceId, collectionId) {
    const existing = new Set(
      this.state.assets
        .filter((item) => item.sourceId === sourceId && item.collectionId === collectionId)
        .map((item) => item.id),
    );
    if (!existing.has(base)) {
      return base;
    }
    let index = 2;
    while (existing.has(`${base}-${index}`)) {
      index += 1;
    }
    return `${base}-${index}`;
  }

  getActiveIngestionSource() {
    if (!this.state.sources.length) {
      this.setStatus('Connect a writable storage source before adding images.', 'warn');
      return null;
    }

    if (this.state.activeSourceFilter === 'all') {
      this.setStatus('Select a specific storage source before adding images.', 'warn');
      return null;
    }

    const source = this.getSourceById(this.state.activeSourceFilter);
    if (!source) {
      this.setStatus('Selected storage source was not found.', 'warn');
      return null;
    }

    if (source.providerId !== 'github' && source.providerId !== 'local') {
      this.setStatus('Image upload is currently available for GitHub and local folder hosts.', 'warn');
      return null;
    }

    if (source.providerId === 'github' && (source.needsReconnect || source.needsCredentials)) {
      this.setStatus('Reconnect the selected GitHub source before adding local draft assets.', 'warn');
      return null;
    }

    if (source.providerId === 'local') {
      if (source.needsReconnect || !source.provider) {
        this.setStatus('Reconnect the selected local host before adding images.', 'warn');
        return null;
      }
      if (!source.capabilities?.canSaveMetadata) {
        this.setStatus('Selected local host is read-only. Reconnect with a writable folder.', 'warn');
        return null;
      }
    }

    return source;
  }

  ensureCollectionForSource(source) {
    const preferred = (this.state.selectedCollectionId || '').trim();
    const existing = source.collections || [];
    if (source.providerId === 'local') {
      if (preferred && preferred !== 'all' && existing.some((entry) => entry.id === preferred)) {
        source.selectedCollectionId = preferred;
        return preferred;
      }
      if (source.selectedCollectionId && existing.some((entry) => entry.id === source.selectedCollectionId)) {
        return source.selectedCollectionId;
      }
      const firstLocal = existing[0]?.id || '';
      if (firstLocal) {
        source.selectedCollectionId = firstLocal;
      }
      return firstLocal;
    }

    if (preferred && preferred !== 'all') {
      if (!existing.some((entry) => entry.id === preferred)) {
        const localEntry = this.state.localDraftCollections.find((entry) => entry.id === preferred);
        source.collections = [
          ...existing,
          {
            id: preferred,
            title: localEntry?.title || preferred,
            rootPath: this.normalizeCollectionRootPath(localEntry?.rootPath || `${preferred}/`, preferred),
          },
        ];
      }
      source.selectedCollectionId = preferred;
      return preferred;
    }

    if (source.selectedCollectionId && existing.some((entry) => entry.id === source.selectedCollectionId)) {
      return source.selectedCollectionId;
    }

    const first = existing[0]?.id;
    if (first) {
      source.selectedCollectionId = first;
      return first;
    }

    const fallback = `${source.id}::default-collection`;
    source.collections = [{ id: fallback, title: source.displayLabel || source.label || 'Default collection' }];
    source.selectedCollectionId = fallback;
    return fallback;
  }

  collectionLabelFor(source, collectionId) {
    const found = (source.collections || []).find((entry) => entry.id === collectionId);
    return found?.title || collectionId;
  }

  collectionAssetPath(workspaceId, kind = 'original', extension = '.jpg') {
    return `${DRAFT_ASSETS_DIR_PATH}/${workspaceId}/${kind}${extension}`;
  }

  registerObjectUrl(url) {
    if (url) {
      this.objectUrls.add(url);
    }
  }

  async generateThumbnailBlob(file) {
    return AssetService.generateThumbnailBlob(this, file);
  }

  async rememberLocalAssetFiles(item, originalBlob, thumbnailBlob) {
    return AssetService.rememberLocalAssetFiles(this, item, originalBlob, thumbnailBlob);
  }

  async loadLocalAssetBlob(item, kind = 'original') {
    return AssetService.loadLocalAssetBlob(this, item, kind);
  }

  async rehydrateLocalDraftAssetUrls() {
    return AssetService.rehydrateLocalDraftAssetUrls(this);
  }

  async hydrateLocalSourceAssetPreviews(sourceId) {
    return AssetService.hydrateLocalSourceAssetPreviews(this, sourceId);
  }

  refreshSourceCollectionsAndCounts(sourceId) {
    const source = this.getSourceById(sourceId);
    if (!source) {
      return;
    }
    const sourceAssets = this.state.assets.filter((item) => item.sourceId === sourceId);
    const nextCollections = this.buildCollectionsForSource(source, sourceAssets);
    source.collections = nextCollections.map((collection) => {
      const existing = (source.collections || []).find((entry) => entry.id === collection.id);
      return existing ? { ...existing, ...collection } : collection;
    });
    source.itemCount = sourceAssets.length;
    if (!source.collections.some((entry) => entry.id === source.selectedCollectionId)) {
      source.selectedCollectionId = source.collections[0]?.id || null;
    }
  }

  async ingestImageFiles(files) {
    return AssetService.ingestImageFiles(this, files);
  }

  renderCapabilities(capabilitiesOrProvider) {
    const capabilities =
      typeof capabilitiesOrProvider?.getCapabilities === 'function'
        ? capabilitiesOrProvider.getCapabilities()
        : capabilitiesOrProvider || {};
    this.dom.sourceManager?.setCapabilities(capabilities);
  }

  getSourceById(sourceId) {
    return this.state.sources.find((entry) => entry.id === sourceId) || null;
  }

  getVisibleAssets() {
    let visible = this.state.assets;
    if (this.state.activeSourceFilter !== 'all') {
      visible = visible.filter((item) => item.sourceId === this.state.activeSourceFilter);
    }
    if (this.state.selectedCollectionId !== 'all') {
      visible = visible.filter((item) => item.collectionId === this.state.selectedCollectionId);
    }
    return visible;
  }

  renderSourceFilter() {
    const previous = this.state.activeSourceFilter || 'all';
    const options = [{ value: 'all', label: 'All hosts' }];
    for (const source of this.state.sources) {
      options.push({
        value: source.id,
        label: source.displayLabel || source.label || source.providerLabel || 'Source',
      });
    }
    const stillExists = previous === 'all' || this.state.sources.some((entry) => entry.id === previous);
    this.state.activeSourceFilter = stillExists ? previous : 'all';
    this.dom.collectionBrowser.setSourceOptions(options, this.state.activeSourceFilter);
    this.renderCollectionFilter();
  }

  renderCollectionFilter() {
    const previous = this.state.selectedCollectionId || 'all';
    const options = [{ value: 'all', label: 'All collections' }];

    let collections = [];
    if (this.state.activeSourceFilter !== 'all') {
      const activeSource = this.getSourceById(this.state.activeSourceFilter);
      collections = activeSource?.collections || [];
      if (previous !== 'all' && !collections.some((entry) => entry.id === previous)) {
        const localEntry = this.state.localDraftCollections.find((entry) => entry.id === previous);
        if (localEntry) {
          collections = [...collections, localEntry];
        }
      }
    } else if (this.state.localDraftCollections.length > 0) {
      collections = this.state.localDraftCollections;
    }

    for (const collection of collections) {
      options.push({ value: collection.id, label: collection.title || collection.id });
    }

    const stillExists = previous === 'all' || collections.some((entry) => entry.id === previous);
    this.state.selectedCollectionId = stillExists ? previous : 'all';
    this.dom.collectionBrowser.setCollectionOptions(options, this.state.selectedCollectionId);
    this.renderWorkspaceContext();
    this.renderSourceContext();
  }

  formatSourceBadge(item) {
    const display = (item.sourceDisplayLabel || '').trim();
    if (display) {
      return display;
    }
    const providerName = this.providerCatalog.find((entry) => entry.id === item.providerId)?.label || item.providerId || '';
    return providerName || 'Source';
  }

  renderSourcesList() {
    this.dom.sourceManager?.setSources(this.state.sources);
  }

  collectCurrentProviderConfig(providerId) {
    const config = this.dom.sourceManager?.getProviderConfig(providerId) || {};
    if (providerId === 'local') {
      config.localDirectoryName = (config.localDirectoryName || '').trim();
      config.path = (config.path || '').trim()
        || (config.localDirectoryName ? config.localDirectoryName : COLLECTOR_CONFIG.defaultLocalManifestPath);
      if (this.selectedLocalDirectoryHandle && this.selectedLocalDirectoryHandle.kind === 'directory') {
        config.localDirectoryHandle = this.selectedLocalDirectoryHandle;
      }
    }
    if (providerId === 'gdrive') {
      config.oauthScopes = COLLECTOR_CONFIG.googleDriveOAuth?.scope || 'https://www.googleapis.com/auth/drive.readonly';
    }
    return config;
  }

  async pickLocalFolder() {
    try {
      const handle = await pickLocalHostDirectory();
      const folderName = (handle?.name || '').trim() || 'Selected folder';
      this.selectedLocalDirectoryHandle = handle || null;
      this.dom.sourceManager?.setConfigValues({
        localFolderName: folderName,
        localPathInput: folderName,
      });
      this.dom.sourceManager?.setLocalFolderStatus(`Selected folder: ${folderName}`, 'ok');
      this.setStatus(`Selected local folder: ${folderName}`, 'ok');
    } catch (error) {
      if (error?.name === 'AbortError') {
        this.dom.sourceManager?.setLocalFolderStatus('Folder selection cancelled.', 'neutral');
        return;
      }
      this.dom.sourceManager?.setLocalFolderStatus(`Folder selection failed: ${error.message}`, 'warn');
      this.setStatus(`Folder selection failed: ${error.message}`, 'warn');
    }
  }

  sourceDisplayLabelFor(providerId, config, fallbackLabel) {
    if (providerId === 'github') {
      const repo = (config.repo || '').trim();
      return repo || 'GitHub';
    }

    if (providerId === 'public-url') {
      const manifestUrl = (config.manifestUrl || '').trim();
      if (!manifestUrl) {
        return 'Public URL';
      }

      try {
        const parsed = new URL(manifestUrl);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parsed.hostname.includes('githubusercontent.com') && parts.length >= 2) {
          return parts[1];
        }

        const file = parts[parts.length - 1] || '';
        const name = file.replace(/\.[^.]+$/, '');
        if (name && !['collection', 'manifest', 'index'].includes(name.toLowerCase())) {
          return name;
        }

        return parsed.hostname.replace(/^www\./i, '') || 'Public URL';
      } catch (error) {
        return 'Public URL';
      }
    }

    if (providerId === 'gdrive') {
      const manifestTitle = (config._manifestTitle || '').trim();
      if (manifestTitle) {
        return manifestTitle;
      }
      if ((config.sourceMode || '') === 'auth-manifest-file') {
        return 'Google Drive (Auth)';
      }
      return 'Google Drive';
    }

    if (providerId === 'local') {
      return (config.localDirectoryName || '').trim() || this.hostNameFromPath(config.path, 'Local folder');
    }

    return fallbackLabel || 'Source';
  }

  sourceDetailLabelFor(providerId, config, fallbackLabel) {
    if (providerId === 'github') {
      const owner = (config.owner || '').trim();
      const repo = (config.repo || '').trim();
      const path = (config.path || '').trim();
      const branch = (config.branch || 'main').trim() || 'main';
      const base = owner && repo ? `${owner}/${repo}` : fallbackLabel;
      const scope = path || '/';
      return `${base} @ ${branch}:${scope}`;
    }

    if (providerId === 'public-url') {
      return (config.manifestUrl || '').trim() || 'Public URL manifest';
    }

    if (providerId === 'gdrive') {
      const fileId = (config._normalizedFileId || config.fileId || '').trim();
      const mode = (config.sourceMode || '').trim() || 'public-manifest-url';
      if (fileId) {
        return mode === 'auth-manifest-file' ? `Google Drive API file ${fileId}` : `Google Drive file ${fileId}`;
      }
      return mode === 'auth-manifest-file' ? 'Google Drive API manifest' : 'Google Drive manifest';
    }

    if (providerId === 'local') {
      const folderName = (config.localDirectoryName || '').trim();
      if (folderName) {
        return `${folderName} (host root)`;
      }
      return (config.path || '').trim() || 'Local folder';
    }

    return fallbackLabel || 'Source';
  }

  sanitizeSourceConfig(providerId, config = {}) {
    if (providerId === 'github') {
      return {
        owner: (config.owner || '').trim(),
        repo: (config.repo || '').trim(),
        branch: (config.branch || 'main').trim() || 'main',
        path: (config.path || '').trim(),
      };
    }

    if (providerId === 'public-url') {
      return {
        manifestUrl: (config.manifestUrl || '').trim(),
      };
    }

    if (providerId === 'gdrive') {
      return {
        sourceMode: (config.sourceMode || 'public-manifest-url').trim() || 'public-manifest-url',
        manifestUrl: (config.manifestUrl || '').trim(),
        fileId: (config.fileId || '').trim(),
        oauthClientId: (config.oauthClientId || '').trim(),
      };
    }

    if (providerId === 'local') {
      return {
        path: (config.path || '').trim() || COLLECTOR_CONFIG.defaultLocalManifestPath,
        localDirectoryName: (config.localDirectoryName || '').trim(),
      };
    }

    return {};
  }

  toPersistedSource(source) {
    return {
      id: source.id,
      providerId: source.providerId,
      providerLabel: source.providerLabel,
      displayLabel: source.displayLabel || source.label,
      detailLabel: source.detailLabel || source.label,
      config: this.sanitizeSourceConfig(source.providerId, source.config),
      capabilities: source.capabilities || {},
      authMode: source.authMode || 'public',
      itemCount: source.itemCount || 0,
      status: source.status || '',
      needsReconnect: Boolean(source.needsReconnect),
      needsCredentials: Boolean(source.needsCredentials),
    };
  }

  currentWorkspaceSnapshot() {
    return {
      selectedSourceId: this.state.activeSourceFilter || 'all',
      selectedCollectionId: this.state.selectedCollectionId || 'all',
      selectedItemId: this.state.selectedItemId || null,
      collectionMeta: this.currentCollectionMeta(),
      draftCollectionId: this.draftCollectionId(),
      lastLocalSaveAt: this.state.lastLocalSaveAt || '',
      localDraftCollections: this.state.localDraftCollections || [],
    };
  }

  buildLocalDraftPayload() {
    return {
      savedAt: new Date().toISOString(),
      collectionMeta: this.currentCollectionMeta(),
      manifest: this.state.manifest || null,
      selectedItemId: this.state.selectedItemId || null,
      selectedSourceId: this.state.activeSourceFilter || 'all',
      selectedCollectionId: this.state.selectedCollectionId || 'all',
      localDraftCollections: this.state.localDraftCollections || [],
      assets: this.state.assets.map((item) => ({
        ...item,
        previewUrl: '',
        thumbnailPreviewUrl: '',
        draftUploadStatus: item.draftUploadStatus === 'uploading' ? 'pending-upload' : item.draftUploadStatus,
        workspaceId: item.workspaceId,
        sourceId: item.sourceId,
        sourceAssetId: item.sourceAssetId,
        sourceLabel: item.sourceLabel,
        sourceDisplayLabel: item.sourceDisplayLabel,
        providerId: item.providerId,
        collectionId: item.collectionId || null,
        collectionLabel: item.collectionLabel || '',
      })),
      sources: this.state.sources.map((source) => this.toPersistedSource(source)),
    };
  }

  async persistSourcesToOpfs(payload) {
    return DraftService.persistSourcesToOpfs(this, payload);
  }

  async persistWorkspaceToOpfs(extra = {}) {
    return DraftService.persistWorkspaceToOpfs(this, extra);
  }

  async loadRememberedSourcesFromOpfs() {
    return DraftService.loadRememberedSourcesFromOpfs(this);
  }

  applyWorkspaceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }
    if (Array.isArray(snapshot.localDraftCollections)) {
      this.state.localDraftCollections = snapshot.localDraftCollections
        .filter((entry) => entry && entry.id)
        .map((entry) => ({
          id: String(entry.id),
          title: entry.title || String(entry.id),
          rootPath: this.normalizeCollectionRootPath(entry.rootPath || `${entry.id}/`, entry.id),
        }));
    }

    if (snapshot.collectionMeta && typeof snapshot.collectionMeta === 'object') {
      this.setCollectionMetaFields({
        id: snapshot.collectionMeta.id || this.dom.collectionId.value,
        title: snapshot.collectionMeta.title || this.dom.collectionTitle.value,
        description: snapshot.collectionMeta.description || this.dom.collectionDescription.value,
        license: snapshot.collectionMeta.license || this.dom.collectionLicense.value,
        publisher: snapshot.collectionMeta.publisher || this.dom.collectionPublisher.value,
        language: snapshot.collectionMeta.language || this.dom.collectionLanguage.value,
      });
    }

    if (snapshot.selectedSourceId && (snapshot.selectedSourceId === 'all' || this.state.sources.some((entry) => entry.id === snapshot.selectedSourceId))) {
      this.state.activeSourceFilter = snapshot.selectedSourceId;
    }
    this.renderSourceFilter();

    if (snapshot.selectedCollectionId) {
      this.state.selectedCollectionId = snapshot.selectedCollectionId;
      this.renderCollectionFilter();
    }

    if (
      snapshot.selectedItemId &&
      this.state.assets.some((entry) => entry.workspaceId === snapshot.selectedItemId)
    ) {
      this.state.selectedItemId = snapshot.selectedItemId;
    }
  }

  saveSourcesToStorage() {
    const payload = this.state.sources.map((source) => this.toPersistedSource(source));

    try {
      window.localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures in restricted/private browser modes.
    }

    if (!this.state.opfsAvailable) {
      return;
    }

    this.persistSourcesToOpfs(payload)
      .then(() => this.persistWorkspaceToOpfs())
      .catch((error) => {
        this.setLocalDraftStatus(`Local draft save failed: ${error.message}`, 'warn');
      });
  }

  async restoreRememberedSources() {
    let remembered = [];

    if (this.state.opfsAvailable) {
      try {
        remembered = await this.loadRememberedSourcesFromOpfs();
      } catch (error) {
        remembered = [];
      }
    }

    if (!Array.isArray(remembered) || remembered.length === 0) {
      try {
        remembered = JSON.parse(window.localStorage.getItem(SOURCES_STORAGE_KEY) || '[]');
      } catch (error) {
        remembered = [];
      }
    }

    if (!Array.isArray(remembered) || remembered.length === 0) {
      return;
    }

    const restored = remembered
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: entry.id || makeSourceId(entry.providerId || 'source'),
        providerId: entry.providerId,
        providerLabel: entry.providerLabel || this.providerCatalog.find((p) => p.id === entry.providerId)?.label || 'Source',
        displayLabel: entry.displayLabel || entry.label || 'Source',
        detailLabel: entry.detailLabel || entry.label || 'Source',
        label: entry.detailLabel || entry.label || entry.displayLabel || 'Source',
        config: this.sanitizeSourceConfig(entry.providerId, entry.config || {}),
        capabilities: entry.capabilities || this.providerFactories[entry.providerId]?.getCapabilities?.() || {},
        status: (() => {
          if (entry.providerId === 'github') {
            return 'Remembered storage source. Token is not stored; re-enter token if repository requires it.';
          }
          if (entry.providerId === 'gdrive' && entry.config?.sourceMode === 'auth-manifest-file') {
            return 'Remembered storage source. Google access token is session-only; reconnect authentication before refresh.';
          }
          if (entry.providerId === 'local' && entry.config?.localDirectoryName) {
            return 'Remembered local host. Re-select the folder before refresh because browser folder handles are session-scoped.';
          }
          return 'Remembered storage source. Click Refresh to reconnect.';
        })(),
        authMode:
          entry.providerId === 'github'
            ? 'token'
            : entry.providerId === 'gdrive' && entry.config?.sourceMode === 'auth-manifest-file'
              ? 'google-auth'
              : entry.authMode || 'public',
        itemCount: Number(entry.itemCount) || 0,
        provider: null,
        needsReconnect: true,
        needsCredentials: entry.providerId === 'github' || (entry.providerId === 'gdrive' && entry.config?.sourceMode === 'auth-manifest-file'),
      }));

    this.state.sources = restored;
    this.state.assets = [];
    this.state.selectedItemId = null;
    this.state.activeSourceFilter = 'all';
    this.state.currentLevel = 'collections';
    this.state.openedCollectionId = null;
    this.syncMetadataModeFromState();
    this.closeMobileEditor();

    this.setStatus(`Restored ${restored.length} remembered storage source definitions.`, 'neutral');
    this.setConnectionStatus('Remembered storage sources loaded. Refresh to reconnect.', 'neutral');
    this.renderSourcesList();
    this.renderSourceFilter();
    this.renderAssets();
    this.renderEditor();

    for (const source of restored) {
      if (
        source.providerId !== 'github' &&
        !(source.providerId === 'gdrive' && source.config?.sourceMode === 'auth-manifest-file') &&
        !(source.providerId === 'local' && source.config?.localDirectoryName)
      ) {
        // Non-secret sources can reconnect automatically.
        await this.refreshSource(source.id);
      }
    }
  }

  async initializeLocalDraftState() {
    return DraftService.initializeLocalDraftState(this);
  }

  async saveLocalDraft() {
    return DraftService.saveLocalDraft(this);
  }

  applyLocalDraftPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }
    if (Array.isArray(payload.localDraftCollections)) {
      this.state.localDraftCollections = payload.localDraftCollections
        .filter((entry) => entry && entry.id)
        .map((entry) => ({
          id: String(entry.id),
          title: entry.title || String(entry.id),
          rootPath: this.normalizeCollectionRootPath(entry.rootPath || `${entry.id}/`, entry.id),
        }));
    }

    if (payload.collectionMeta && typeof payload.collectionMeta === 'object') {
      this.setCollectionMetaFields({
        id: payload.collectionMeta.id || this.dom.collectionId.value,
        title: payload.collectionMeta.title || this.dom.collectionTitle.value,
        description: payload.collectionMeta.description || this.dom.collectionDescription.value,
        license: payload.collectionMeta.license || this.dom.collectionLicense.value,
        publisher: payload.collectionMeta.publisher || this.dom.collectionPublisher.value,
        language: payload.collectionMeta.language || this.dom.collectionLanguage.value,
      });
    }

    if (Array.isArray(payload.assets)) {
      this.state.assets = payload.assets.map((item) => ({ ...item }));
      for (const source of this.state.sources) {
        this.refreshSourceCollectionsAndCounts(source.id);
      }
      this.renderSourcesList();
    }

    if (payload.manifest && typeof payload.manifest === 'object') {
      this.state.manifest = payload.manifest;
      this.dom.manifestPreview.textContent = JSON.stringify(payload.manifest, null, 2);
    }

    if (payload.selectedSourceId) {
      this.state.activeSourceFilter = payload.selectedSourceId;
    }
    this.renderSourceFilter();

    if (payload.selectedCollectionId) {
      this.state.selectedCollectionId = payload.selectedCollectionId;
      this.renderCollectionFilter();
    }

    if (
      payload.selectedItemId &&
      this.state.assets.some((entry) => entry.workspaceId === payload.selectedItemId)
    ) {
      this.state.selectedItemId = payload.selectedItemId;
    }

    this.renderAssets();
    this.renderEditor();
  }

  async restoreLocalDraft(options = {}) {
    return DraftService.restoreLocalDraft(this, options);
  }

  async discardLocalDraft() {
    return DraftService.discardLocalDraft(this);
  }

  normalizeSourceAssets(source, rawItems) {
    return (rawItems || []).map((item) => {
      const sourceAssetId = item.id;
      const mediaPath = String(item.media?.url || '').trim();
      const fileName = mediaPath
        ? mediaPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() || mediaPath
        : '';
      return {
        ...item,
        fileName: item.fileName || fileName,
        workspaceId: toWorkspaceItemId(source.id, sourceAssetId),
        sourceAssetId,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceDisplayLabel: source.displayLabel || source.label,
        providerId: source.providerId,
        collectionId: item.collectionId || null,
        collectionLabel: item.collectionLabel || '',
        collectionRootPath: item.collectionRootPath || '',
      };
    });
  }

  buildCollectionsForSource(source, normalizedAssets) {
    const grouped = new Map();
    for (const item of normalizedAssets) {
      const collectionId = (item.collectionId || '').trim();
      const collectionLabel = (item.collectionLabel || '').trim();
      if (!collectionId) {
        continue;
      }
      if (!grouped.has(collectionId)) {
        grouped.set(collectionId, {
          id: collectionId,
          title: collectionLabel || collectionId,
          rootPath: this.normalizeCollectionRootPath(item.collectionRootPath || `${collectionId}/`, collectionId),
        });
      }
    }

    if (grouped.size > 0) {
      return Array.from(grouped.values());
    }

    const fallbackId = `${source.id}::default-collection`;
    return [
      {
        id: fallbackId,
        title: source.displayLabel || source.providerLabel || 'Default collection',
        rootPath: this.normalizeCollectionRootPath(`${fallbackId}/`, fallbackId),
      },
    ];
  }

  normalizeCollectionsFromProvider(entries = []) {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries
      .filter((entry) => entry && typeof entry === 'object' && entry.id)
      .map((entry) => ({
        id: String(entry.id),
        title: entry.title || String(entry.id),
        description: entry.description || '',
        license: entry.license || '',
        publisher: entry.publisher || '',
        language: entry.language || '',
        rootPath: this.normalizeCollectionRootPath(entry.rootPath || `${entry.id}/`, entry.id),
        path: entry.path || '',
        collectionJsonPath: entry.collectionJsonPath || '',
        updatedAt: entry.updatedAt || '',
      }));
  }

  mergeSourceAssets(sourceId, nextItems) {
    const withoutSource = this.state.assets.filter((item) => item.sourceId !== sourceId);
    this.state.assets = [...withoutSource, ...nextItems];
  }

  openViewer(itemId) {
    const item = this.state.assets.find((entry) => entry.workspaceId === itemId);
    if (!item) {
      return;
    }

    this.state.viewerItemId = itemId;
    if (this.state.selectedItemId !== itemId) {
      this.state.selectedItemId = itemId;
      this.syncMetadataModeFromState();
      this.renderAssets();
      this.renderEditor();
      if (this.isMobileViewport()) {
        this.openMobileEditor();
      }
    }

    this.renderViewer();
    this.dom.assetViewer?.open();
  }

  closeViewer() {
    this.state.viewerItemId = null;
    this.dom.assetViewer?.clear();
    this.dom.assetViewer?.close();
  }

  renderViewer() {
    const item = this.state.assets.find((entry) => entry.workspaceId === this.state.viewerItemId);
    if (!item) {
      this.closeViewer();
      return;
    }
    this.dom.assetViewer?.setItem(item, (entry) => this.formatSourceBadge(entry));
  }

  renderSourceContext() {
    const source = this.getSourceById(this.state.activeSourceFilter);
    const label = source
      ? (source.displayLabel || source.label || source.providerLabel || 'Host')
      : 'Select host';
    this.dom.managerHeader?.setHostLabel(label);
  }

  renderSourcePicker() {
    const wrap = this.dom.sourcePickerList;
    wrap.innerHTML = '';
    if (this.state.sources.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No hosts connected yet. Use Add host to connect one.';
      wrap.appendChild(empty);
      return;
    }

    for (const source of this.state.sources) {
      const card = document.createElement('article');
      card.className = 'source-card';
      const label = source.displayLabel || source.label || source.providerLabel || 'Host';
      const type = document.createElement('p');
      type.className = 'source-card-label';
      type.textContent = label;
      const meta = document.createElement('p');
      meta.className = 'panel-subtext';
      meta.textContent = `${source.collections?.length || 0} collections`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.type = 'button';
      btn.textContent = 'Use host';
      btn.addEventListener('click', () => {
        this.state.activeSourceFilter = source.id;
        this.state.currentLevel = 'collections';
        this.state.openedCollectionId = null;
        this.state.selectedCollectionId = source.selectedCollectionId || 'all';
        this.state.selectedItemId = null;
        this.syncMetadataModeFromState();
        this.closeMobileEditor();
        this.renderSourceFilter();
        this.renderSourceContext();
        this.renderAssets();
        this.renderEditor();
        this.closeDialog(this.dom.sourcePickerDialog);
      });
      card.append(type, meta, btn);
      wrap.appendChild(card);
    }
  }

  findSelectedCollectionMeta() {
    const id = this.state.selectedCollectionId;
    if (!id || id === 'all') {
      return null;
    }
    if (this.state.activeSourceFilter !== 'all') {
      const source = this.getSourceById(this.state.activeSourceFilter);
      const found = source?.collections?.find((entry) => entry.id === id);
      if (found) return found;
    }
    return this.state.localDraftCollections.find((entry) => entry.id === id) || null;
  }

  openCollectionView(collectionId) {
    return CollectionService.openCollectionView(this, collectionId);
  }

  leaveCollectionView() {
    return CollectionService.leaveCollectionView(this);
  }

  async saveSelectedCollectionMetadata(patch = null) {
    return CollectionService.saveSelectedCollectionMetadata(this, patch || this.dom.metadataEditor.getCollectionPatch());
  }

  renderAssets() {
    this.renderSourceContext();

    const activeLevel = this.state.currentLevel === 'items' ? 'items' : 'collections';
    const activeViewMode = this.state.browserViewModes?.[activeLevel] || 'cards';
    this.applyInspectorModeForViewMode(activeViewMode);

    if (this.state.currentLevel === 'collections') {
      let collections = [];
      if (this.state.activeSourceFilter !== 'all') {
        const src = this.getSourceById(this.state.activeSourceFilter);
        collections = src?.collections || [];
      } else {
        collections = this.state.localDraftCollections;
      }

      this.dom.collectionBrowser.update({
        currentLevel: 'collections',
        viewportTitle: 'Collections',
        assetCountText: `${collections.length} collections`,
        collections,
        items: [],
        selectedCollectionId: this.state.selectedCollectionId,
        selectedItemId: null,
        viewModes: this.state.browserViewModes,
      });
      return;
    }

    const visibleAssets = this.getVisibleAssets().filter((item) => item.collectionId === this.state.openedCollectionId);
    const collection = this.findSelectedCollectionMeta();
    this.dom.collectionBrowser.update({
      currentLevel: 'items',
      viewportTitle: collection?.title || this.state.openedCollectionId || 'Collection',
      assetCountText: `${visibleAssets.length} items`,
      collections: [],
      items: visibleAssets,
      selectedCollectionId: this.state.selectedCollectionId,
      selectedItemId: this.state.selectedItemId,
      viewModes: this.state.browserViewModes,
    });
  }

  selectItem(itemId) {
    if (this.state.selectedItemId === itemId) {
      if (this.isMobileViewport()) {
        this.openMobileEditor();
      }
      return;
    }

    this.state.selectedItemId = itemId;
    this.syncMetadataModeFromState();
    this.renderAssets();
    this.renderEditor();
    if (this.isMobileViewport()) {
      this.openMobileEditor();
    }
    if (this.state.opfsAvailable) {
      this.persistWorkspaceToOpfs().catch(() => {});
    }
  }

  findSelectedItem() {
    return this.state.assets.find((item) => item.workspaceId === this.state.selectedItemId) || null;
  }

  resolveMetadataMode() {
    if (this.state.currentLevel === 'collections') {
      this.state.selectedItemId = null;
      const selectedCollection = this.findSelectedCollectionMeta();
      return selectedCollection ? 'collection' : 'none';
    }

    if (this.state.currentLevel === 'items') {
      if (!this.state.openedCollectionId) {
        this.state.selectedItemId = null;
        return 'none';
      }
      const visibleItems = this.getVisibleAssets().filter((item) => item.collectionId === this.state.openedCollectionId);
      const hasSelectedItem = visibleItems.some((item) => item.workspaceId === this.state.selectedItemId);
      if (!hasSelectedItem) {
        this.state.selectedItemId = null;
      }
      return hasSelectedItem ? 'item' : 'none';
    }

    this.state.selectedItemId = null;
    return 'none';
  }

  syncMetadataModeFromState() {
    const mode = this.resolveMetadataMode();
    this.state.metadataMode = mode;
    return mode;
  }

  renderMetadataMode(mode) {
    this.state.metadataMode = mode;
    this.renderEditor();
  }

  setBrowserViewMode(level, mode) {
    const normalizedLevel = level === 'items' ? 'items' : 'collections';
    const normalizedMode = mode === 'rows' ? 'rows' : 'cards';
    this.state.browserViewModes = {
      ...this.state.browserViewModes,
      [normalizedLevel]: normalizedMode,
    };
    const activeLevel = this.state.currentLevel === 'items' ? 'items' : 'collections';
    if (normalizedLevel === activeLevel) {
      this.applyInspectorModeForViewMode(normalizedMode);
    }
  }

  renderEditor() {
    const metadataMode = this.syncMetadataModeFromState();
    if (metadataMode === 'collection') {
      this.dom.metadataEditor.setView({
        mode: 'collection',
        collection: this.findSelectedCollectionMeta(),
      });
      this.syncEditorVisibility();
      return;
    }

    if (metadataMode === 'item') {
      const selected = this.findSelectedItem();
      const selectedSource = selected ? this.getSourceById(selected.sourceId) : null;
      const canSave = Boolean(selectedSource?.capabilities?.canSaveMetadata);
      this.dom.metadataEditor.setView({
        mode: 'item',
        item: selected,
        canSaveItem: canSave,
      });
      this.syncEditorVisibility();
      return;
    }

    this.dom.metadataEditor.setView({ mode: 'none' });
    this.syncEditorVisibility();
  }

  collectEditorPatch() {
    return this.dom.metadataEditor.getItemPatch();
  }

  async updateItem(id, patch, options = {}) {
    const current = this.state.assets.find((item) => item.workspaceId === id);
    if (!current) {
      this.setStatus(`Could not find item ${id}`, 'warn');
      return;
    }

    const source = this.getSourceById(current.sourceId);
    const canSave = Boolean(source?.capabilities?.canSaveMetadata) && !current.isLocalDraftAsset;

    if (canSave && source?.provider) {
      try {
        this.setStatus('Saving metadata...', 'neutral');
        const updated = await source.provider.saveMetadata(current.sourceAssetId, patch);
        if (!updated) {
          this.setStatus(`Save failed: provider returned no updated item for ${current.id}`, 'warn');
          return;
        }

        const next = {
          ...updated,
          workspaceId: current.workspaceId,
          sourceAssetId: updated.id || current.sourceAssetId,
          sourceId: current.sourceId,
          sourceLabel: current.sourceLabel,
          sourceDisplayLabel: current.sourceDisplayLabel,
          providerId: current.providerId,
        };
        this.state.assets = this.state.assets.map((item) => (item.workspaceId === id ? next : item));
        this.setStatus(
          source?.providerId === 'github' ? 'Metadata saved to GitHub.' : 'Metadata saved.',
          'ok',
        );
      } catch (error) {
        this.state.assets = this.state.assets.map((item) => {
          if (item.workspaceId !== id) {
            return item;
          }
          return {
            ...item,
            ...patch,
            media: {
              ...(item.media || {}),
              ...(patch.media || {}),
            },
          };
        });
        this.setStatus(`Save failed: ${error.message}. Local edits were kept.`, 'warn');
      }
    } else {
      this.state.assets = this.state.assets.map((item) => {
        if (item.workspaceId !== id) {
          return item;
        }
        return {
          ...item,
          ...patch,
          media: {
            ...(item.media || {}),
            ...(patch.media || {}),
          },
        };
      });
      this.setStatus('Source is read-only. Changes are local to this workspace session.', 'warn');
    }

    if (options.explicitSave && !canSave) {
      if (current.isLocalDraftAsset) {
        this.setStatus('Local draft metadata saved. Publish to upload this asset.', 'ok');
      } else {
        this.setStatus('Selected item source is read-only. Changes are local only.', 'warn');
      }
    }

    this.renderAssets();
    this.renderEditor();
  }

  async connectCurrentProvider() {
    const providerId = this.state.selectedProviderId;
    const providerFactory = this.providers[providerId];
    const selectedProvider = this.providerCatalog.find((entry) => entry.id === providerId);

    if (!providerFactory || selectedProvider?.enabled === false) {
      this.setConnectionStatus('Selected storage source type is not yet available.', false);
      this.setStatus('Selected storage source type is not yet available.', 'warn');
      return;
    }

    const config = this.collectCurrentProviderConfig(providerId);

    if (providerId === 'local' && !config.localDirectoryHandle) {
      this.setConnectionStatus('Select a local folder first.', false);
      this.setStatus('Select a local folder before adding this host.', 'warn');
      return;
    }

    const provider = providerFactory();

    if (providerId === 'gdrive' && config.sourceMode === 'public-manifest-url' && config.manifestUrl) {
      const normalized = normalizeGoogleDriveManifestUrl(config.manifestUrl);
      if (!normalized.ok) {
        this.setConnectionStatus(normalized.message || 'Invalid Google Drive file URL.', false);
        this.setStatus(normalized.message || 'Invalid Google Drive file URL.', 'warn');
        return;
      }
    }

    try {
      const result = await provider.connect(config);
      this.renderCapabilities(provider);

      if (!result.ok) {
        this.setConnectionStatus(result.message, false);
        this.setStatus(result.message, 'warn');
        this.renderAssets();
        this.renderEditor();
        return;
      }

      this.setConnectionStatus(result.message, true);

      const loaded = await provider.listAssets();
      const derivedConfig = { ...config };
      if (providerId === 'gdrive') {
        derivedConfig._manifestTitle = result.sourceDisplayLabel || '';
        derivedConfig._normalizedFileId = result.fileId || '';
        derivedConfig._normalizedManifestUrl = result.normalizedManifestUrl || '';
      }
      if (providerId === 'local' && result.sourceDisplayLabel) {
        derivedConfig.localDirectoryName = result.sourceDisplayLabel;
      }
      const displayLabel =
        result.sourceDisplayLabel ||
        this.sourceDisplayLabelFor(providerId, derivedConfig, selectedProvider?.label || providerId);
      const detailLabel =
        result.sourceDetailLabel ||
        this.sourceDetailLabelFor(providerId, derivedConfig, selectedProvider?.label || providerId);
      const source = {
        id: makeSourceId(providerId),
        providerId,
        providerLabel: selectedProvider?.label || providerId,
        label: detailLabel,
        displayLabel,
        detailLabel,
        config: { ...config, ...(providerId === 'gdrive' ? { fileId: result.fileId || '' } : {}) },
        capabilities: provider.getCapabilities(),
        status: result.message,
        authMode:
          providerId === 'github'
            ? (config.token || '').trim()
              ? 'token'
              : 'public'
            : providerId === 'local' && config.localDirectoryHandle
              ? 'local-folder'
            : providerId === 'gdrive' && config.sourceMode === 'auth-manifest-file'
              ? 'google-auth'
              : 'public',
        itemCount: loaded.length,
        provider,
        needsReconnect: false,
        needsCredentials: providerId === 'gdrive' && config.sourceMode === 'auth-manifest-file' ? !(config.accessToken || '').trim() : false,
        collections: [],
        selectedCollectionId: null,
      };

      const normalized = this.normalizeSourceAssets(source, loaded);
      const providerCollections = Array.isArray(result.collections)
        ? this.normalizeCollectionsFromProvider(result.collections)
        : null;
      const collections = providerCollections || this.buildCollectionsForSource(source, normalized);
      const defaultCollectionId = collections[0]?.id || null;
      const normalizedWithCollections = normalized.map((item) => ({
        ...item,
        collectionId: item.collectionId || defaultCollectionId,
        collectionLabel: item.collectionLabel || collections.find((entry) => entry.id === (item.collectionId || defaultCollectionId))?.title || '',
      }));
      source.collections = collections;
      source.selectedCollectionId = defaultCollectionId;
      if (providerId === 'local' && config.localDirectoryHandle) {
        this.selectedLocalDirectoryHandle = config.localDirectoryHandle;
      }
      this.state.sources = [...this.state.sources, source];
      this.state.assets = [...this.state.assets, ...normalizedWithCollections];
      if (providerId === 'local') {
        await this.hydrateLocalSourceAssetPreviews(source.id);
      }
      this.state.activeSourceFilter = source.id;
      this.state.selectedCollectionId = source.selectedCollectionId || 'all';
      this.state.currentLevel = 'collections';
      this.state.openedCollectionId = null;
      this.state.selectedItemId = null;
      this.syncMetadataModeFromState();
      this.closeMobileEditor();
      this.state.manifest = null;
      this.dom.manifestPreview.textContent = '{}';

      this.setStatus(`Added storage source ${displayLabel} (${loaded.length} items).`, 'ok');
      this.renderSourcesList();
      this.renderSourceFilter();
      this.renderAssets();
      this.renderEditor();
      this.saveSourcesToStorage();
    } catch (error) {
      this.setConnectionStatus(`Connection error: ${error.message}`, false);
      this.setStatus(`Connection error: ${error.message}`, 'warn');
    }
  }

  inspectSource(sourceId) {
    const source = this.getSourceById(sourceId);
    if (!source) {
      return;
    }

    this.setSelectedProvider(source.providerId);
    const nextConfigValues = {};
    if (source.providerId === 'github') {
      nextConfigValues.githubToken = source.config.token || '';
      nextConfigValues.githubOwner = source.config.owner || '';
      nextConfigValues.githubRepo = source.config.repo || '';
      nextConfigValues.githubBranch = source.config.branch || 'main';
      nextConfigValues.githubPath = source.config.path || '';
    }
    if (source.providerId === 'public-url') {
      nextConfigValues.publicUrlInput = source.config.manifestUrl || '';
    }
    if (source.providerId === 'gdrive') {
      nextConfigValues.gdriveSourceMode = source.config.sourceMode || 'public-manifest-url';
      nextConfigValues.gdriveUrlInput = source.config.manifestUrl || '';
      nextConfigValues.gdriveFileIdInput = source.config.fileId || '';
      nextConfigValues.gdriveClientIdInput = source.config.oauthClientId || COLLECTOR_CONFIG.googleDriveOAuth?.clientId || '';
      nextConfigValues.gdriveAccessTokenInput = '';
      this.setGoogleDriveAuthStatus(
        source.config.sourceMode === 'auth-manifest-file'
          ? 'Re-authentication required before refresh.'
          : 'Public shared URL mode selected.',
        source.config.sourceMode === 'auth-manifest-file' ? 'warn' : 'neutral',
      );
    }
    if (source.providerId === 'local') {
      nextConfigValues.localPathInput = source.config.path || COLLECTOR_CONFIG.defaultLocalManifestPath;
      nextConfigValues.localFolderName = source.config.localDirectoryName || '';
      this.selectedLocalDirectoryHandle =
        source.config?.localDirectoryHandle && source.config.localDirectoryHandle.kind === 'directory'
          ? source.config.localDirectoryHandle
          : null;
    }
    this.dom.sourceManager?.setConfigValues(nextConfigValues);

    this.setConnectionStatus(`Inspecting storage source: ${source.label}`, true);
  }

  async refreshSource(sourceId) {
    const source = this.getSourceById(sourceId);
    if (!source) {
      return;
    }

    const providerFactory = this.providers[source.providerId];
    if (!providerFactory) {
      this.setStatus(`Storage source type for ${source.label} is unavailable.`, 'warn');
      return;
    }

    try {
      const provider = providerFactory();
      const refreshConfig = { ...(source.config || {}) };
      if (source.providerId === 'local' && this.selectedLocalDirectoryHandle) {
        refreshConfig.localDirectoryHandle = this.selectedLocalDirectoryHandle;
        if (!refreshConfig.localDirectoryName) {
          refreshConfig.localDirectoryName = this.selectedLocalDirectoryHandle.name || refreshConfig.localDirectoryName || '';
        }
      }
      const result = await provider.connect(refreshConfig);
      if (!result.ok) {
        const next = {
          ...source,
          status: result.message,
          needsReconnect: true,
          needsCredentials:
            source.providerId === 'github' ||
            (source.providerId === 'gdrive' && source.config?.sourceMode === 'auth-manifest-file'),
        };
        this.state.sources = this.state.sources.map((entry) => (entry.id === sourceId ? next : entry));
        this.renderSourcesList();
        this.saveSourcesToStorage();
        this.setConnectionStatus(result.message, false);
        this.setStatus(`Refresh failed: ${result.message}`, 'warn');
        return;
      }

      const loaded = await provider.listAssets();
      const refreshedConfig = { ...refreshConfig };
      if (source.providerId === 'gdrive') {
        refreshedConfig._manifestTitle = result.sourceDisplayLabel || source.displayLabel || '';
        refreshedConfig._normalizedFileId = result.fileId || source.config?.fileId || '';
        refreshedConfig._normalizedManifestUrl = result.normalizedManifestUrl || '';
      }
      if (source.providerId === 'local' && result.sourceDisplayLabel) {
        refreshedConfig.localDirectoryName = result.sourceDisplayLabel;
      }
      const displayLabel =
        result.sourceDisplayLabel || this.sourceDisplayLabelFor(source.providerId, refreshedConfig, source.providerLabel);
      const detailLabel =
        result.sourceDetailLabel || this.sourceDetailLabelFor(source.providerId, refreshedConfig, source.providerLabel);
      const updatedSource = {
        ...source,
        provider,
        capabilities: provider.getCapabilities(),
        itemCount: loaded.length,
        status: result.message,
        authMode:
          source.providerId === 'gdrive' && source.config?.sourceMode === 'auth-manifest-file'
            ? 'google-auth'
            : source.authMode,
        displayLabel,
        detailLabel,
        label: detailLabel,
        config:
          source.providerId === 'gdrive'
            ? {
                ...refreshConfig,
                fileId: result.fileId || source.config?.fileId || '',
                sourceMode: source.config?.sourceMode || 'public-manifest-url',
              }
            : refreshConfig,
        collections: source.collections || [],
        selectedCollectionId: source.selectedCollectionId || null,
        needsReconnect: false,
        needsCredentials: false,
      };
      const normalized = this.normalizeSourceAssets(updatedSource, loaded);
      const providerCollections = Array.isArray(result.collections)
        ? this.normalizeCollectionsFromProvider(result.collections)
        : null;
      const collections = providerCollections || this.buildCollectionsForSource(updatedSource, normalized);
      const defaultCollectionId = collections[0]?.id || null;
      const normalizedWithCollections = normalized.map((item) => ({
        ...item,
        collectionId: item.collectionId || defaultCollectionId,
        collectionLabel: item.collectionLabel || collections.find((entry) => entry.id === (item.collectionId || defaultCollectionId))?.title || '',
      }));
      updatedSource.collections = collections;
      updatedSource.selectedCollectionId =
        (updatedSource.selectedCollectionId && collections.some((entry) => entry.id === updatedSource.selectedCollectionId))
          ? updatedSource.selectedCollectionId
          : defaultCollectionId;

      this.state.sources = this.state.sources.map((entry) => (entry.id === sourceId ? updatedSource : entry));
      this.mergeSourceAssets(sourceId, normalizedWithCollections);
      if (source.providerId === 'local') {
        await this.hydrateLocalSourceAssetPreviews(sourceId);
      }

      if (this.state.selectedItemId && !this.state.assets.some((item) => item.workspaceId === this.state.selectedItemId)) {
        this.state.selectedItemId = this.getVisibleAssets()[0]?.workspaceId || this.state.assets[0]?.workspaceId || null;
      }
      if (this.state.viewerItemId && !this.state.assets.some((item) => item.workspaceId === this.state.viewerItemId)) {
        this.closeViewer();
      } else if (this.state.viewerItemId) {
        this.renderViewer();
      }

      this.setConnectionStatus(`Refreshed storage source ${updatedSource.label}.`, true);
      this.setStatus(`Refreshed storage source ${updatedSource.label}.`, 'ok');
      this.renderSourcesList();
      this.renderSourceFilter();
      this.renderAssets();
      this.renderEditor();
      this.saveSourcesToStorage();
    } catch (error) {
      const next = {
        ...source,
        status: `Refresh error: ${error.message}`,
        needsReconnect: true,
        needsCredentials:
          source.providerId === 'github' ||
          (source.providerId === 'gdrive' && source.config?.sourceMode === 'auth-manifest-file'),
      };
      this.state.sources = this.state.sources.map((entry) => (entry.id === sourceId ? next : entry));
      this.renderSourcesList();
      this.saveSourcesToStorage();
      this.setConnectionStatus(`Refresh error: ${error.message}`, false);
      this.setStatus(`Refresh error: ${error.message}`, 'warn');
    }
  }

  removeSource(sourceId) {
    const source = this.getSourceById(sourceId);
    if (!source) {
      return;
    }

    this.state.sources = this.state.sources.filter((entry) => entry.id !== sourceId);
    this.state.assets = this.state.assets.filter((entry) => entry.sourceId !== sourceId);
    if (this.state.sources.length === 0) {
      this.closeMobileEditor();
    }

    if (this.state.selectedItemId && !this.state.assets.some((item) => item.workspaceId === this.state.selectedItemId)) {
      this.state.selectedItemId = null;
    }
    if (this.state.viewerItemId && !this.state.assets.some((item) => item.workspaceId === this.state.viewerItemId)) {
      this.closeViewer();
    }
    this.syncMetadataModeFromState();

    if (this.state.sources.length === 0) {
      this.setConnectionStatus('No hosts connected.', 'neutral');
      this.setStatus('No hosts connected.', 'neutral');
    } else {
      this.setStatus(`Removed storage source ${source.label}.`, 'ok');
    }

    this.state.manifest = null;
    this.dom.manifestPreview.textContent = '{}';
    this.renderSourcesList();
    this.renderSourceFilter();
    this.renderAssets();
    this.renderEditor();
    this.saveSourcesToStorage();
  }

  currentCollectionMeta() {
    const collectionId = this.dom.collectionId.value.trim() || COLLECTOR_CONFIG.defaultCollectionMeta.id;
    return {
      id: collectionId,
      title: this.dom.collectionTitle.value.trim() || COLLECTOR_CONFIG.defaultCollectionMeta.title,
      description:
        this.dom.collectionDescription.value.trim() || COLLECTOR_CONFIG.defaultCollectionMeta.description,
      license: this.dom.collectionLicense.value.trim(),
      publisher: this.dom.collectionPublisher.value.trim(),
      language: this.dom.collectionLanguage.value.trim(),
      rootPath: this.activeCollectionRootPath() || this.normalizeCollectionRootPath(`${collectionId}/`, collectionId),
    };
  }

  toManifestItem(item) {
    return ManifestService.toManifestItem(this, item);
  }

  buildManifestFromState() {
    return ManifestService.buildManifestFromState(this);
  }

  async generateManifest(options = {}) {
    return ManifestService.generateManifest(this, options);
  }

  resolvePublishSource() {
    if (!this.state.sources.length) {
      return null;
    }
    if (this.state.activeSourceFilter === 'all') {
      return null;
    }
    return this.getSourceById(this.state.activeSourceFilter);
  }

  async publishActiveSourceDraft() {
    const source = this.resolvePublishSource();
    if (!source) {
      this.setStatus('Select a single source in the viewport filter before publishing.', 'warn');
      return;
    }

    if (source.providerId !== 'github') {
      this.setStatus('Publish upload is currently implemented for GitHub sources only.', 'warn');
      return;
    }

    if (!source.provider || typeof source.provider.publishCollection !== 'function') {
      this.setStatus('This source does not support upload publishing yet.', 'warn');
      return;
    }
    if ((this.state.selectedCollectionId || 'all') === 'all') {
      this.setStatus('Select one collection before publishing.', 'warn');
      return;
    }

    const manifest = await this.generateManifest({ silent: true });
    if (!manifest) {
      return;
    }
    const collectionRootPath = this.activeCollectionRootPath() || this.normalizeCollectionRootPath(`${manifest.id}/`, manifest.id);

    const pending = this.state.assets.filter(
      (item) =>
        item.sourceId === source.id &&
        item.collectionId === this.state.selectedCollectionId &&
        item.isLocalDraftAsset &&
        item.include !== false &&
        item.draftUploadStatus !== 'uploaded',
    );

    if (pending.length === 0) {
      this.setStatus('No pending local assets. Uploading manifest only...', 'neutral');
    } else {
      this.setStatus(`Uploading ${pending.length} asset(s) to GitHub...`, 'neutral');
    }

    this.state.assets = this.state.assets.map((item) => {
      if (!pending.some((entry) => entry.workspaceId === item.workspaceId)) {
        return item;
      }
      return {
        ...item,
        draftUploadStatus: 'uploading',
        uploadError: '',
      };
    });
    this.renderAssets();
    this.renderEditor();

    const uploads = [];
    let failedPreparationCount = 0;
    for (const item of pending) {
      const original = await this.loadLocalAssetBlob(item, 'original');
      if (!original) {
        failedPreparationCount += 1;
        this.state.assets = this.state.assets.map((entry) =>
          entry.workspaceId === item.workspaceId
            ? { ...entry, draftUploadStatus: 'failed', uploadError: 'Original file missing from local draft storage.' }
            : entry,
        );
        continue;
      }

      uploads.push({
        path: this.joinCollectionRootPath(collectionRootPath, item.media?.url || ''),
        blob: original,
        message: `Upload ${item.id} original via Open Collections Manager`,
      });

      const thumb = await this.loadLocalAssetBlob(item, 'thumbnail');
      if (thumb && item.thumbnailRepoPath) {
        uploads.push({
          path: this.joinCollectionRootPath(collectionRootPath, item.thumbnailRepoPath),
          blob: thumb,
          message: `Upload ${item.id} thumbnail via Open Collections Manager`,
        });
      }
    }

    if (failedPreparationCount > 0) {
      this.renderAssets();
      this.renderEditor();
      this.setStatus(`${failedPreparationCount} asset(s) failed local draft preparation. Fix and retry publish.`, 'warn');
      return;
    }

    try {
      await source.provider.publishCollection({
        manifest,
        uploads,
        collectionRootPath,
        commitMessage: `Publish collection ${manifest.id} via Open Collections Manager`,
      });

      this.state.assets = this.state.assets.map((item) => {
        if (item.sourceId !== source.id || !item.isLocalDraftAsset) {
          return item;
        }
        const nextMediaRelativePath = item.media?.url || '';
        const nextThumbRelativePath = item.thumbnailRepoPath || item.media?.thumbnailUrl || '';
        return {
          ...item,
          media: {
            ...(item.media || {}),
            url: nextMediaRelativePath,
            thumbnailUrl: nextThumbRelativePath,
          },
          draftUploadStatus: 'uploaded',
          isLocalDraftAsset: false,
          uploadError: '',
        };
      });

      source.status = `Published ${manifest.id} to ${collectionRootPath}`;
      this.state.manifest = manifest;
      this.dom.manifestPreview.textContent = JSON.stringify(manifest, null, 2);
      this.refreshSourceCollectionsAndCounts(source.id);
      this.renderSourcesList();
      this.renderSourceFilter();
      this.renderCollectionFilter();
      this.state.currentLevel = 'collections';
      this.state.openedCollectionId = null;
      this.state.selectedItemId = null;
      this.syncMetadataModeFromState();
      this.closeMobileEditor();
      this.renderSourceContext();
      this.renderAssets();
      this.renderEditor();

      if (this.state.opfsAvailable) {
        await this.saveLocalDraft();
      }
      this.setStatus('Upload complete. GitHub media, thumbnails, and collection.json published.', 'ok');
    } catch (error) {
      this.state.assets = this.state.assets.map((item) => {
        if (item.sourceId !== source.id || item.draftUploadStatus !== 'uploading') {
          return item;
        }
        return {
          ...item,
          draftUploadStatus: 'failed',
          uploadError: error.message,
        };
      });
      this.renderAssets();
      this.renderEditor();
      this.setStatus(`Upload failed: ${error.message}`, 'warn');
    }
  }

  async copyManifestToClipboard() {
    return ManifestService.copyManifestToClipboard(this);
  }

  downloadManifest() {
    return ManifestService.downloadManifest(this);
  }
}

if (!customElements.get('open-collections-manager')) {
  customElements.define('open-collections-manager', OpenCollectionsManagerElement);
}

