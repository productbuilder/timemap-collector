import { validateCollectionShape } from '../../../packages/collector-schema/src/schema.js';
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

function makeSourceId(providerId) {
  return `${providerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toWorkspaceItemId(sourceId, itemId) {
  return `${sourceId}::${itemId}`;
}

const SOURCES_STORAGE_KEY = 'timemap_collector_sources_v1';
const WORKSPACE_FILE_PATH = 'workspace.json';
const COLLECTIONS_DIR_PATH = 'collections';
const SOURCES_DIR_PATH = 'sources';
const DRAFT_ASSETS_DIR_PATH = 'draft-assets';
const IMAGE_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

class OpenCollectionsManagerElement extends HTMLElement {
  constructor() {
	super();

	this.state = {
	  sources: [],
	  assets: [],
	  selectedItemId: null,
	  viewerItemId: null,
	  selectedProviderId: 'github',
	  activeSourceFilter: 'all',
	  selectedCollectionId: 'all',
	  currentLevel: 'collections',
	  metadataMode: 'collection',
	  openedCollectionId: null,
	  mobileEditorOpen: false,
	  publishDestination: null,
	  manifest: null,
	  opfsAvailable: false,
	  opfsStatus: 'Checking local draft storage...',
	  lastLocalSaveAt: '',
	  isDropTargetActive: false,
	  localDraftCollections: [],
	};

	this.opfsStorage = createOpfsStorage();
	this._autosaveTimer = null;
	this.localAssetBlobs = new Map();
	this.objectUrls = new Set();

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
		...this.providerFactories.github.getDescriptor(),
		label: 'GitHub repository',
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
	  {
		id: 'wordpress',
		label: 'WordPress / CMS',
		category: 'external',
		enabled: false,
		statusLabel: 'Planned',
		description: 'Manage collections linked to CMS-managed media libraries.',
	  },
	  {
		id: 'wikimedia',
		label: 'Wikimedia Commons',
		category: 'external',
		enabled: false,
		statusLabel: 'Planned',
		description: 'Import media and metadata from Wikimedia Commons.',
	  },
	  {
		id: 'internet-archive',
		label: 'Internet Archive',
		category: 'external',
		enabled: false,
		statusLabel: 'Planned',
		description: 'Browse and load assets from Archive.org items.',
	  },
	  this.providerFactories.local.getDescriptor(),
	];

	this.shadow = this.attachShadow({ mode: 'open' });
	this.renderShell();
	this.cacheDom();
	this.editorViews = {
	  none: this.dom.editorEmpty,
	  collection: this.dom.collectionEditorForm,
	  item: this.dom.editorForm,
	};
  }

  connectedCallback() {
	this.bindEvents();
	this.setStatus('No hosts connected yet.', 'neutral');
	this.setConnectionStatus('No hosts connected.', 'neutral');
	this.renderCapabilities(this.providerFactories.local.getCapabilities());
	this.renderProviderCatalog();
	this.setSelectedProvider('github');
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
	window.addEventListener('resize', () => this.syncEditorVisibility());
  }

  renderShell() {
	this.shadow.innerHTML = `
	  <style>
		:host {
		  display: block;
		  color: #111827;
		  font-family: "Segoe UI", Tahoma, sans-serif;
		}

		* {
		  box-sizing: border-box;
		}

		[hidden] {
		  display: none !important;
		}

		.app-shell {
		  height: min(100dvh, 100vh);
		  min-height: 640px;
		  background: #f3f5f8;
		  border: 1px solid #e5e7eb;
		  border-radius: 10px;
		  overflow: hidden;
		  display: flex;
		  flex-direction: column;
		}

		.topbar {
		  background: #ffffff;
		  border-bottom: 1px solid #e5e7eb;
		  padding: 0.85rem 1rem;
		  display: flex;
		  align-items: center;
		  justify-content: space-between;
		  gap: 1rem;
		}

		.brand {
		  display: grid;
		  gap: 0.15rem;
		}

		.title {
		  margin: 0;
		  font-size: 1rem;
		  font-weight: 700;
		}

		.status {
		  margin: 0;
		  font-size: 0.85rem;
		  color: #64748b;
		}

		.top-actions {
		  display: flex;
		  align-items: center;
		  gap: 0.5rem;
		  flex-wrap: wrap;
		}

		.btn {
		  border: 1px solid #cbd5e1;
		  background: #ffffff;
		  color: #0f172a;
		  border-radius: 8px;
		  padding: 0.42rem 0.7rem;
		  cursor: pointer;
		  font: inherit;
		  font-size: 0.88rem;
		  font-weight: 600;
		}

		.btn:hover {
		  background: #f8fafc;
		}

		.btn-primary {
		  background: #0f6cc6;
		  color: #ffffff;
		  border-color: #0f6cc6;
		}

		.btn-primary:hover {
		  background: #0d5eae;
		}

		.content-grid {
		  flex: 1;
		  min-height: 0;
		  padding: 0.95rem;
		  display: grid;
		  gap: 0.95rem;
		  grid-template-columns: minmax(0, 1fr) 350px;
		  align-items: stretch;
		  overflow: hidden;
		}

		.panel {
		  background: #ffffff;
		  border: 1px solid #e2e8f0;
		  border-radius: 10px;
		  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
		}

		.viewport-panel {
		  display: grid;
		  grid-template-rows: auto 1fr;
		  min-height: 0;
		  overflow: hidden;
		}

		.panel-header {
		  padding: 0.8rem 0.95rem;
		  border-bottom: 1px solid #e2e8f0;
		  display: grid;
		  grid-template-columns: minmax(0, 1fr) auto;
		  align-items: center;
		  gap: 0.7rem;
		}

		.panel-heading-left {
		  display: flex;
		  align-items: center;
		  gap: 0.45rem;
		  min-width: 0;
		}

		.panel-header-meta {
		  display: flex;
		  align-items: center;
		  gap: 0.55rem;
		  flex-wrap: wrap;
		  justify-content: flex-end;
		}

		.panel-title {
		  margin: 0;
		  font-size: 0.95rem;
		  min-width: 0;
		  white-space: nowrap;
		  overflow: hidden;
		  text-overflow: ellipsis;
		}

		.panel-subtext {
		  margin: 0;
		  font-size: 0.83rem;
		  color: #64748b;
		}

		.asset-wrap {
		  padding: 0.9rem;
		  overflow: auto;
		  min-height: 0;
		}

		.asset-grid {
		  display: grid;
		  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		  gap: 0.7rem;
		}

		.asset-card {
		  border: 1px solid #dbe3ec;
		  border-radius: 9px;
		  padding: 0.55rem;
		  background: #ffffff;
		  display: grid;
		  gap: 0.5rem;
		  cursor: pointer;
		  transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
		}

		.collection-card {
		  min-height: 148px;
		  padding: 0.75rem;
		  gap: 0.65rem;
		}

		.asset-card:hover {
		  border-color: #93c5fd;
		  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
		  background: #f8fbff;
		}

		.asset-card:focus-visible {
		  outline: 2px solid #2563eb;
		  outline-offset: 2px;
		}

		.asset-card.is-selected {
		  border-color: #0f6cc6;
		  box-shadow: 0 0 0 1px #66a6e8 inset, 0 3px 10px rgba(15, 108, 198, 0.16);
		  background: #f5faff;
		}

		.thumb {
		  width: 100%;
		  height: 125px;
		  object-fit: cover;
		  border-radius: 7px;
		  border: 1px solid #dbe3ec;
		  background: #eef2f7;
		}

		.thumb-placeholder {
		  width: 100%;
		  height: 125px;
		  border-radius: 7px;
		  border: 1px dashed #cbd5e1;
		  display: grid;
		  place-items: center;
		  color: #64748b;
		  background: #f8fafc;
		  font-size: 0.82rem;
		}

		.card-title {
		  margin: 0;
		  font-size: 0.88rem;
		  font-weight: 700;
		}

		.badge-row {
		  display: flex;
		  flex-wrap: wrap;
		  gap: 0.35rem;
		}

		.badge {
		  font-size: 0.75rem;
		  padding: 0.15rem 0.4rem;
		  border-radius: 999px;
		  border: 1px solid #cbd5e1;
		  color: #475569;
		  background: #f8fafc;
		}

		.badge.ok {
		  border-color: #86efac;
		  background: #f0fdf4;
		  color: #166534;
		}

		.badge.warn {
		  border-color: #fed7aa;
		  background: #fff7ed;
		  color: #9a3412;
		}

		.badge.source-badge {
		  border-color: #bfdbfe;
		  background: #eff6ff;
		  color: #1d4ed8;
		}

		.card-actions {
		  display: flex;
		  gap: 0.45rem;
		}

		.card-actions .btn {
		  flex: 1;
		}

		.empty {
		  border: 1px dashed #cbd5e1;
		  border-radius: 8px;
		  padding: 1rem;
		  text-align: center;
		  color: #64748b;
		  background: #f8fafc;
		  font-size: 0.9rem;
		}

		.editor-panel {
		  display: grid;
		  grid-template-rows: auto minmax(0, 1fr);
		  min-height: 0;
		  overflow: hidden;
		}

		.editor-close-btn {
		  display: none;
		}

		.more-actions-btn {
		  display: none;
		}

		.icon-btn {
		  min-width: 2rem;
		  padding: 0.3rem 0.45rem;
		  font-weight: 700;
		  line-height: 1;
		  justify-content: center;
		}

		.editor-header-meta {
		  display: flex;
		  align-items: center;
		  gap: 0.5rem;
		  min-width: 0;
		  justify-content: flex-end;
		}

		.editor-context {
		  margin: 0;
		  font-size: 0.78rem;
		  color: #64748b;
		  white-space: nowrap;
		  overflow: hidden;
		  text-overflow: ellipsis;
		  max-width: 200px;
		}

		.editor-content {
		  min-height: 0;
		  overflow: auto;
		}

		.editor-wrap {
		  padding: 0.95rem;
		  display: grid;
		  gap: 0.6rem;
		  align-content: start;
		  min-height: 0;
		}

		.field-row {
		  display: grid;
		  gap: 0.25rem;
		}

		.field-row > label {
		  font-size: 0.8rem;
		  color: #475569;
		  font-weight: 600;
		}

		input,
		textarea,
		select {
		  width: 100%;
		  font: inherit;
		  font-size: 0.9rem;
		  border: 1px solid #cbd5e1;
		  border-radius: 8px;
		  padding: 0.45rem 0.55rem;
		  background: #ffffff;
		  color: #0f172a;
		}

		textarea {
		  resize: vertical;
		  min-height: 78px;
		}

		.checkbox-row {
		  display: flex;
		  justify-content: space-between;
		  align-items: center;
		  gap: 0.5rem;
		  font-size: 0.84rem;
		  color: #334155;
		  padding-top: 0.2rem;
		}

		.checkbox-row input {
		  width: auto;
		}

		dialog {
		  width: min(780px, 94vw);
		  border: 1px solid #dbe3ec;
		  border-radius: 12px;
		  padding: 0;
		  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
		  background: #ffffff;
		}

		dialog::backdrop {
		  background: rgba(15, 23, 42, 0.45);
		}

		.dialog-shell {
		  display: grid;
		  grid-template-rows: auto 1fr;
		  max-height: min(82vh, 760px);
		}

		.dialog-header {
		  display: flex;
		  justify-content: space-between;
		  align-items: center;
		  gap: 0.75rem;
		  padding: 0.8rem 0.95rem;
		  border-bottom: 1px solid #e2e8f0;
		}

		.dialog-title {
		  margin: 0;
		  font-size: 0.95rem;
		}

		.dialog-body {
		  padding: 0.95rem;
		  overflow: auto;
		  display: grid;
		  gap: 0.7rem;
		  align-content: start;
		}

		.dialog-actions {
		  display: flex;
		  gap: 0.5rem;
		  flex-wrap: wrap;
		}

		.provider-layout {
		  display: grid;
		  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		  gap: 0.7rem;
		}

		.source-manager {
		  display: grid;
		  gap: 0.7rem;
		}

		.source-list {
		  display: grid;
		  gap: 0.55rem;
		}

		.source-card {
		  border: 1px solid #dbe3ec;
		  border-radius: 8px;
		  background: #ffffff;
		  padding: 0.6rem;
		  display: grid;
		  gap: 0.45rem;
		}

		.source-card-top {
		  display: flex;
		  align-items: flex-start;
		  justify-content: space-between;
		  gap: 0.6rem;
		}

		.source-card-label {
		  margin: 0;
		  font-size: 0.88rem;
		  font-weight: 700;
		}

		.source-card-actions {
		  display: flex;
		  gap: 0.4rem;
		  flex-wrap: wrap;
		}

		.source-card-actions .btn {
		  font-size: 0.78rem;
		  padding: 0.25rem 0.45rem;
		}

		.source-card-meta {
		  display: flex;
		  align-items: center;
		  justify-content: space-between;
		  gap: 0.5rem;
		  flex-wrap: wrap;
		}

		.provider-list {
		  display: grid;
		  gap: 0.5rem;
		  align-content: start;
		}

		.provider-card {
		  border: 1px solid #dbe3ec;
		  border-radius: 8px;
		  background: #ffffff;
		  padding: 0.6rem;
		  text-align: left;
		  display: grid;
		  gap: 0.2rem;
		  cursor: pointer;
		}

		.provider-card.is-selected {
		  border-color: #0f6cc6;
		  box-shadow: 0 0 0 1px #66a6e8 inset;
		  background: #f5faff;
		}

		.provider-card.is-disabled {
		  cursor: not-allowed;
		  background: #f8fafc;
		  color: #64748b;
		  border-color: #e2e8f0;
		}

		.provider-card-label-row {
		  display: flex;
		  align-items: center;
		  justify-content: space-between;
		  gap: 0.5rem;
		}

		.pill {
		  border-radius: 999px;
		  border: 1px solid #cbd5e1;
		  padding: 0.1rem 0.4rem;
		  font-size: 0.72rem;
		  color: #475569;
		  background: #f8fafc;
		}

		.pill.is-muted {
		  color: #64748b;
		  border-color: #e2e8f0;
		  background: #f8fafc;
		}

		.provider-config {
		  display: grid;
		  gap: 0.6rem;
		  align-content: start;
		  border: 1px solid #e2e8f0;
		  border-radius: 8px;
		  background: #f8fafc;
		  padding: 0.7rem;
		}

		.config-section-title {
		  margin: 0;
		  font-size: 0.83rem;
		  color: #334155;
		}

		.storage-help-btn {
		  margin-top: 0.5rem;
		}

		.storage-dialog {
		  width: min(1080px, 96vw);
		}

		.storage-layout {
		  display: grid;
		  gap: 0.8rem;
		}

		.storage-section {
		  border: 1px solid #dbe3ec;
		  border-radius: 8px;
		  background: #ffffff;
		  padding: 0.75rem;
		  display: grid;
		  gap: 0.45rem;
		}

		.storage-heading {
		  margin: 0;
		  font-size: 0.9rem;
		  color: #0f172a;
		}

		.storage-list {
		  margin: 0;
		  padding-left: 1.1rem;
		  display: grid;
		  gap: 0.3rem;
		  color: #334155;
		  font-size: 0.86rem;
		}

		.storage-table-wrap {
		  overflow: auto;
		  border: 1px solid #dbe3ec;
		  border-radius: 8px;
		  background: #ffffff;
		}

		.storage-table {
		  width: 100%;
		  min-width: 980px;
		  border-collapse: collapse;
		  font-size: 0.82rem;
		  color: #334155;
		}

		.storage-table th,
		.storage-table td {
		  border-bottom: 1px solid #e2e8f0;
		  padding: 0.45rem 0.5rem;
		  text-align: left;
		  vertical-align: top;
		}

		.storage-table th {
		  background: #f8fafc;
		  color: #0f172a;
		  font-weight: 700;
		  position: sticky;
		  top: 0;
		  z-index: 1;
		}

		.storage-table tr:last-child td {
		  border-bottom: none;
		}

		.storage-tag {
		  display: inline-block;
		  padding: 0.08rem 0.38rem;
		  border-radius: 999px;
		  border: 1px solid #bfdbfe;
		  background: #eff6ff;
		  color: #1d4ed8;
		  font-size: 0.72rem;
		  font-weight: 700;
		  white-space: nowrap;
		}

		.is-hidden {
		  display: none;
		}

		.source-filter {
		  width: 220px;
		  min-width: 220px;
		  max-width: 220px;
		}

		.editor-section {
		  border-top: 1px solid #e2e8f0;
		  padding-top: 0.6rem;
		  display: grid;
		  gap: 0.45rem;
		}

		.editor-section-title {
		  margin: 0;
		  font-size: 0.78rem;
		  letter-spacing: 0.03em;
		  text-transform: uppercase;
		  color: #64748b;
		  font-weight: 700;
		}

		.viewport-actions {
		  display: flex;
		  align-items: center;
		  gap: 0.45rem;
		  flex-wrap: wrap;
		}

		.drop-overlay {
		  position: absolute;
		  inset: 0;
		  border: 2px dashed #0f6cc6;
		  border-radius: 10px;
		  background: rgba(15, 108, 198, 0.08);
		  display: none;
		  align-items: center;
		  justify-content: center;
		  color: #0f4f8a;
		  font-weight: 700;
		  pointer-events: none;
		  z-index: 4;
		}

		.drop-overlay.is-active {
		  display: flex;
		}

		.asset-status-local {
		  border-color: #c4b5fd;
		  background: #f5f3ff;
		  color: #5b21b6;
		}

		.asset-status-pending {
		  border-color: #fcd34d;
		  background: #fffbeb;
		  color: #92400e;
		}

		.asset-status-uploading {
		  border-color: #93c5fd;
		  background: #eff6ff;
		  color: #1d4ed8;
		}

		.asset-status-uploaded {
		  border-color: #86efac;
		  background: #ecfdf5;
		  color: #166534;
		}

		.asset-status-failed {
		  border-color: #fecaca;
		  background: #fef2f2;
		  color: #991b1b;
		}

		.viewer-dialog {
		  width: min(980px, 96vw);
		}

		.viewer-layout {
		  display: grid;
		  gap: 0.8rem;
		}

		.viewer-media-wrap {
		  border: 1px solid #dbe3ec;
		  border-radius: 8px;
		  background: #f8fafc;
		  min-height: 280px;
		  max-height: 60vh;
		  overflow: auto;
		  display: grid;
		  place-items: center;
		  padding: 0.7rem;
		}

		.viewer-image {
		  max-width: 100%;
		  max-height: 56vh;
		  width: auto;
		  height: auto;
		  border-radius: 7px;
		  border: 1px solid #cbd5e1;
		  background: #ffffff;
		}

		.viewer-video {
		  max-width: 100%;
		  max-height: 56vh;
		  border-radius: 7px;
		  border: 1px solid #cbd5e1;
		  background: #0f172a;
		}

		.viewer-details {
		  display: grid;
		  gap: 0.55rem;
		}

		.viewer-text {
		  margin: 0;
		  color: #334155;
		  font-size: 0.9rem;
		  white-space: pre-wrap;
		}

		pre {
		  margin: 0;
		  padding: 0.75rem;
		  border-radius: 8px;
		  background: #0f172a;
		  color: #dbeafe;
		  font-size: 0.8rem;
		  max-height: 280px;
		  overflow: auto;
		  white-space: pre-wrap;
		  word-break: break-word;
		}

		@media (max-width: 1080px) {
		  .content-grid {
			grid-template-columns: minmax(0, 1fr);
			overflow: auto;
		  }

		  .editor-panel {
			min-height: 0;
		  }
		}

		@media (max-width: 760px) {
		  .app-shell {
			border: none;
			border-radius: 0;
			min-height: 100dvh;
		  }

		  .topbar {
			padding: 0.55rem 0.7rem;
			gap: 0.55rem;
			align-items: center;
		  }

		  .title {
			font-size: 0.9rem;
		  }

		  #statusText,
		  #workspaceContext,
		  #openNewCollectionBtn,
		  #openProviderBtn,
		  #openPublishBtn,
		  #openRegisterBtn,
		  #assetCount,
		  #sourceFilter,
		  #collectionFilter {
			display: none;
		  }

		  .top-actions {
			flex-wrap: nowrap;
			margin-left: auto;
		  }

		  .more-actions-btn {
			display: inline-flex;
		  }

		  .btn {
			padding: 0.3rem 0.52rem;
			font-size: 0.77rem;
			border-radius: 7px;
		  }

		  .content-grid {
			padding: 0.65rem;
			gap: 0.65rem;
		  }

		  .viewport-panel.panel {
			border: none;
			background: transparent;
			box-shadow: none;
		  }

		  .viewport-panel .panel-header {
			border: none;
			background: transparent;
			padding: 0.1rem 0 0.45rem;
			position: sticky;
			top: 0;
			z-index: 2;
		  }

		  .panel-header-meta {
			width: 100%;
			justify-content: space-between;
			gap: 0.4rem;
			flex-wrap: nowrap;
		  }

		  .panel-heading-left {
			flex: 1;
		  }

		  .viewport-actions .btn {
			font-size: 0.78rem;
		  }

		  .asset-wrap {
			padding: 0;
		  }

		  .asset-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: 0.55rem;
		  }

		  .asset-grid.collections-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		  }

		  .asset-card {
			padding: 0.48rem;
			gap: 0.4rem;
			box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
		  }

		  .collection-card {
			min-height: 168px;
			padding: 0.72rem;
			gap: 0.58rem;
		  }

		  .thumb,
		  .thumb-placeholder {
			height: 108px;
		  }

		  .card-actions .btn {
			font-size: 0.76rem;
			padding: 0.26rem 0.44rem;
		  }

		  .editor-panel {
			position: fixed;
			inset: 0;
			z-index: 12;
			border: none;
			border-radius: 0;
			box-shadow: none;
			background: #f3f5f8;
			display: none;
		  }

		  .editor-panel.is-mobile-editor-open {
			display: grid;
		  }

		  .editor-panel .panel-header {
			padding: 0.7rem 0.8rem;
			background: #ffffff;
			border-bottom: 1px solid #e2e8f0;
			position: sticky;
			top: 0;
			z-index: 2;
		  }

		  .editor-context {
			max-width: 160px;
		  }

		  .editor-panel .panel-subtext {
			display: none;
		  }

		  .editor-wrap {
			padding: 0.8rem;
		  }

		  .editor-close-btn {
			display: inline-flex;
		  }
		}
	  </style>

	  <div class="app-shell">
		<header class="topbar">
		  <div class="brand">
			<h1 class="title">Open Collections Manager</h1>
			<p id="statusText" class="status">Not connected.</p>
			<p id="workspaceContext" class="status">Host: none | Collection: none</p>
		  </div>
		  <div class="top-actions">
			<button class="btn" id="openSourcePickerBtn" type="button">Source: <span id="activeSourceLabel">Select source</span></button>
			<button class="btn btn-primary" id="openNewCollectionBtn" type="button">Add collection</button>
			<button class="btn" id="openProviderBtn" type="button">Sources</button>
			<button class="btn" id="openPublishBtn" type="button">Publish</button>
			<button class="btn" id="openRegisterBtn" type="button">Register</button>
			<button class="btn more-actions-btn icon-btn" id="openMobileActionsBtn" type="button" aria-label="More actions">⋯</button>
		  </div>
		</header>

		<div class="content-grid">
		  <section class="panel viewport-panel" aria-label="Collection browser">
			<div class="panel-header">
			  <div class="panel-heading-left">
				<button class="btn is-hidden" id="backToCollectionsBtn" type="button">Back</button>
				<h2 id="viewportTitle" class="panel-title">Collections</h2>
			  </div>
			  <div class="panel-header-meta">
				<div class="viewport-actions">
				  <button class="btn" id="addImagesBtn" type="button">Add item</button>
				  <input id="imageFileInput" type="file" accept="${IMAGE_UPLOAD_ACCEPT}" multiple hidden />
				</div>
				<select id="sourceFilter" class="source-filter is-hidden" aria-label="Filter assets by source">
				  <option value="all">All hosts</option>
				</select>
				<select id="collectionFilter" class="source-filter is-hidden" aria-label="Choose active collection">
				  <option value="all">All collections</option>
				</select>
				<p id="assetCount" class="panel-subtext">No assets loaded.</p>
			  </div>
			</div>
			<div id="assetWrap" class="asset-wrap">
			  <div id="assetDropOverlay" class="drop-overlay">Drop image files to add them to this collection draft</div>
			  <div id="assetGrid" class="asset-grid"></div>
			</div>
		  </section>

		  <aside class="panel editor-panel" aria-label="Metadata editor">
			<div class="panel-header">
			  <h2 id="editorTitle" class="panel-title">Metadata editor</h2>
			  <div class="editor-header-meta">
				<p id="editorContext" class="editor-context"></p>
				<button class="btn editor-close-btn" id="closeEditorBtn" type="button">Close</button>
			  </div>
			</div>
			<div id="editorContent" class="editor-content">
			  <div id="editorEmpty" class="editor-wrap">
				<div class="empty">Select a card to edit metadata.</div>
			  </div>
			  <form id="collectionEditorForm" class="editor-wrap" hidden>
				<div class="editor-section">
				  <p class="editor-section-title">Collection details</p>
				  <div class="field-row"><label for="collectionEditorTitle">Title</label><input id="collectionEditorTitle" type="text" /></div>
				  <div class="field-row"><label for="collectionEditorDescription">Description</label><textarea id="collectionEditorDescription"></textarea></div>
				  <div class="field-row"><label for="collectionEditorLicense">License</label><input id="collectionEditorLicense" type="text" /></div>
				  <div class="field-row"><label for="collectionEditorPublisher">Publisher</label><input id="collectionEditorPublisher" type="text" /></div>
				  <div class="field-row"><label for="collectionEditorLanguage">Language</label><input id="collectionEditorLanguage" type="text" /></div>
				</div>
				<button class="btn btn-primary" id="saveCollectionBtn" type="button">Save collection metadata</button>
			  </form>
			  <form id="editorForm" class="editor-wrap" hidden>
				<div class="editor-section">
				  <p class="editor-section-title">Basic</p>
				  <div class="field-row"><label for="itemTitle">Title</label><input id="itemTitle" type="text" /></div>
				  <div class="field-row"><label for="itemDescription">Description</label><textarea id="itemDescription"></textarea></div>
				  <div class="field-row"><label for="itemType">Type / Format</label><input id="itemType" type="text" /></div>
				</div>
				<div class="editor-section">
				  <p class="editor-section-title">Authorship</p>
				  <div class="field-row"><label for="itemCreator">Creator</label><input id="itemCreator" type="text" /></div>
				  <div class="field-row"><label for="itemAttribution">Attribution</label><input id="itemAttribution" type="text" /></div>
				</div>
				<div class="editor-section">
				  <p class="editor-section-title">Context</p>
				  <div class="field-row"><label for="itemDate">Date / Period</label><input id="itemDate" type="text" /></div>
				  <div class="field-row"><label for="itemLocation">Location</label><input id="itemLocation" type="text" /></div>
				</div>
				<div class="editor-section">
				  <p class="editor-section-title">Rights</p>
				  <div class="field-row"><label for="itemLicense">License</label><input id="itemLicense" type="text" /></div>
				  <div class="field-row"><label for="itemSource">Source</label><input id="itemSource" type="text" /></div>
				</div>
				<div class="editor-section">
				  <p class="editor-section-title">Classification</p>
				  <div class="field-row"><label for="itemTags">Tags / Keywords (comma separated)</label><input id="itemTags" type="text" /></div>
				</div>
				<label class="checkbox-row" for="itemInclude"><span>Include in manifest</span><input id="itemInclude" type="checkbox" /></label>
				<button class="btn btn-primary" id="saveItemBtn" type="button">Save item metadata</button>
			  </form>
			</div>
		  </aside>
		</div>
	  </div>

	  <dialog id="providerDialog" aria-label="Host manager">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Host manager</h2>
			<button class="btn" data-close="providerDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="source-manager">
			  <div>
				<p class="config-section-title">Connected hosts</p>
				<div id="sourceList" class="source-list"></div>
				<button class="btn storage-help-btn" id="openStorageOptionsBtn" type="button">Storage options</button>
			  </div>
			  <div class="provider-layout">
				<div>
				<p class="config-section-title">Add storage host</p>
				<div id="providerCatalog" class="provider-list"></div>
			  </div>
			  <div id="providerConfig" class="provider-config">
				<p id="providerConfigTitle" class="config-section-title">Host configuration</p>

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

				<div id="localConfig" class="is-hidden">
				  <div class="field-row"><label for="localPathInput">Collection path</label><input id="localPathInput" type="text" /></div>
				</div>

				<div id="placeholderConfig" class="is-hidden">
				  <div class="empty">This provider is planned and not yet available in this MVP.</div>
				</div>

				<div class="dialog-actions">
				  <button class="btn btn-primary" id="connectBtn" type="button">Add host</button>
				</div>
			  </div>
			</div>
			</div>
			<p id="connectionStatus" class="panel-subtext">Not connected.</p>
			<pre id="capabilities">{}</pre>
		  </div>
		</div>
	  </dialog>



	  <dialog id="mobileActionsDialog" aria-label="Mobile quick actions">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Quick actions</h2>
			<button class="btn" data-close="mobileActionsDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="dialog-actions">
			  <button class="btn" id="mobileActionsSourcesBtn" type="button">Sources</button>
			  <button class="btn" id="mobileActionsPublishBtn" type="button">Publish</button>
			  <button class="btn" id="mobileActionsRegisterBtn" type="button">Register</button>
			</div>
		  </div>
		</div>
	  </dialog>

	  <dialog id="sourcePickerDialog" aria-label="Select source">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Select host</h2>
			<button class="btn" data-close="sourcePickerDialog" type="button">Close</button>
		  </div>
		  <div id="sourcePickerList" class="dialog-body"></div>
		</div>
	  </dialog>

	  <dialog id="publishDialog" aria-label="Publish collection">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Publish collection</h2>
			<button class="btn" data-close="publishDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="field-row"><label for="collectionId">Collection ID</label><input id="collectionId" type="text" /></div>
			<div class="field-row"><label for="collectionTitle">Collection title</label><input id="collectionTitle" type="text" /></div>
			<div class="field-row"><label for="collectionDescription">Collection description</label><textarea id="collectionDescription"></textarea></div>
			<div class="field-row"><label for="collectionLicense">Collection license</label><input id="collectionLicense" type="text" /></div>
			<div class="field-row"><label for="collectionPublisher">Collection publisher</label><input id="collectionPublisher" type="text" /></div>
			<div class="field-row"><label for="collectionLanguage">Collection language</label><input id="collectionLanguage" type="text" /></div>
			<div class="dialog-actions">
			  <button class="btn btn-primary" id="generateManifestBtn" type="button">Generate collection.json</button>
			  <button class="btn btn-primary" id="publishToSourceBtn" type="button">Upload to GitHub</button>
			  <button class="btn" id="copyManifestBtn" type="button">Copy</button>
			  <button class="btn" id="downloadManifestBtn" type="button">Download</button>
			  <button class="btn" id="saveLocalDraftBtn" type="button">Save locally</button>
			  <button class="btn" id="restoreLocalDraftBtn" type="button">Restore draft</button>
			  <button class="btn" id="discardLocalDraftBtn" type="button">Discard draft</button>
			</div>
			<p id="localDraftStatus" class="panel-subtext">Checking local draft storage...</p>
			<pre id="manifestPreview"></pre>
		  </div>
		</div>
	  </dialog>

	  <dialog id="newCollectionDialog" aria-label="Create new collection">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Create new collection</h2>
			<button class="btn" data-close="newCollectionDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="field-row"><label for="newCollectionTitle">Title</label><input id="newCollectionTitle" type="text" placeholder="My Collection" /></div>
			<div class="field-row"><label for="newCollectionSlug">ID / Slug</label><input id="newCollectionSlug" type="text" placeholder="my-collection" /></div>
			<div class="field-row"><label for="newCollectionDescription">Description</label><textarea id="newCollectionDescription"></textarea></div>
			<div class="field-row"><label for="newCollectionLicense">License (optional)</label><input id="newCollectionLicense" type="text" /></div>
			<div class="field-row"><label for="newCollectionPublisher">Publisher (optional)</label><input id="newCollectionPublisher" type="text" /></div>
			<div class="field-row"><label for="newCollectionLanguage">Language (optional)</label><input id="newCollectionLanguage" type="text" /></div>
			<div class="dialog-actions">
			  <button class="btn btn-primary" id="createCollectionBtn" type="button">Create collection</button>
			</div>
		  </div>
		</div>
	  </dialog>

	  <dialog id="registerDialog" aria-label="Collection registration">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Register collection</h2>
			<button class="btn" data-close="registerDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="empty">
			  Collection registration will be added here.
			  Collection Manager will later register published collections with the registry.
			</div>
		  </div>
		</div>
	  </dialog>

	  <dialog id="headerMenuDialog" aria-label="Header menu">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">More actions</h2>
			<button class="btn" data-close="headerMenuDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body">
			<div class="dialog-actions">
			  <button class="btn" id="openRegisterFromMenuBtn" type="button">Register collection</button>
			</div>
		  </div>
		</div>
	  </dialog>

	  <dialog id="storageOptionsDialog" class="storage-dialog" aria-label="Storage options guidance">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 class="dialog-title">Storage options</h2>
			<button class="btn" data-close="storageOptionsDialog" type="button">Close</button>
		  </div>
		  <div class="dialog-body storage-layout">
			<section class="storage-section">
			  <h3 class="storage-heading">Recommended options for open hosting</h3>
			  <ul class="storage-list">
				<li><strong>GitHub</strong>: strong for public manifests, versioning, and easy Collection Manager integration.</li>
				<li><strong>Cloudflare Pages / R2</strong>: excellent static/browser delivery for JSON + media.</li>
				<li><strong>S3-compatible storage</strong>: robust long-term hosting for technical teams and institutions.</li>
				<li><strong>Static website hosting</strong>: simple and dependable for open <code>collection.json</code> publishing.</li>
			  </ul>
			</section>

			<section class="storage-section">
			  <h3 class="storage-heading">Provider comparison</h3>
			  <div class="storage-table-wrap">
				<table class="storage-table" aria-label="Storage provider comparison">
				  <thead>
					<tr>
					  <th>Provider</th>
					  <th>Best use</th>
					  <th>Public hosting quality</th>
					  <th>Browser fetch compatibility</th>
					  <th>Good for media</th>
					  <th>Good for manifests</th>
					  <th>Recommended role</th>
					</tr>
				  </thead>
				  <tbody>
					<tr>
					  <td>GitHub <span class="storage-tag">Recommended</span></td>
					  <td>Open manifests, transparent version history</td>
					  <td>High</td>
					  <td>High</td>
					  <td>Medium</td>
					  <td>High</td>
					  <td>Primary hosting</td>
					</tr>
					<tr>
					  <td>Cloudflare Pages / R2 <span class="storage-tag">Recommended</span></td>
					  <td>Public static delivery and scalable media hosting</td>
					  <td>High</td>
					  <td>High</td>
					  <td>High</td>
					  <td>High</td>
					  <td>Primary hosting</td>
					</tr>
					<tr>
					  <td>S3-compatible storage <span class="storage-tag">Recommended</span></td>
					  <td>Institutional and technical storage workflows</td>
					  <td>High</td>
					  <td>High</td>
					  <td>High</td>
					  <td>High</td>
					  <td>Primary hosting</td>
					</tr>
					<tr>
					  <td>Static website hosting <span class="storage-tag">Recommended</span></td>
					  <td>Simple public hosting for JSON and media files</td>
					  <td>High</td>
					  <td>High</td>
					  <td>Medium</td>
					  <td>High</td>
					  <td>Primary hosting</td>
					</tr>
					<tr>
					  <td>Google Drive</td>
					  <td>Collaboration and import source for existing files</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Good source</td>
					</tr>
					<tr>
					  <td>OneDrive</td>
					  <td>Internal collaboration and source ingestion</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Good source</td>
					</tr>
					<tr>
					  <td>Dropbox</td>
					  <td>Team file sharing and temporary data exchange</td>
					  <td>Low to medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Medium</td>
					  <td>Import only</td>
					</tr>
					<tr>
					  <td>Internet Archive</td>
					  <td>Long-term public archival distribution</td>
					  <td>High</td>
					  <td>Medium</td>
					  <td>High</td>
					  <td>Medium</td>
					  <td>Specialized archive</td>
					</tr>
					<tr>
					  <td>Wikimedia Commons</td>
					  <td>Open media publication under supported licenses</td>
					  <td>High</td>
					  <td>Medium</td>
					  <td>High</td>
					  <td>Low to medium</td>
					  <td>Specialized archive</td>
					</tr>
				  </tbody>
				</table>
			  </div>
			</section>

			<section class="storage-section">
			  <h3 class="storage-heading">Cloud drives in browser-first workflows</h3>
			  <p class="panel-subtext">Google Drive, OneDrive, and Dropbox are useful source systems, but they are usually weaker as final public hosting for browser-first manifest delivery.</p>
			  <p class="panel-subtext">Use them for collaboration/import, then publish to GitHub, Cloudflare, S3-compatible storage, or static hosting for stable public access.</p>
			</section>

			<section class="storage-section">
			  <h3 class="storage-heading">Quick recommendations by scenario</h3>
			  <ul class="storage-list">
				<li><strong>Small heritage organizations</strong> -> GitHub</li>
				<li><strong>Technical teams or institutions</strong> -> S3-compatible storage or Cloudflare R2</li>
				<li><strong>Files already in Google Drive or OneDrive</strong> -> import from drive, then publish to stronger public hosting</li>
				<li><strong>Archival public preservation</strong> -> Internet Archive or Wikimedia Commons where appropriate</li>
			  </ul>
			</section>

			<p class="panel-subtext">
			  Learn more: <a href="/docs/storage-options">/docs/storage-options</a> (placeholder; full guide TBD).
			</p>
		  </div>
		</div>
	  </dialog>

	  <dialog id="assetViewerDialog" class="viewer-dialog" aria-label="Asset viewer">
		<div class="dialog-shell">
		  <div class="dialog-header">
			<h2 id="viewerTitle" class="dialog-title">Asset viewer</h2>
			<button class="btn" id="closeViewerBtn" type="button">Close</button>
		  </div>
		  <div class="dialog-body viewer-layout">
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

  cacheDom() {
	const root = this.shadow;
	this.dom = {
	  statusText: root.getElementById('statusText'),
	  workspaceContext: root.getElementById('workspaceContext'),
	  openHostManagerBtn: root.getElementById('openHostManagerBtn'),
	  openHeaderMenuBtn: root.getElementById('openHeaderMenuBtn'),
	  activeHostLabel: root.getElementById('activeHostLabel'),
	  backToCollectionsBtn: root.getElementById('backToCollectionsBtn'),
	  viewportTitle: root.getElementById('viewportTitle'),
	  editorPanel: root.querySelector('.editor-panel'),
	  editorTitle: root.getElementById('editorTitle'),
	  editorContent: root.getElementById('editorContent'),
	  closeEditorBtn: root.getElementById('closeEditorBtn'),
	  openProviderBtn: root.getElementById('openProviderBtn'),
	  openPublishBtn: root.getElementById('openPublishBtn'),
	  openRegisterBtn: root.getElementById('openRegisterBtn'),
	  openMobileActionsBtn: root.getElementById('openMobileActionsBtn'),
	  providerDialog: root.getElementById('providerDialog'),
	  sourcePickerDialog: root.getElementById('sourcePickerDialog'),
	  sourcePickerList: root.getElementById('sourcePickerList'),
	  mobileActionsDialog: root.getElementById('mobileActionsDialog'),
	  mobileActionsSourcesBtn: root.getElementById('mobileActionsSourcesBtn'),
	  mobileActionsPublishBtn: root.getElementById('mobileActionsPublishBtn'),
	  mobileActionsRegisterBtn: root.getElementById('mobileActionsRegisterBtn'),
	  publishDialog: root.getElementById('publishDialog'),
	  newCollectionDialog: root.getElementById('newCollectionDialog'),
	  registerDialog: root.getElementById('registerDialog'),
	  headerMenuDialog: root.getElementById('headerMenuDialog'),
	  openRegisterFromMenuBtn: root.getElementById('openRegisterFromMenuBtn'),
	  storageOptionsDialog: root.getElementById('storageOptionsDialog'),
	  assetViewerDialog: root.getElementById('assetViewerDialog'),
	  closeViewerBtn: root.getElementById('closeViewerBtn'),
	  viewerTitle: root.getElementById('viewerTitle'),
	  viewerMedia: root.getElementById('viewerMedia'),
	  viewerDescription: root.getElementById('viewerDescription'),
	  viewerBadges: root.getElementById('viewerBadges'),
	  viewerOpenOriginal: root.getElementById('viewerOpenOriginal'),
	  providerCatalog: root.getElementById('providerCatalog'),
	  sourceList: root.getElementById('sourceList'),
	  openStorageOptionsBtn: root.getElementById('openStorageOptionsBtn'),
	  sourceFilter: root.getElementById('sourceFilter'),
	  collectionFilter: root.getElementById('collectionFilter'),
	  providerConfigTitle: root.getElementById('providerConfigTitle'),
	  githubConfig: root.getElementById('githubConfig'),
	  githubToken: root.getElementById('githubToken'),
	  githubOwner: root.getElementById('githubOwner'),
	  githubRepo: root.getElementById('githubRepo'),
	  githubBranch: root.getElementById('githubBranch'),
	  githubPath: root.getElementById('githubPath'),
	  publicUrlConfig: root.getElementById('publicUrlConfig'),
	  publicUrlInput: root.getElementById('publicUrlInput'),
	  gdriveConfig: root.getElementById('gdriveConfig'),
	  gdriveSourceMode: root.getElementById('gdriveSourceMode'),
	  gdriveAuthConfig: root.getElementById('gdriveAuthConfig'),
	  gdrivePublicConfig: root.getElementById('gdrivePublicConfig'),
	  gdriveUrlInput: root.getElementById('gdriveUrlInput'),
	  gdriveClientIdInput: root.getElementById('gdriveClientIdInput'),
	  gdriveFileIdInput: root.getElementById('gdriveFileIdInput'),
	  gdriveConnectAuthBtn: root.getElementById('gdriveConnectAuthBtn'),
	  gdriveAccessTokenInput: root.getElementById('gdriveAccessTokenInput'),
	  gdriveAuthStatus: root.getElementById('gdriveAuthStatus'),
	  localConfig: root.getElementById('localConfig'),
	  localPathInput: root.getElementById('localPathInput'),
	  placeholderConfig: root.getElementById('placeholderConfig'),
	  connectBtn: root.getElementById('connectBtn'),
	  connectionStatus: root.getElementById('connectionStatus'),
	  capabilities: root.getElementById('capabilities'),
	  assetCount: root.getElementById('assetCount'),
	  addImagesBtn: root.getElementById('addImagesBtn'),
	  imageFileInput: root.getElementById('imageFileInput'),
	  assetWrap: root.getElementById('assetWrap'),
	  assetDropOverlay: root.getElementById('assetDropOverlay'),
	  assetGrid: root.getElementById('assetGrid'),
	  editorContext: root.getElementById('editorContext'),
	  editorEmpty: root.getElementById('editorEmpty'),
	  collectionEditorForm: root.getElementById('collectionEditorForm'),
	  editorForm: root.getElementById('editorForm'),
	  itemTitle: root.getElementById('itemTitle'),
	  itemDescription: root.getElementById('itemDescription'),
	  itemType: root.getElementById('itemType'),
	  itemCreator: root.getElementById('itemCreator'),
	  itemDate: root.getElementById('itemDate'),
	  itemLocation: root.getElementById('itemLocation'),
	  itemLicense: root.getElementById('itemLicense'),
	  itemAttribution: root.getElementById('itemAttribution'),
	  itemSource: root.getElementById('itemSource'),
	  itemTags: root.getElementById('itemTags'),
	  itemInclude: root.getElementById('itemInclude'),
	  saveItemBtn: root.getElementById('saveItemBtn'),
	  collectionEditorTitle: root.getElementById('collectionEditorTitle'),
	  collectionEditorDescription: root.getElementById('collectionEditorDescription'),
	  collectionEditorLicense: root.getElementById('collectionEditorLicense'),
	  collectionEditorPublisher: root.getElementById('collectionEditorPublisher'),
	  collectionEditorLanguage: root.getElementById('collectionEditorLanguage'),
	  saveCollectionBtn: root.getElementById('saveCollectionBtn'),
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

	this.dom.localPathInput.value = COLLECTOR_CONFIG.defaultLocalManifestPath;
	this.dom.gdriveClientIdInput.value = COLLECTOR_CONFIG.googleDriveOAuth?.clientId || '';
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

	this.dom.openHostManagerBtn.addEventListener('click', () => this.openDialog(this.dom.providerDialog));
	this.dom.openHeaderMenuBtn.addEventListener('click', () => this.openDialog(this.dom.headerMenuDialog));
	this.dom.openStorageOptionsBtn.addEventListener('click', () => this.openDialog(this.dom.storageOptionsDialog));
	this.dom.openPublishBtn.addEventListener('click', () => this.openDialog(this.dom.publishDialog));
	this.dom.openRegisterBtn.addEventListener('click', () => this.openDialog(this.dom.registerDialog));
	this.dom.openMobileActionsBtn.addEventListener('click', () => this.openDialog(this.dom.mobileActionsDialog));
	this.dom.mobileActionsSourcesBtn.addEventListener('click', () => {
	  this.closeDialog(this.dom.mobileActionsDialog);
	  this.openDialog(this.dom.providerDialog);
	});
	this.dom.mobileActionsPublishBtn.addEventListener('click', () => {
	  this.closeDialog(this.dom.mobileActionsDialog);
	  this.openDialog(this.dom.publishDialog);
	});
	this.dom.mobileActionsRegisterBtn.addEventListener('click', () => {
	  this.closeDialog(this.dom.mobileActionsDialog);
	  this.openDialog(this.dom.registerDialog);
	});
	this.dom.openNewCollectionBtn.addEventListener('click', () => this.openNewCollectionDialog());
	this.dom.openSourcePickerBtn.addEventListener('click', () => {
	  this.renderSourcePicker();
	  this.openDialog(this.dom.sourcePickerDialog);
	});
	this.dom.backToCollectionsBtn.addEventListener('click', () => this.leaveCollectionView());
	this.dom.closeEditorBtn.addEventListener('click', () => this.closeMobileEditor());
	this.dom.closeViewerBtn.addEventListener('click', () => this.closeViewer());
	this.dom.assetViewerDialog.addEventListener('close', () => {
	  this.state.viewerItemId = null;
	});
	this.dom.assetViewerDialog.addEventListener('cancel', () => {
	  this.state.viewerItemId = null;
	});
	this.dom.sourceFilter.addEventListener('change', () => {
	  this.state.activeSourceFilter = this.dom.sourceFilter.value || 'all';
	  this.state.selectedCollectionId = 'all';
	  const visible = this.getVisibleAssets();
	  if (this.state.selectedItemId && !visible.some((item) => item.workspaceId === this.state.selectedItemId)) {
		this.state.selectedItemId = visible[0]?.workspaceId || null;
	  }
	  this.renderCollectionFilter();
	  this.state.currentLevel = 'collections';
	  this.state.metadataMode = 'collection';
	  this.state.openedCollectionId = null;
	  this.renderSourceContext();
	  this.renderAssets();
	  this.renderEditor();
	  if (this.state.opfsAvailable) {
		this.persistWorkspaceToOpfs().catch(() => {});
	  }
	});
	this.dom.collectionFilter.addEventListener('change', () => {
	  this.state.selectedCollectionId = this.dom.collectionFilter.value || 'all';
	  const visible = this.getVisibleAssets();
	  if (this.state.selectedItemId && !visible.some((item) => item.workspaceId === this.state.selectedItemId)) {
		this.state.selectedItemId = visible[0]?.workspaceId || null;
	  }
	  this.renderAssets();
	  this.renderEditor();
	  if (this.state.opfsAvailable) {
		this.persistWorkspaceToOpfs().catch(() => {});
	  }
	});

	this.shadow.querySelectorAll('[data-close]').forEach((button) => {
	  button.addEventListener('click', () => {
		const dialogId = button.getAttribute('data-close');
		this.closeDialog(this.shadow.getElementById(dialogId));
	  });
	});

	this.dom.connectBtn.addEventListener('click', async () => {
	  await this.connectCurrentProvider();
	});

	this.dom.gdriveSourceMode.addEventListener('change', () => {
	  this.renderGoogleDriveMode();
	});

	this.dom.gdriveConnectAuthBtn.addEventListener('click', async () => {
	  await this.connectGoogleDriveAuth();
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

	this.dom.saveItemBtn.addEventListener('click', async () => {
	  const selected = this.findSelectedItem();
	  if (!selected) {
		return;
	  }
	  await this.updateItem(selected.workspaceId, this.collectEditorPatch(), { explicitSave: true });
	});

	this.dom.saveCollectionBtn.addEventListener('click', async () => {
	  await this.saveSelectedCollectionMetadata();
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
	this.dom.addImagesBtn.addEventListener('click', () => {
	  if (this.state.currentLevel === 'collections') {
		this.openNewCollectionDialog();
		return;
	  }
	  this.dom.imageFileInput.click();
	});
	this.dom.imageFileInput.addEventListener('change', async (event) => {
	  const files = Array.from(event.target?.files || []);
	  if (files.length > 0) {
		await this.ingestImageFiles(files);
	  }
	  this.dom.imageFileInput.value = '';
	});
	this.dom.assetWrap.addEventListener('dragenter', (event) => {
	  event.preventDefault();
	  this.setDropTargetState(true);
	});
	this.dom.assetWrap.addEventListener('dragover', (event) => {
	  event.preventDefault();
	  this.setDropTargetState(true);
	});
	this.dom.assetWrap.addEventListener('dragleave', (event) => {
	  event.preventDefault();
	  if (!event.relatedTarget || !this.dom.assetWrap.contains(event.relatedTarget)) {
		this.setDropTargetState(false);
	  }
	});
	this.dom.assetWrap.addEventListener('drop', async (event) => {
	  event.preventDefault();
	  this.setDropTargetState(false);
	  const files = Array.from(event.dataTransfer?.files || []);
	  if (files.length > 0) {
		await this.ingestImageFiles(files);
	  }
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
	if (!this.dom.editorPanel) {
	  return;
	}

	const shouldShowOverlay = this.isMobileViewport() && this.state.mobileEditorOpen;
	this.dom.editorPanel.classList.toggle('is-mobile-editor-open', shouldShowOverlay);
  }

  renderProviderCatalog() {
	this.dom.providerCatalog.innerHTML = '';

	for (const entry of this.providerCatalog) {
	  const button = document.createElement('button');
	  button.type = 'button';
	  button.className = 'provider-card';
	  button.dataset.providerId = entry.id;
	  button.disabled = entry.enabled === false;

	  if (entry.enabled === false) {
		button.classList.add('is-disabled');
	  }

	  if (this.state.selectedProviderId === entry.id) {
		button.classList.add('is-selected');
	  }

	  button.innerHTML = `
		<div class="provider-card-label-row">
		  <strong>${entry.label}</strong>
		  <span class="pill ${entry.enabled === false ? 'is-muted' : ''}">${entry.statusLabel || 'Available'}</span>
		</div>
		<span class="panel-subtext">${entry.description || ''}</span>
	  `;

	  button.addEventListener('click', () => {
		if (entry.enabled === false) {
		  return;
		}
		this.setSelectedProvider(entry.id);
	  });

	  this.dom.providerCatalog.appendChild(button);
	}
  }

  setSelectedProvider(providerId) {
	const selected = this.providerCatalog.find((entry) => entry.id === providerId);
	if (!selected) {
	  return;
	}

	this.state.selectedProviderId = providerId;

	this.shadow.querySelectorAll('.provider-card').forEach((card) => {
	  card.classList.toggle('is-selected', card.dataset.providerId === providerId);
	});

	this.dom.providerConfigTitle.textContent = `${selected.label} host configuration`;
	this.dom.githubConfig.classList.add('is-hidden');
	this.dom.publicUrlConfig.classList.add('is-hidden');
	this.dom.gdriveConfig.classList.add('is-hidden');
	this.dom.localConfig.classList.add('is-hidden');
	this.dom.placeholderConfig.classList.add('is-hidden');

	if (providerId === 'github') {
	  this.dom.githubConfig.classList.remove('is-hidden');
	} else if (providerId === 'gdrive') {
	  this.dom.gdriveConfig.classList.remove('is-hidden');
	  this.renderGoogleDriveMode();
	} else if (providerId === 'public-url') {
	  this.dom.publicUrlConfig.classList.remove('is-hidden');
	} else if (providerId === 'local') {
	  this.dom.localConfig.classList.remove('is-hidden');
	} else {
	  this.dom.placeholderConfig.classList.remove('is-hidden');
	}

	this.dom.connectBtn.disabled = selected.enabled === false;
	this.renderCapabilities(this.providerFactories[providerId]?.getCapabilities?.() || selected.capabilities || {});
  }

  renderGoogleDriveMode() {
	const mode = this.dom.gdriveSourceMode.value || 'auth-manifest-file';
	const isAuthMode = mode === 'auth-manifest-file';
	this.dom.gdriveAuthConfig.classList.toggle('is-hidden', !isAuthMode);
	this.dom.gdrivePublicConfig.classList.toggle('is-hidden', isAuthMode);
	if (isAuthMode) {
	  if (!this.dom.gdriveAuthStatus.textContent.trim()) {
		this.dom.gdriveAuthStatus.textContent = 'Disconnected.';
	  }
	} else {
	  this.dom.gdriveAuthStatus.textContent = 'Public shared URL mode selected.';
	  this.dom.gdriveAccessTokenInput.value = '';
	}

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
	const colors = {
	  neutral: '#64748b',
	  ok: '#166534',
	  warn: '#9a3412',
	};
	this.dom.gdriveAuthStatus.textContent = text;
	this.dom.gdriveAuthStatus.style.color = colors[tone] || colors.neutral;
  }

  async connectGoogleDriveAuth() {
	const sourceMode = this.dom.gdriveSourceMode.value || 'auth-manifest-file';
	if (sourceMode !== 'auth-manifest-file') {
	  this.setGoogleDriveAuthStatus('Switch to authenticated mode to connect Google Drive.', 'warn');
	  return;
	}

	const clientId = this.dom.gdriveClientIdInput.value.trim();
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

	  this.dom.gdriveAccessTokenInput.value = tokenResult.accessToken || '';
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
	const colors = {
	  neutral: '#64748b',
	  ok: '#166534',
	  warn: '#9a3412',
	};

	this.dom.statusText.textContent = text;
	this.dom.statusText.style.color = colors[tone] || colors.neutral;
  }

  setConnectionStatus(text, tone = false) {
	const resolvedTone = typeof tone === 'boolean' ? (tone ? 'ok' : 'warn') : tone;
	const colors = {
	  neutral: '#64748b',
	  ok: '#166534',
	  warn: '#9a3412',
	};

	this.dom.connectionStatus.textContent = text;
	this.dom.connectionStatus.style.color = colors[resolvedTone] || colors.neutral;
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
	if (this.dom?.assetDropOverlay) {
	  this.dom.assetDropOverlay.classList.toggle('is-active', this.state.isDropTargetActive);
	}
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

  slugifySegment(value, fallback = 'item') {
	const slug = String(value || '')
	  .toLowerCase()
	  .replace(/[^a-z0-9]+/g, '-')
	  .replace(/^-+|-+$/g, '')
	  .slice(0, 64);
	return slug || fallback;
  }

  hostNameFromPath(path, fallback = 'Local host') {
	const normalized = String(path || '').trim().replace(/\\/g, '/');
	if (!normalized) {
	  return fallback;
	}
	const parts = normalized.split('/').filter(Boolean);
	if (parts.length === 0) {
	  return fallback;
	}
	const tail = parts[parts.length - 1] || '';
	const name = tail.endsWith('.json') ? (parts[parts.length - 2] || '') : tail;
	return name || fallback;
  }

  normalizeCollectionRootPath(rootPath, fallbackId = '') {
	const fallback = `${this.slugifySegment(fallbackId || 'collection', 'collection')}/`;
	const raw = String(rootPath || '').trim();
	if (!raw) {
	  return fallback;
	}
	const cleaned = raw
	  .replace(/^\/+/, '')
	  .replace(/\/+$/, '')
	  .split('/')
	  .map((segment) => this.slugifySegment(segment, 'collection'))
	  .filter(Boolean)
	  .join('/');
	return cleaned ? `${cleaned}/` : fallback;
  }

  joinCollectionRootPath(collectionRootPath, relativePath = '') {
	const root = this.normalizeCollectionRootPath(collectionRootPath, this.state.selectedCollectionId || 'collection');
	const relative = String(relativePath || '').replace(/^\/+/, '');
	return relative ? `${root}${relative}` : root;
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
	this.dom.workspaceContext.textContent = `Host: ${sourceLabel} | Collection: ${collectionId} | Root: ${rootPath}`;
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
	if (!collectionId) {
	  return false;
	}
	const id = collectionId.trim();
	if (!id) {
	  return false;
	}
	for (const source of this.state.sources) {
	  if ((source.collections || []).some((entry) => entry.id === id)) {
		return true;
	  }
	}
	if (this.state.localDraftCollections.some((entry) => entry.id === id)) {
	  return true;
	}
	return this.state.assets.some((item) => item.collectionId === id);
  }

  ensureUniqueCollectionId(baseId) {
	if (!this.collectionIdExists(baseId)) {
	  return baseId;
	}
	let index = 2;
	while (this.collectionIdExists(`${baseId}-${index}`)) {
	  index += 1;
	}
	return `${baseId}-${index}`;
  }

  buildInitialCollectionManifest(meta) {
	const rootPath = this.normalizeCollectionRootPath(meta.rootPath || `${meta.id}/`, meta.id);
	return {
	  id: meta.id,
	  title: meta.title,
	  description: meta.description || '',
	  license: meta.license || '',
	  publisher: meta.publisher || '',
	  language: meta.language || '',
	  rootPath,
	  items: [],
	};
  }

  async createNewCollectionDraft() {
	const title = this.dom.newCollectionTitle.value.trim();
	if (!title) {
	  this.setStatus('Enter a collection title to create a draft.', 'warn');
	  return;
	}

	let slug = (this.dom.newCollectionSlug.value || '').trim();
	if (!slug) {
	  slug = this.slugifySegment(title, 'new-collection');
	} else {
	  slug = this.slugifySegment(slug, 'new-collection');
	}

	slug = this.ensureUniqueCollectionId(slug);
	const meta = {
	  id: slug,
	  title,
	  description: this.dom.newCollectionDescription.value.trim(),
	  license: this.dom.newCollectionLicense.value.trim(),
	  publisher: this.dom.newCollectionPublisher.value.trim(),
	  language: this.dom.newCollectionLanguage.value.trim(),
	  rootPath: this.normalizeCollectionRootPath(`${slug}/`, slug),
	};

	this.setCollectionMetaFields(meta);
	this.state.manifest = this.buildInitialCollectionManifest(meta);
	this.dom.manifestPreview.textContent = JSON.stringify(this.state.manifest, null, 2);
	this.state.selectedItemId = null;
	if (!this.state.localDraftCollections.some((entry) => entry.id === slug)) {
	  this.state.localDraftCollections = [...this.state.localDraftCollections, { id: slug, title, rootPath: meta.rootPath }];
	}

	if (this.state.activeSourceFilter !== 'all') {
	  const source = this.getSourceById(this.state.activeSourceFilter);
	  if (source) {
		const exists = (source.collections || []).some((entry) => entry.id === slug);
		if (!exists) {
		  source.collections = [
			...(source.collections || []),
			{ id: slug, title, rootPath: meta.rootPath },
		  ];
		}
		source.selectedCollectionId = slug;
	  }
	}

	this.state.selectedCollectionId = slug;
	this.closeDialog(this.dom.newCollectionDialog);
	this.renderSourcesList();
	this.renderSourceFilter();
	this.renderCollectionFilter();
	this.renderAssets();
	this.renderEditor();

	if (this.state.opfsAvailable) {
	  await this.saveLocalDraft();
	}
	this.setStatus(`Created local draft collection ${slug}.`, 'ok');
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

	if (source.providerId !== 'github') {
	  this.setStatus('Image upload publishing is currently implemented for GitHub sources only.', 'warn');
	  return null;
	}

	if (source.needsReconnect || source.needsCredentials) {
	  this.setStatus('Reconnect the selected GitHub source before adding local draft assets.', 'warn');
	  return null;
	}

	return source;
  }

  ensureCollectionForSource(source) {
	const preferred = (this.state.selectedCollectionId || '').trim();
	const existing = source.collections || [];
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
	const bitmap = await createImageBitmap(file);
	const maxWidth = 300;
	const ratio = bitmap.width > 0 ? Math.min(1, maxWidth / bitmap.width) : 1;
	const width = Math.max(1, Math.round(bitmap.width * ratio));
	const height = Math.max(1, Math.round(bitmap.height * ratio));
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', { alpha: false });
	if (!ctx) {
	  if (typeof bitmap.close === 'function') {
		bitmap.close();
	  }
	  return null;
	}
	ctx.drawImage(bitmap, 0, 0, width, height);
	if (typeof bitmap.close === 'function') {
	  bitmap.close();
	}
	const blob = await new Promise((resolve) => {
	  canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.86);
	});
	return blob || null;
  }

  async rememberLocalAssetFiles(item, originalBlob, thumbnailBlob) {
	this.localAssetBlobs.set(item.workspaceId, {
	  original: originalBlob || null,
	  thumbnail: thumbnailBlob || null,
	});

	if (!this.state.opfsAvailable) {
	  return;
	}

	if (originalBlob && item.localFileRef) {
	  await this.opfsStorage.writeBlobFile(item.localFileRef, originalBlob);
	}
	if (thumbnailBlob && item.localThumbnailRef) {
	  await this.opfsStorage.writeBlobFile(item.localThumbnailRef, thumbnailBlob);
	}
  }

  async loadLocalAssetBlob(item, kind = 'original') {
	const cached = this.localAssetBlobs.get(item.workspaceId);
	if (kind === 'thumbnail' && cached?.thumbnail) {
	  return cached.thumbnail;
	}
	if (kind === 'original' && cached?.original) {
	  return cached.original;
	}

	if (!this.state.opfsAvailable) {
	  return null;
	}

	const path = kind === 'thumbnail' ? item.localThumbnailRef : item.localFileRef;
	if (!path) {
	  return null;
	}
	const blob = await this.opfsStorage.readBlobFile(path);
	if (!blob) {
	  return null;
	}
	this.localAssetBlobs.set(item.workspaceId, {
	  original: kind === 'original' ? blob : cached?.original || null,
	  thumbnail: kind === 'thumbnail' ? blob : cached?.thumbnail || null,
	});
	return blob;
  }

  async rehydrateLocalDraftAssetUrls() {
	for (const item of this.state.assets) {
	  if (!item.isLocalDraftAsset) {
		continue;
	  }
	  if (!item.previewUrl) {
		const originalBlob = await this.loadLocalAssetBlob(item, 'original');
		if (originalBlob) {
		  item.previewUrl = URL.createObjectURL(originalBlob);
		  this.registerObjectUrl(item.previewUrl);
		}
	  }
	  if (!item.thumbnailPreviewUrl) {
		const thumbBlob = await this.loadLocalAssetBlob(item, 'thumbnail');
		if (thumbBlob) {
		  item.thumbnailPreviewUrl = URL.createObjectURL(thumbBlob);
		  this.registerObjectUrl(item.thumbnailPreviewUrl);
		}
	  }
	  if (!item.media?.thumbnailUrl && item.thumbnailRepoPath) {
		item.media = {
		  ...(item.media || {}),
		  thumbnailUrl: item.thumbnailRepoPath,
		};
	  }
	}
  }

  refreshSourceCollectionsAndCounts(sourceId) {
	const source = this.getSourceById(sourceId);
	if (!source) {
	  return;
	}
	const sourceAssets = this.state.assets.filter((item) => item.sourceId === sourceId);
	source.collections = this.buildCollectionsForSource(source, sourceAssets);
	source.itemCount = sourceAssets.length;
	if (!source.collections.some((entry) => entry.id === source.selectedCollectionId)) {
	  source.selectedCollectionId = source.collections[0]?.id || null;
	}
  }

  async ingestImageFiles(files) {
	const source = this.getActiveIngestionSource();
	if (!source) {
	  return;
	}

	const accepted = files.filter((file) => this.isSupportedImageFile(file));
	if (accepted.length === 0) {
	  this.setStatus('No supported image files found. Use JPG, PNG, WEBP, or GIF.', 'warn');
	  return;
	}

	const rejected = files.length - accepted.length;
	if (rejected > 0) {
	  this.setStatus(`Skipped ${rejected} unsupported file(s).`, 'warn');
	}

	const collectionId = this.ensureCollectionForSource(source);
	const collectionLabel = this.collectionLabelFor(source, collectionId);
	const collectionRootPath = this.activeCollectionRootPath() || this.normalizeCollectionRootPath(`${collectionId}/`, collectionId);
	const created = [];

	for (const file of accepted) {
	  const ext = this.extensionFromName(file.name, '.jpg');
	  const baseId = this.slugifySegment(file.name.replace(/\.[^.]+$/, ''), 'image');
	  const itemId = this.uniqueDraftItemId(baseId, source.id, collectionId);
	  const workspaceId = toWorkspaceItemId(source.id, itemId);
	  const title = this.readableTitleFromFilename(file.name, itemId);
	  const mediaRepoPath = `media/${itemId}${ext}`;
	  const thumbRepoPath = `thumbs/${itemId}.thumb.jpg`;
	  const localFileRef = this.collectionAssetPath(workspaceId, 'original', ext);
	  const localThumbnailRef = this.collectionAssetPath(workspaceId, 'thumbnail', '.jpg');

	  const previewUrl = URL.createObjectURL(file);
	  this.registerObjectUrl(previewUrl);
	  let thumbnailBlob = null;
	  let thumbnailPreviewUrl = '';
	  try {
		thumbnailBlob = await this.generateThumbnailBlob(file);
	  } catch (error) {
		thumbnailBlob = null;
	  }

	  if (thumbnailBlob) {
		thumbnailPreviewUrl = URL.createObjectURL(thumbnailBlob);
		this.registerObjectUrl(thumbnailPreviewUrl);
	  }

	  const item = {
		id: itemId,
		title,
		description: '',
		creator: '',
		date: '',
		location: '',
		license: '',
		attribution: '',
		source: '',
		tags: [],
		include: true,
		media: {
		  type: 'image',
		  url: mediaRepoPath,
		  thumbnailUrl: thumbRepoPath,
		},
		previewUrl,
		thumbnailPreviewUrl,
		thumbnailRepoPath: thumbRepoPath,
		isLocalDraftAsset: true,
		draftUploadStatus: 'pending-upload',
		uploadError: '',
		sourceAssetId: itemId,
		workspaceId,
		sourceId: source.id,
		sourceLabel: source.label,
		sourceDisplayLabel: source.displayLabel || source.label,
		providerId: source.providerId,
		collectionId,
		collectionLabel,
		collectionRootPath,
		localFileRef,
		localThumbnailRef: thumbnailBlob ? localThumbnailRef : '',
	  };

	  await this.rememberLocalAssetFiles(item, file, thumbnailBlob);
	  created.push(item);
	}

	if (created.length === 0) {
	  return;
	}

	this.state.assets = [...this.state.assets, ...created];
	this.refreshSourceCollectionsAndCounts(source.id);
	this.state.selectedCollectionId = collectionId;
	this.state.selectedItemId = created[0].workspaceId;
	this.renderSourcesList();
	this.renderSourceFilter();
	this.renderCollectionFilter();
	this.renderAssets();
	this.renderEditor();

	if (this.state.opfsAvailable) {
	  await this.saveLocalDraft();
	}

	this.setStatus(
	  `${created.length} file${created.length === 1 ? '' : 's'} added to local draft. Ready to publish.`,
	  'ok',
	);
  }

  renderCapabilities(capabilitiesOrProvider) {
	const capabilities =
	  typeof capabilitiesOrProvider?.getCapabilities === 'function'
		? capabilitiesOrProvider.getCapabilities()
		: capabilitiesOrProvider || {};
	this.dom.capabilities.textContent = JSON.stringify(capabilities, null, 2);
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
	this.dom.sourceFilter.innerHTML = '';

	const allOption = document.createElement('option');
	allOption.value = 'all';
	allOption.textContent = 'All hosts';
	this.dom.sourceFilter.appendChild(allOption);

	for (const source of this.state.sources) {
	  const option = document.createElement('option');
	  option.value = source.id;
	  option.textContent = source.displayLabel || source.label || source.providerLabel || 'Source';
	  this.dom.sourceFilter.appendChild(option);
	}

	const stillExists = previous === 'all' || this.state.sources.some((entry) => entry.id === previous);
	this.state.activeSourceFilter = stillExists ? previous : 'all';
	this.dom.sourceFilter.value = this.state.activeSourceFilter;
	this.renderCollectionFilter();
  }

  renderCollectionFilter() {
	const previous = this.state.selectedCollectionId || 'all';
	this.dom.collectionFilter.innerHTML = '';

	const allOption = document.createElement('option');
	allOption.value = 'all';
	allOption.textContent = 'All collections';
	this.dom.collectionFilter.appendChild(allOption);

	let collections = [];
	if (this.state.activeSourceFilter !== 'all') {
	  const activeSource = this.getSourceById(this.state.activeSourceFilter);
	  collections = activeSource?.collections || [];
	  if (
		previous !== 'all' &&
		!collections.some((entry) => entry.id === previous)
	  ) {
		const localEntry = this.state.localDraftCollections.find((entry) => entry.id === previous);
		if (localEntry) {
		  collections = [...collections, localEntry];
		}
	  }
	} else if (this.state.localDraftCollections.length > 0) {
	  collections = this.state.localDraftCollections;
	}

	for (const collection of collections) {
	  const option = document.createElement('option');
	  option.value = collection.id;
	  option.textContent = collection.title || collection.id;
	  this.dom.collectionFilter.appendChild(option);
	}

	const stillExists = previous === 'all' || collections.some((entry) => entry.id === previous);
	this.state.selectedCollectionId = stillExists ? previous : 'all';
	this.dom.collectionFilter.value = this.state.selectedCollectionId;
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
	const list = this.dom.sourceList;
	list.innerHTML = '';

	if (this.state.sources.length === 0) {
	  const empty = document.createElement('div');
	  empty.className = 'empty';
	  empty.textContent = 'No hosts added yet.';
	  list.appendChild(empty);
	  return;
	}

	for (const source of this.state.sources) {
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
	  readBadge.className = 'badge ok';
	  readBadge.textContent = source.capabilities?.canSaveMetadata ? 'Read + Write' : 'Read';
	  const authBadge = document.createElement('span');
	  authBadge.className = 'badge';
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

	  const refreshBtn = document.createElement('button');
	  refreshBtn.type = 'button';
	  refreshBtn.className = 'btn';
	  refreshBtn.textContent = 'Refresh';
	  refreshBtn.addEventListener('click', async () => {
		await this.refreshSource(source.id);
	  });

	  const inspectBtn = document.createElement('button');
	  inspectBtn.type = 'button';
	  inspectBtn.className = 'btn';
	  inspectBtn.textContent = 'Inspect';
	  inspectBtn.addEventListener('click', () => {
		this.inspectSource(source.id);
	  });

	  const removeBtn = document.createElement('button');
	  removeBtn.type = 'button';
	  removeBtn.className = 'btn';
	  removeBtn.textContent = 'Remove';
	  removeBtn.addEventListener('click', () => {
		this.removeSource(source.id);
	  });

	  const showBtn = document.createElement('button');
	  showBtn.type = 'button';
	  showBtn.className = 'btn';
	  showBtn.textContent = 'Show only';
	  showBtn.addEventListener('click', () => {
		this.state.activeSourceFilter = source.id;
		this.renderSourceFilter();
		const visible = this.getVisibleAssets();
		this.state.selectedItemId = visible[0]?.workspaceId || null;
		this.renderAssets();
		this.renderEditor();
	  });

	  actions.append(refreshBtn, inspectBtn, showBtn, removeBtn);
	  card.append(top, status, meta, actions);
	  list.appendChild(card);
	}
  }

  collectCurrentProviderConfig(providerId) {
	const config = {};

	if (providerId === 'local') {
	  config.path = this.dom.localPathInput.value.trim() || COLLECTOR_CONFIG.defaultLocalManifestPath;
	}

	if (providerId === 'public-url') {
	  config.manifestUrl = this.dom.publicUrlInput.value.trim();
	}

	if (providerId === 'gdrive') {
	  config.sourceMode = this.dom.gdriveSourceMode.value || 'auth-manifest-file';
	  config.manifestUrl = this.dom.gdriveUrlInput.value.trim();
	  config.fileId = this.dom.gdriveFileIdInput.value.trim();
	  config.accessToken = this.dom.gdriveAccessTokenInput.value.trim();
	  config.oauthClientId = this.dom.gdriveClientIdInput.value.trim();
	  config.oauthScopes = COLLECTOR_CONFIG.googleDriveOAuth?.scope || 'https://www.googleapis.com/auth/drive.readonly';
	}

	if (providerId === 'github') {
	  config.token = this.dom.githubToken.value;
	  config.owner = this.dom.githubOwner.value;
	  config.repo = this.dom.githubRepo.value;
	  config.branch = this.dom.githubBranch.value;
	  config.path = this.dom.githubPath.value;
	}

	return config;
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
	  return this.hostNameFromPath(config.path, 'Local host');
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
	  return (config.path || '').trim() || 'Local host';
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
	if (!this.state.opfsAvailable) {
	  return;
	}

	const existingFiles = await this.opfsStorage.listFiles(SOURCES_DIR_PATH);
	const keep = new Set(payload.map((entry) => `${entry.id}.json`));
	for (const fileName of existingFiles) {
	  if (!keep.has(fileName)) {
		await this.opfsStorage.deleteFile(`${SOURCES_DIR_PATH}/${fileName}`);
	  }
	}

	for (const source of payload) {
	  await this.opfsStorage.writeJsonFile(this.sourceFilePath(source.id), source);
	}
  }

  async persistWorkspaceToOpfs(extra = {}) {
	if (!this.state.opfsAvailable) {
	  return;
	}

	const workspace = {
	  ...this.currentWorkspaceSnapshot(),
	  ...extra,
	};
	await this.opfsStorage.writeJsonFile(WORKSPACE_FILE_PATH, workspace);
  }

  async loadRememberedSourcesFromOpfs() {
	if (!this.state.opfsAvailable) {
	  return [];
	}

	const files = await this.opfsStorage.listFiles(SOURCES_DIR_PATH);
	if (files.length === 0) {
	  return [];
	}

	const remembered = [];
	for (const file of files) {
	  const data = await this.opfsStorage.readJsonFile(`${SOURCES_DIR_PATH}/${file}`);
	  if (data && typeof data === 'object') {
		remembered.push(data);
	  }
	}
	return remembered;
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
	this.state.metadataMode = 'collection';

	this.setStatus(`Restored ${restored.length} remembered storage source definitions.`, 'neutral');
	this.setConnectionStatus('Remembered storage sources loaded. Refresh to reconnect.', 'neutral');
	this.renderSourcesList();
	this.renderSourceFilter();
	this.renderAssets();
	this.renderEditor();

	for (const source of restored) {
	  if (
		source.providerId !== 'github' &&
		!(source.providerId === 'gdrive' && source.config?.sourceMode === 'auth-manifest-file')
	  ) {
		// Non-secret sources can reconnect automatically.
		await this.refreshSource(source.id);
	  }
	}
  }

  async initializeLocalDraftState() {
	try {
	  this.state.opfsAvailable = await this.opfsStorage.isOpfsAvailable();
	} catch (error) {
	  this.state.opfsAvailable = false;
	}

	if (!this.state.opfsAvailable) {
	  this.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
	  this.setLocalDraftControlsEnabled(false);
	  await this.restoreRememberedSources();
	  return;
	}

	this.setLocalDraftStatus('Local draft storage available.', 'ok');
	this.setLocalDraftControlsEnabled(true);
	await this.restoreRememberedSources();

	const workspace = await this.opfsStorage.readJsonFile(WORKSPACE_FILE_PATH);
	if (workspace) {
	  this.state.lastLocalSaveAt = workspace.lastLocalSaveAt || '';
	  this.applyWorkspaceSnapshot(workspace);
	  await this.restoreLocalDraft({ silent: true, preferredCollectionId: workspace.draftCollectionId || '' });
	  if (this.state.lastLocalSaveAt) {
		this.setLocalDraftStatus(`Local draft ready (last saved ${this.state.lastLocalSaveAt}).`, 'ok');
	  }
	}

	this.renderAssets();
	this.renderEditor();
  }

  async saveLocalDraft() {
	if (!this.state.opfsAvailable) {
	  this.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
	  return;
	}

	try {
	  const collectionId = this.draftCollectionId();
	  const payload = this.buildLocalDraftPayload();
	  await this.opfsStorage.writeJsonFile(this.draftFilePath(collectionId), payload);
	  this.state.lastLocalSaveAt = payload.savedAt;
	  await this.persistWorkspaceToOpfs({
		draftCollectionId: collectionId,
		lastLocalSaveAt: payload.savedAt,
	  });
	  await this.persistSourcesToOpfs(this.state.sources.map((source) => this.toPersistedSource(source)));
	  this.setLocalDraftStatus(`Saved local draft at ${payload.savedAt}.`, 'ok');
	  this.setStatus('Local draft saved to OPFS.', 'ok');
	} catch (error) {
	  this.setLocalDraftStatus(`Local draft save failed: ${error.message}`, 'warn');
	  this.setStatus(`Local draft save failed: ${error.message}`, 'warn');
	}
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
	if (!this.state.opfsAvailable) {
	  this.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
	  return;
	}

	const preferredCollectionId = (options.preferredCollectionId || '').trim();
	const collectionId = preferredCollectionId || this.draftCollectionId();
	try {
	  const payload = await this.opfsStorage.readJsonFile(this.draftFilePath(collectionId));
	  if (!payload) {
		if (!options.silent) {
		  this.setLocalDraftStatus(`No local draft found for ${collectionId}.`, 'warn');
		}
		return;
	  }

	  this.applyLocalDraftPayload(payload);
	  await this.rehydrateLocalDraftAssetUrls();
	  this.renderAssets();
	  this.renderEditor();
	  this.state.lastLocalSaveAt = payload.savedAt || '';
	  if (!options.silent) {
		const restoredSuffix = payload.savedAt ? ` from ${payload.savedAt}` : '';
		this.setLocalDraftStatus(
		  `Restored local draft${restoredSuffix}.`,
		  'ok',
		);
		this.setStatus('Local draft restored from OPFS.', 'ok');
	  }
	} catch (error) {
	  this.setLocalDraftStatus(`Local draft restore failed: ${error.message}`, 'warn');
	  if (!options.silent) {
		this.setStatus(`Local draft restore failed: ${error.message}`, 'warn');
	  }
	}
  }

  async discardLocalDraft() {
	if (!this.state.opfsAvailable) {
	  this.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
	  return;
	}

	const collectionId = this.draftCollectionId();
	try {
	  await this.opfsStorage.deleteFile(this.draftFilePath(collectionId));
	  const workspace = (await this.opfsStorage.readJsonFile(WORKSPACE_FILE_PATH)) || {};
	  if (workspace.draftCollectionId === collectionId) {
		delete workspace.draftCollectionId;
		workspace.lastLocalSaveAt = '';
		await this.opfsStorage.writeJsonFile(WORKSPACE_FILE_PATH, workspace);
	  }
	  this.state.lastLocalSaveAt = '';
	  this.setLocalDraftStatus(`Discarded local draft ${collectionId}.`, 'ok');
	  this.setStatus(`Discarded local draft ${collectionId}.`, 'ok');
	} catch (error) {
	  this.setLocalDraftStatus(`Discard draft failed: ${error.message}`, 'warn');
	  this.setStatus(`Discard draft failed: ${error.message}`, 'warn');
	}
  }

  normalizeSourceAssets(source, rawItems) {
	return (rawItems || []).map((item) => {
	  const sourceAssetId = item.id;
	  return {
		...item,
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

  mergeSourceAssets(sourceId, nextItems) {
	const withoutSource = this.state.assets.filter((item) => item.sourceId !== sourceId);
	this.state.assets = [...withoutSource, ...nextItems];
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

  openViewer(itemId) {
	const item = this.state.assets.find((entry) => entry.workspaceId === itemId);
	if (!item) {
	  return;
	}

	this.state.viewerItemId = itemId;
	if (this.state.selectedItemId !== itemId) {
	  this.state.selectedItemId = itemId;
	  this.state.metadataMode = 'item';
	  this.renderAssets();
	  this.renderEditor();
	}

	this.renderViewer();
	this.openDialog(this.dom.assetViewerDialog);
  }

  closeViewer() {
	this.state.viewerItemId = null;
	this.closeDialog(this.dom.assetViewerDialog);
  }

  renderViewer() {
	const item = this.state.assets.find((entry) => entry.workspaceId === this.state.viewerItemId);
	if (!item) {
	  this.closeViewer();
	  return;
	}

	this.dom.viewerTitle.textContent = item.title || item.id || 'Asset viewer';
	this.dom.viewerDescription.textContent = item.description || 'No description available.';
	this.dom.viewerBadges.innerHTML = '';
	this.dom.viewerMedia.innerHTML = '';

	const sourceBadge = document.createElement('span');
	sourceBadge.className = 'badge source-badge';
	sourceBadge.textContent = this.formatSourceBadge(item);

	const typeBadge = document.createElement('span');
	typeBadge.className = 'badge';
	typeBadge.textContent = `Type: ${item.media?.type || 'unknown'}`;

	const licenseBadge = document.createElement('span');
	const hasLicense = Boolean(item.license);
	licenseBadge.className = `badge ${hasLicense ? 'ok' : 'warn'}`;
	licenseBadge.textContent = hasLicense ? `License: ${item.license}` : 'License missing';
	this.dom.viewerBadges.append(sourceBadge, typeBadge, licenseBadge);

	const mediaType = (item.media?.type || '').toLowerCase();
	const mediaUrl = item.previewUrl || item.thumbnailPreviewUrl || item.media?.url || item.media?.thumbnailUrl || '';
	if (mediaUrl && mediaType.includes('image')) {
	  const image = document.createElement('img');
	  image.className = 'viewer-image';
	  image.src = mediaUrl;
	  image.alt = item.title || item.id || 'Asset image';
	  this.dom.viewerMedia.appendChild(image);
	} else if (mediaUrl && mediaType.includes('video')) {
	  const video = document.createElement('video');
	  video.className = 'viewer-video';
	  video.src = mediaUrl;
	  video.controls = true;
	  video.preload = 'metadata';
	  this.dom.viewerMedia.appendChild(video);
	} else {
	  const placeholder = document.createElement('div');
	  placeholder.className = 'empty';
	  placeholder.textContent = mediaUrl
		? 'Large preview is not available for this media type yet.'
		: 'No media URL available for this asset.';
	  this.dom.viewerMedia.appendChild(placeholder);
	}

	const openOriginalUrl = item.media?.url || mediaUrl;
	if (openOriginalUrl) {
	  this.dom.viewerOpenOriginal.href = openOriginalUrl;
	  this.dom.viewerOpenOriginal.classList.remove('is-hidden');
	} else {
	  this.dom.viewerOpenOriginal.removeAttribute('href');
	  this.dom.viewerOpenOriginal.classList.add('is-hidden');
	}
  }

  renderSourceContext() {
	const source = this.getSourceById(this.state.activeSourceFilter);
	this.dom.activeHostLabel.textContent = source
	  ? (source.displayLabel || source.label || source.providerLabel || 'Host')
	  : 'Select host';
  }

  renderSourcePicker() {
	const wrap = this.dom.sourcePickerList;
	wrap.innerHTML = '';
	if (this.state.sources.length === 0) {
	  const empty = document.createElement('div');
	  empty.className = 'empty';
	  empty.textContent = 'No hosts connected yet. Use Host manager to add one.';
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
		this.state.metadataMode = 'collection';
		this.state.openedCollectionId = null;
		this.state.selectedCollectionId = source.selectedCollectionId || 'all';
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
	if (!collectionId || collectionId === 'all') return;
	this.state.selectedCollectionId = collectionId;
	this.state.openedCollectionId = collectionId;
	this.state.currentLevel = 'items';
	this.state.metadataMode = 'item';
	this.state.selectedItemId = null;
	this.closeMobileEditor();
	this.renderAssets();
	this.renderEditor();
  }

  leaveCollectionView() {
	this.state.currentLevel = 'collections';
	this.state.metadataMode = 'collection';
	this.state.openedCollectionId = null;
	this.state.selectedItemId = null;
	this.closeMobileEditor();
	this.renderAssets();
	this.renderEditor();
  }

  async saveSelectedCollectionMetadata() {
	const selected = this.findSelectedCollectionMeta();
	if (!selected) {
	  this.setStatus('Select a collection to edit metadata.', 'warn');
	  return;
	}
	const patch = {
	  title: this.dom.collectionEditorTitle.value.trim(),
	  description: this.dom.collectionEditorDescription.value.trim(),
	  license: this.dom.collectionEditorLicense.value.trim(),
	  publisher: this.dom.collectionEditorPublisher.value.trim(),
	  language: this.dom.collectionEditorLanguage.value.trim(),
	};
	if (this.state.activeSourceFilter !== 'all') {
	  const source = this.getSourceById(this.state.activeSourceFilter);
	  if (source?.collections) {
		source.collections = source.collections.map((entry) => entry.id === selected.id ? { ...entry, ...patch } : entry);
	  }
	}
	this.state.localDraftCollections = this.state.localDraftCollections.map((entry) => entry.id === selected.id ? { ...entry, ...patch } : entry);
	this.renderAssets();
	this.renderEditor();
	this.setStatus(`Saved collection metadata for ${selected.id}.`, 'ok');
  }

  renderAssets() {
	const grid = this.dom.assetGrid;
	grid.innerHTML = '';
	this.renderSourceContext();

	if (this.state.currentLevel === 'collections') {
	  this.dom.viewportTitle.textContent = 'Collections';
	  this.dom.backToCollectionsBtn.classList.add('is-hidden');
	  this.dom.addImagesBtn.textContent = 'Add collection';
	  this.dom.assetGrid.classList.add('collections-grid');

	  let collections = [];
	  if (this.state.activeSourceFilter !== 'all') {
		const src = this.getSourceById(this.state.activeSourceFilter);
		collections = src?.collections || [];
	  } else {
		collections = this.state.localDraftCollections;
	  }
	  this.dom.assetCount.textContent = `${collections.length} collections`;

	  if (!collections.length) {
		const empty = document.createElement('div');
		empty.className = 'empty';
		empty.textContent = 'No collections yet. Add a collection to begin.';
		grid.appendChild(empty);
		return;
	  }

	  for (const collection of collections) {
		const card = document.createElement('article');
		card.className = 'asset-card collection-card';
		if (this.state.selectedCollectionId === collection.id) card.classList.add('is-selected');
		card.addEventListener('click', () => {
		  this.state.selectedCollectionId = collection.id;
		  this.renderAssets();
		  this.renderEditor();
		  if (this.isMobileViewport()) {
			this.openMobileEditor();
		  }
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
		  this.openCollectionView(collection.id);
		});
		actions.appendChild(openBtn);

		card.append(title, badges, actions);
		grid.appendChild(card);
	  }
	  return;
	}

	this.dom.assetGrid.classList.remove('collections-grid');
	const visibleAssets = this.getVisibleAssets().filter((item) => item.collectionId === this.state.openedCollectionId);
	const collection = this.findSelectedCollectionMeta();
	this.dom.viewportTitle.textContent = collection?.title || this.state.openedCollectionId || 'Collection';
	this.dom.backToCollectionsBtn.classList.remove('is-hidden');
	this.dom.addImagesBtn.textContent = 'Add item';
	this.dom.assetCount.textContent = `${visibleAssets.length} items`;

	if (visibleAssets.length === 0) {
	  const empty = document.createElement('div');
	  empty.className = 'empty';
	  empty.textContent = 'This collection has no items yet. Add item to begin.';
	  grid.appendChild(empty);
	  return;
	}

	for (const item of visibleAssets) {
	  const card = document.createElement('article');
	  card.className = 'asset-card';
	  card.setAttribute('role', 'button');
	  card.setAttribute('tabindex', '0');
	  card.setAttribute('aria-label', `Select item ${item.title || item.id}`);
	  if (this.state.selectedItemId === item.workspaceId) card.classList.add('is-selected');
	  card.addEventListener('click', () => this.selectItem(item.workspaceId));

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
		this.openViewer(item.workspaceId);
	  });
	  actions.append(openBtn);
	  card.append(preview, title, badges, actions);
	  grid.appendChild(card);
	}
  }

  selectItem(itemId) {
	if (this.state.selectedItemId === itemId) {
	  if (this.isMobileViewport()) {
		this.openMobileEditor();
	  }
	  return;
	}

	this.state.selectedItemId = itemId;
	this.state.metadataMode = 'item';
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

  renderMetadataMode(mode) {
	const activeMode = mode === 'collection' || mode === 'item' ? mode : 'none';
	const activeView = this.editorViews[activeMode] || null;

	Object.values(this.editorViews).forEach((node) => {
	  if (!node) {
		return;
	  }
	  if (node.parentElement === this.dom.editorContent) {
		this.dom.editorContent.removeChild(node);
	  }
	  node.hidden = false;
	});

	if (activeView) {
	  this.dom.editorContent.appendChild(activeView);
	}

	return activeMode;
  }

  renderEditor() {
	const metadataMode = this.state.metadataMode || 'none';
	const activeMode = this.renderMetadataMode(metadataMode);

	if (activeMode === 'collection') {
	  this.dom.editorTitle.textContent = 'Collection metadata';
	  const selectedCollection = this.findSelectedCollectionMeta();
	  if (!selectedCollection) {
		this.dom.editorContext.textContent = 'Select a collection.';
		this.renderMetadataMode('none');
		this.syncEditorVisibility();
		return;
	  }
	  this.dom.editorContext.textContent = selectedCollection.id;
	  this.dom.collectionEditorTitle.value = selectedCollection.title || '';
	  this.dom.collectionEditorDescription.value = selectedCollection.description || '';
	  this.dom.collectionEditorLicense.value = selectedCollection.license || '';
	  this.dom.collectionEditorPublisher.value = selectedCollection.publisher || '';
	  this.dom.collectionEditorLanguage.value = selectedCollection.language || '';
	  this.syncEditorVisibility();
	  return;
	}

	if (activeMode === 'item') {
	  this.dom.editorTitle.textContent = 'Item metadata';
	  const selected = this.findSelectedItem();
	  const selectedSource = selected ? this.getSourceById(selected.sourceId) : null;
	  const canSave = Boolean(selectedSource?.capabilities?.canSaveMetadata);

	  if (!selected) {
		this.dom.editorContext.textContent = 'Select an item.';
		this.renderMetadataMode('none');
		this.syncEditorVisibility();
		return;
	  }

	  this.dom.editorContext.textContent = canSave
		? `${selected.id} · ${selected.sourceDisplayLabel || selected.sourceLabel}`
		: `${selected.id} · ${selected.sourceDisplayLabel || selected.sourceLabel} (local edits)`;

	  this.dom.itemTitle.value = selected.title || '';
	  this.dom.itemDescription.value = selected.description || '';
	  this.dom.itemType.value = selected.media?.type || '';
	  this.dom.itemCreator.value = selected.creator || '';
	  this.dom.itemDate.value = selected.date || '';
	  this.dom.itemLocation.value = selected.location || '';
	  this.dom.itemLicense.value = selected.license || '';
	  this.dom.itemAttribution.value = selected.attribution || '';
	  this.dom.itemSource.value = selected.source || '';
	  this.dom.itemTags.value = Array.isArray(selected.tags) ? selected.tags.join(', ') : '';
	  this.dom.itemInclude.checked = selected.include !== false;
	  this.dom.saveItemBtn.disabled = false;
	  this.syncEditorVisibility();
	  return;
	}

	this.dom.editorTitle.textContent = 'Metadata editor';
	this.dom.editorContext.textContent = 'Select a collection or item.';
	this.syncEditorVisibility();
  }

  tagsToArray(rawValue) {
	return rawValue
	  .split(',')
	  .map((entry) => entry.trim())
	  .filter(Boolean);
  }

  collectEditorPatch() {
	return {
	  title: this.dom.itemTitle.value.trim(),
	  description: this.dom.itemDescription.value.trim(),
	  creator: this.dom.itemCreator.value.trim(),
	  date: this.dom.itemDate.value.trim(),
	  location: this.dom.itemLocation.value.trim(),
	  license: this.dom.itemLicense.value.trim(),
	  attribution: this.dom.itemAttribution.value.trim(),
	  source: this.dom.itemSource.value.trim(),
	  tags: this.tagsToArray(this.dom.itemTags.value),
	  include: this.dom.itemInclude.checked,
	  media: {
		type: this.dom.itemType.value.trim(),
	  },
	};
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
		this.setStatus('Metadata saved to GitHub.', 'ok');
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

	const provider = providerFactory();
	const config = this.collectCurrentProviderConfig(providerId);

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
	  const collections = this.buildCollectionsForSource(source, normalized);
	  const defaultCollectionId = collections[0]?.id || null;
	  const normalizedWithCollections = normalized.map((item) => ({
		...item,
		collectionId: item.collectionId || defaultCollectionId,
		collectionLabel: item.collectionLabel || collections.find((entry) => entry.id === (item.collectionId || defaultCollectionId))?.title || '',
	  }));
	  source.collections = collections;
	  source.selectedCollectionId = defaultCollectionId;
	  this.state.sources = [...this.state.sources, source];
	  this.state.assets = [...this.state.assets, ...normalizedWithCollections];
	  this.state.activeSourceFilter = source.id;
	  this.state.selectedCollectionId = source.selectedCollectionId || 'all';
	  this.state.currentLevel = 'collections';
	  this.state.openedCollectionId = null;
	  this.state.manifest = null;
	  this.dom.manifestPreview.textContent = '{}';

	  if (!this.state.selectedItemId) {
		this.state.selectedItemId = normalizedWithCollections[0]?.workspaceId || null;
	  }

	  this.setStatus(`Added storage source ${source.label} (${loaded.length} items).`, 'ok');
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
	if (source.providerId === 'github') {
	  this.dom.githubToken.value = source.config.token || '';
	  this.dom.githubOwner.value = source.config.owner || '';
	  this.dom.githubRepo.value = source.config.repo || '';
	  this.dom.githubBranch.value = source.config.branch || 'main';
	  this.dom.githubPath.value = source.config.path || '';
	}
	if (source.providerId === 'public-url') {
	  this.dom.publicUrlInput.value = source.config.manifestUrl || '';
	}
	if (source.providerId === 'gdrive') {
	  this.dom.gdriveSourceMode.value = source.config.sourceMode || 'public-manifest-url';
	  this.dom.gdriveUrlInput.value = source.config.manifestUrl || '';
	  this.dom.gdriveFileIdInput.value = source.config.fileId || '';
	  this.dom.gdriveClientIdInput.value = source.config.oauthClientId || COLLECTOR_CONFIG.googleDriveOAuth?.clientId || '';
	  this.dom.gdriveAccessTokenInput.value = '';
	  this.renderGoogleDriveMode();
	  this.setGoogleDriveAuthStatus(
		source.config.sourceMode === 'auth-manifest-file'
		  ? 'Re-authentication required before refresh.'
		  : 'Public shared URL mode selected.',
		source.config.sourceMode === 'auth-manifest-file' ? 'warn' : 'neutral',
	  );
	}
	if (source.providerId === 'local') {
	  this.dom.localPathInput.value = source.config.path || COLLECTOR_CONFIG.defaultLocalManifestPath;
	}

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
	  const result = await provider.connect(source.config || {});
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
	  const refreshedConfig = { ...(source.config || {}) };
	  if (source.providerId === 'gdrive') {
		refreshedConfig._manifestTitle = result.sourceDisplayLabel || source.displayLabel || '';
		refreshedConfig._normalizedFileId = result.fileId || source.config?.fileId || '';
		refreshedConfig._normalizedManifestUrl = result.normalizedManifestUrl || '';
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
				...(source.config || {}),
				fileId: result.fileId || source.config?.fileId || '',
				sourceMode: source.config?.sourceMode || 'public-manifest-url',
			  }
			: source.config,
		collections: source.collections || [],
		selectedCollectionId: source.selectedCollectionId || null,
		needsReconnect: false,
		needsCredentials: false,
	  };
	  const normalized = this.normalizeSourceAssets(updatedSource, loaded);
	  const collections = this.buildCollectionsForSource(updatedSource, normalized);
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

	if (this.state.selectedItemId && !this.state.assets.some((item) => item.workspaceId === this.state.selectedItemId)) {
	  this.state.selectedItemId = this.getVisibleAssets()[0]?.workspaceId || this.state.assets[0]?.workspaceId || null;
	}
	if (this.state.viewerItemId && !this.state.assets.some((item) => item.workspaceId === this.state.viewerItemId)) {
	  this.closeViewer();
	}

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
	const {
	  workspaceId,
	  sourceId,
	  sourceLabel,
	  sourceDisplayLabel,
	  providerId,
	  sourceAssetId,
	  collectionId,
	  collectionLabel,
	  previewUrl,
	  thumbnailPreviewUrl,
	  thumbnailRepoPath,
	  isLocalDraftAsset,
	  draftUploadStatus,
	  uploadError,
	  localFileRef,
	  localThumbnailRef,
	  ...manifestItem
	} = item;
	return manifestItem;
  }

  buildManifestFromState() {
	const baseFromCurrent =
	  this.state.manifest && typeof this.state.manifest === 'object'
		? JSON.parse(JSON.stringify(this.state.manifest))
		: {};
	const collectionMeta = this.currentCollectionMeta();
	const selectedSourceId = this.state.activeSourceFilter || 'all';
	const selectedCollectionId = this.state.selectedCollectionId || 'all';
	const includedItems = this.state.assets
	  .filter((item) => item.include !== false)
	  .filter((item) => (selectedSourceId === 'all' ? true : item.sourceId === selectedSourceId))
	  .filter((item) => (selectedCollectionId === 'all' ? true : item.collectionId === selectedCollectionId))
	  .map((item) => this.toManifestItem(item));
	return {
	  ...baseFromCurrent,
	  ...collectionMeta,
	  items: includedItems,
	};
  }

  async generateManifest(options = {}) {
	const collectionMeta = this.currentCollectionMeta();
	if (!collectionMeta.id || !collectionMeta.title) {
	  this.setStatus('Create or complete collection metadata before generating a manifest.', 'warn');
	  return null;
	}
	if ((this.state.selectedCollectionId || 'all') === 'all') {
	  this.setStatus('Select one collection before generating a manifest.', 'warn');
	  return null;
	}

	try {
	  const manifest = this.buildManifestFromState();
	  const errors = validateCollectionShape(manifest);
	  if (errors.length > 0) {
		this.setStatus(`Manifest validation failed: ${errors.join(' ')}`, 'warn');
		return null;
	  }

	  this.state.manifest = manifest;
	  this.dom.manifestPreview.textContent = JSON.stringify(manifest, null, 2);
	  if (!options.silent) {
		this.setStatus('Manifest generated and validated.', 'ok');
	  }
	  if (this.state.opfsAvailable) {
		this.persistWorkspaceToOpfs().catch(() => {});
	  }
	  return manifest;
	} catch (error) {
	  this.setStatus(`Manifest generation failed: ${error.message}`, 'warn');
	  return null;
	}
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
	  this.state.metadataMode = 'collection';
	  this.state.openedCollectionId = null;
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
	if (!this.state.manifest) {
	  this.setStatus('Generate manifest before copying.', 'warn');
	  return;
	}

	try {
	  await navigator.clipboard.writeText(JSON.stringify(this.state.manifest, null, 2));
	  this.setStatus('Manifest copied to clipboard.', 'ok');
	} catch (error) {
	  this.setStatus(`Clipboard copy failed: ${error.message}`, 'warn');
	}
  }

  downloadManifest() {
	if (!this.state.manifest) {
	  this.setStatus('Generate manifest before download.', 'warn');
	  return;
	}

	const blob = new Blob([JSON.stringify(this.state.manifest, null, 2)], {
	  type: 'application/json',
	});

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = 'collection.json';
	anchor.click();
	URL.revokeObjectURL(url);

	this.setStatus('Downloaded collection.json.', 'ok');
  }
}

if (!customElements.get('open-collections-manager')) {
  customElements.define('open-collections-manager', OpenCollectionsManagerElement);
}
