
import '../../collector/src/components/pane-layout.js';
import './components/configurator-header.js';
import './components/configurator-section-browser.js';
import './components/configurator-inspector.js';
import { configuratorShellStyles } from './css/shell.css.js';
import {
  createSourceDescriptor,
  createWorkspaceState,
  sourceDescriptorLabel,
} from './workspace/source-model.js';
import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from './workspace/workspace-persistence.js';
import { revivePlatformHandle } from '../../../shared/platform/index.js';
import {
  openJsonSourceFile,
  openSourceDirectory,
  saveSourceText,
  writeSourceText,
} from './platform/configurator-source-api.js';

const WORKSPACES = new Set(['general', 'products', 'materials']);

const SECTION_LABELS = {
  info: 'Organization Info',
  supplierLinks: 'Supplier Links',
  availableCollections: 'Available Collections',
  defaults: 'Defaults / Policies',
  globalSettings: 'Global Settings',
  settings: 'Settings',
  packages: 'Packages',
  products: 'Products',
  configurations: 'Configurations',
  blocks: 'Blocks',
  connectorTypes: 'Connector Types',
  connectionTypes: 'Connection Types',
  blockCategoryTypes: 'Block Category Types',
  blockCategories: 'Block Categories',
  categories: 'Categories',
  meshes: 'Meshes',
  gltfs: 'GLTFs',
  loadingBases: 'Loading Bases',
  images: 'Images',
  materials: 'Materials',
  textures: 'Textures',
  materialSets: 'Material Sets',
  materialCategories: 'Material Categories',
  materialCategoryTypes: 'Material Category Types',
};

const PRODUCT_SECTION_ORDER = [
  'configurations',
  'blocks',
  'connectorTypes',
  'connectionTypes',
  'blockCategoryTypes',
  'blockCategories',
  'categories',
  'meshes',
  'gltfs',
  'loadingBases',
  'images',
  'settings',
  'defaults',
];

const MATERIAL_SECTION_ORDER = [
  'materials',
  'textures',
  'images',
  'materialSets',
  'materialCategories',
  'materialCategoryTypes',
  'settings',
  'defaults',
];

const GENERAL_SECTION_ORDER = ['info', 'supplierLinks', 'availableCollections', 'packages', 'products', 'globalSettings', 'settings', 'defaults'];

const DEFAULT_CARD_SECTIONS = new Set(['products-collections', 'materials-collections', 'products-entries:blocks']);


const RELATION_FIELD_TARGETS = {
  categoryId: 'categories',
  categoryIds: 'categories',
  blockCategoryTypeId: 'blockCategoryTypes',
  blockCategoryTypeIds: 'blockCategoryTypes',
  blockCategoryId: 'blockCategories',
  blockCategoryIds: 'blockCategories',
  meshId: 'meshes',
  meshIds: 'meshes',
  materialId: 'materials',
  materialIds: 'materials',
  textureId: 'textures',
  textureIds: 'textures',
  imageId: 'images',
  imageIds: 'images',
  gltfId: 'gltfs',
  gltfIds: 'gltfs',
  loadingBaseId: 'loadingBases',
  loadingBaseIds: 'loadingBases',
  connectorTypeId: 'connectorTypes',
  connectorTypeIds: 'connectorTypes',
  connectionTypeId: 'connectionTypes',
  connectionTypeIds: 'connectionTypes',
  blockId: 'blocks',
  blockIds: 'blocks',
  configurationId: 'configurations',
  configurationIds: 'configurations',
  materialSetId: 'materialSets',
  materialSetIds: 'materialSets',
};

const GENERAL_METADATA_PRIORITY = [
  'id',
  'version',
  'name',
  'address',
  'url',
  'googleAnalyticsCode',
  'pricesInCents',
];

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(value, fallback = 'item') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

function cloneJson(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEditableSection(value) {
  return Array.isArray(value) || isPlainObject(value);
}

function isScalarValue(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function friendlySectionLabel(key) {
  if (SECTION_LABELS[key]) {
    return SECTION_LABELS[key];
  }
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function createEmptyValidation() {
  return {
    overviewWarnings: [],
    sections: {},
  };
}

function createManufacturerTemplate() {
  return {
    id: '',
    title: '',
    description: '',
    version: '1.0.0',
    info: {},
    supplierLinks: [],
    availableCollections: {
      products: [],
      materials: [],
    },
    defaults: {},
    globalSettings: {},
    settings: {},
  };
}

function createCollectionTemplate(workspace) {
  if (workspace === 'products') {
    return {
      id: '',
      title: '',
      description: '',
      version: '1.0.0',
      configurations: [],
      blocks: [],
      connectorTypes: [],
      connectionTypes: [],
      blockCategoryTypes: [],
      blockCategories: [],
      categories: [],
      meshes: [],
      gltfs: [],
      loadingBases: [],
      images: [],
      settings: {},
    };
  }

  return {
    id: '',
    title: '',
    description: '',
    version: '1.0.0',
    materials: [],
    textures: [],
    images: [],
    materialSets: [],
    materialCategories: [],
    materialCategoryTypes: [],
    settings: {},
    defaults: {},
  };
}
function validateArraySections(data) {
  const sections = {};
  if (!isPlainObject(data)) {
    return sections;
  }

  for (const [sectionId, sectionValue] of Object.entries(data)) {
    if (!Array.isArray(sectionValue)) {
      continue;
    }

    const missingIds = [];
    const duplicateIds = [];
    const entryWarnings = {};
    const seen = new Map();

    sectionValue.forEach((entry, index) => {
      const warnings = [];
      if (!isPlainObject(entry)) {
        warnings.push('Entry should be an object.');
      }
      const id = isPlainObject(entry) ? String(entry.id || '').trim() : '';
      if (!id) {
        missingIds.push(index);
        warnings.push('Missing id.');
      } else if (seen.has(id)) {
        duplicateIds.push(id);
        warnings.push(`Duplicate id: ${id}`);
        const first = seen.get(id);
        entryWarnings[first] = [...(entryWarnings[first] || []), `Duplicate id: ${id}`];
      } else {
        seen.set(id, index);
      }

      if (warnings.length > 0) {
        entryWarnings[index] = [...(entryWarnings[index] || []), ...warnings];
      }
    });

    const uniqueDuplicates = Array.from(new Set(duplicateIds));
    sections[sectionId] = {
      missingIds,
      duplicateIds: uniqueDuplicates,
      entryWarnings,
      warningCount: missingIds.length + uniqueDuplicates.length,
    };
  }

  return sections;
}

function validateDataRoot(workspace, data) {
  const result = createEmptyValidation();
  if (!isPlainObject(data)) {
    result.overviewWarnings.push(`${workspace} source root must be an object.`);
    return result;
  }

  if (workspace === 'products') {
    if (!Array.isArray(data.blocks)) {
      result.overviewWarnings.push('Missing blocks array.');
    }
    if (!Array.isArray(data.configurations)) {
      result.overviewWarnings.push('Missing configurations array.');
    }
  }

  if (workspace === 'materials') {
    if (!Array.isArray(data.materials)) {
      result.overviewWarnings.push('Missing materials array.');
    }
    if (!Array.isArray(data.textures)) {
      result.overviewWarnings.push('Missing textures array.');
    }
  }

  if (workspace === 'general') {
    if (!isPlainObject(data.info) && !isPlainObject(data.settings)) {
      result.overviewWarnings.push('Organization info/settings are missing.');
    }
  }

  result.sections = validateArraySections(data);
  return result;
}

function makeCollectionRecord(workspace, data, organizationId, fileHandle = null, fileName = '') {
  const derivedId = String(data?.id || '').trim() || slugify(fileName.replace(/\.[^.]+$/, ''), `${workspace}-collection`);
  const title = String(data?.title || data?.name || derivedId || `${workspace} collection`).trim() || `${workspace} collection`;
  const normalizedId = slugify(derivedId || title, `${workspace}-collection`);
  const ownerOrgId = String(data?.ownerOrganizationId || data?.sourceOrganizationId || organizationId || '').trim() || organizationId;
  const isLinkedExternal = ownerOrgId !== organizationId;

  const role = workspace === 'products' ? 'products' : 'materials';
  const source = createSourceDescriptor({
    role,
    label: title,
    ownerOrgId,
    collectionId: normalizedId,
    connectionType: 'local-file',
    fileHandle,
    fileName,
    sourcePath: fileName,
    isLinkedExternal,
    isLoaded: true,
    isDirty: false,
    data: isPlainObject(data) ? data : {},
    validation: validateDataRoot(workspace, data),
  });

  return {
    ...source,
    id: normalizedId,
    title,
    ownerOrganizationId: ownerOrgId,
    sourceOrganizationId: ownerOrgId,
    sourceType: source.connectionType,
    linked: source.isLinkedExternal,
  };
}

function setSourceDirty(source, dirty) {
  if (!source || typeof source !== 'object') {
    return;
  }
  source.isDirty = Boolean(dirty);
  source.dirty = Boolean(dirty);
}

function ensureUniqueEntryId(list, candidate) {
  const base = slugify(candidate, 'entry');
  const existing = new Set(
    (Array.isArray(list) ? list : [])
      .map((entry) => (isPlainObject(entry) ? String(entry.id || '').trim() : ''))
      .filter(Boolean),
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

function mergeAdditive(base, addon) {
  if (!isPlainObject(addon)) {
    return base;
  }
  const target = isPlainObject(base) ? base : {};
  for (const [key, value] of Object.entries(addon)) {
    if (!(key in target)) {
      target[key] = cloneJson(value);
      continue;
    }
    if (isPlainObject(target[key]) && isPlainObject(value)) {
      target[key] = mergeAdditive(target[key], value);
      continue;
    }
    if (Array.isArray(target[key]) && Array.isArray(value) && target[key].length === 0 && value.length > 0) {
      target[key] = cloneJson(value);
    }
  }
  return target;
}

function buildIdSets(data) {
  const map = new Map();
  if (!isPlainObject(data)) {
    return map;
  }
  for (const [sectionId, sectionValue] of Object.entries(data)) {
    if (!Array.isArray(sectionValue)) {
      continue;
    }
    const ids = new Set();
    for (const entry of sectionValue) {
      if (!isPlainObject(entry)) {
        continue;
      }
      const id = String(entry.id || '').trim();
      if (id) {
        ids.add(id);
      }
    }
    map.set(sectionId, ids);
  }
  return map;
}

function buildRelationOptionsFromData(data) {
  const options = {};
  if (!isPlainObject(data)) {
    return options;
  }
  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value)) {
      continue;
    }
    options[key] = value
      .map((entry) => {
        if (!isPlainObject(entry)) {
          return null;
        }
        const id = String(entry.id || '').trim();
        if (!id) {
          return null;
        }
        const title = String(entry.title || entry.name || entry.label || '').trim();
        return {
          value: id,
          label: title ? `${id} - ${title}` : id,
        };
      })
      .filter(Boolean);
  }
  return options;
}

function mergeRelationOptions(target, source) {
  const merged = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    const existing = Array.isArray(merged[key]) ? merged[key] : [];
    const byId = new Map(existing.map((item) => [String(item.value), item]));
    for (const item of Array.isArray(value) ? value : []) {
      byId.set(String(item.value), item);
    }
    merged[key] = Array.from(byId.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }
  return merged;
}
class OpenConfiguratorManagerElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const defaultOrganizationId = 'org-4x6-sofa';
    this.state = {
      organizations: [
        {
          id: defaultOrganizationId,
          label: '4x6 sofa',
        },
      ],
      workspace: createWorkspaceState(defaultOrganizationId),
      activeWorkspace: 'general',
      currentLevel: 'general-sections',
      activeSectionId: null,
      selectedEntryRef: null,
      viewModes: {},
      relationOptions: {},
      statusText: 'Select an organization and open source files to begin.',
      pendingOpenTarget: null,
      pendingOrganizationId: null,
      pendingNewCollectionWorkspace: null,
      pendingNewCollectionName: '',
    };
    this.persistenceTimer = null;
    this.isRestoringWorkspace = false;
  }

  async connectedCallback() {
    this.render();
    this.cacheDom();
    this.bindEvents();
    this.isRestoringWorkspace = true;
    await this.restorePersistedWorkspaceState();
    this.isRestoringWorkspace = false;
    this.recomputeDerivedState();
    this.refreshAll();
  }

  disconnectedCallback() {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
      this.persistenceTimer = null;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${configuratorShellStyles}</style>
      <div class="app-shell">
        <open-configurator-header id="configHeader"></open-configurator-header>
        <section class="workspace">
          <open-pane-layout id="paneLayout" inspector-placement="hidden">
            <open-configurator-section-browser id="sectionBrowser" slot="main"></open-configurator-section-browser>
            <open-configurator-inspector id="inspector" slot="inspector"></open-configurator-inspector>
          </open-pane-layout>
        </section>
        <input id="openFileInput" type="file" accept=".json,application/json" hidden />
        <dialog id="organizationDialog" class="config-dialog" aria-label="Set organization">
          <div class="dialog-shell">
            <div class="dialog-header">
              <h2 class="dialog-title">Set organization</h2>
              <button class="btn" type="button" data-close-dialog="organizationDialog">Close</button>
            </div>
            <div class="dialog-body">
              <p class="dialog-subtext">Choose the active organization context.</p>
              <div id="organizationList" class="pick-list" role="listbox" aria-label="Available organizations"></div>
            </div>
            <div class="dialog-actions">
              <button class="btn" type="button" data-close-dialog="organizationDialog">Cancel</button>
              <button class="btn btn-primary" id="confirmOrganizationBtn" type="button">Use selected organization</button>
            </div>
          </div>
        </dialog>
        <dialog id="sourcesDialog" class="config-dialog" aria-label="Set sources">
          <div class="dialog-shell">
            <div class="dialog-header">
              <h2 class="dialog-title">Set sources</h2>
              <button class="btn" type="button" data-close-dialog="sourcesDialog">Close</button>
            </div>
            <div class="dialog-body">
              <p class="dialog-subtext">Configure workspace source connections for this organization.</p>
              <div class="source-role-list">
                <section class="source-role-card">
                  <div>
                    <p class="source-role-title">Organization source</p>
                    <p id="organizationSourceSummary" class="source-role-meta">Missing</p>
                  </div>
                  <button class="btn" id="setOrganizationSourceBtn" type="button">Set source</button>
                </section>
                <section class="source-role-card">
                  <div>
                    <p class="source-role-title">Products source</p>
                    <p id="productsSourceSummary" class="source-role-meta">Missing</p>
                  </div>
                  <button class="btn" id="setProductsSourceBtn" type="button">Set source</button>
                </section>
                <section class="source-role-card">
                  <div>
                    <p class="source-role-title">Materials source</p>
                    <p id="materialsSourceSummary" class="source-role-meta">Missing</p>
                    <p id="materialsSourceDetail" class="source-role-detail"></p>
                  </div>
                  <button class="btn" id="setMaterialsSourceBtn" type="button">Set source</button>
                </section>
                <section class="source-role-card">
                  <div>
                    <p class="source-role-title">Packages source</p>
                    <p id="packagesSourceSummary" class="source-role-meta">Missing</p>
                  </div>
                  <button class="btn" id="setPackagesSourceBtn" type="button">Set source</button>
                </section>
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn" type="button" data-close-dialog="sourcesDialog">Done</button>
            </div>
          </div>
        </dialog>
        <dialog id="newCollectionDialog" class="config-dialog" aria-label="New collection">
          <div class="dialog-shell">
            <div class="dialog-header">
              <h2 id="newCollectionDialogTitle" class="dialog-title">New collection</h2>
              <button class="btn" type="button" data-close-dialog="newCollectionDialog">Close</button>
            </div>
            <div class="dialog-body">
              <div class="field-row">
                <label for="newCollectionNameInput">Collection name</label>
                <input id="newCollectionNameInput" type="text" autocomplete="off" />
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn" type="button" data-close-dialog="newCollectionDialog">Cancel</button>
              <button class="btn btn-primary" id="confirmNewCollectionBtn" type="button" disabled>Create</button>
            </div>
          </div>
        </dialog>
      </div>
    `;
  }

  cacheDom() {
    const root = this.shadowRoot;
    this.dom = {
      header: root.getElementById('configHeader'),
      paneLayout: root.getElementById('paneLayout'),
      sectionBrowser: root.getElementById('sectionBrowser'),
      inspector: root.getElementById('inspector'),
      openFileInput: root.getElementById('openFileInput'),
      organizationDialog: root.getElementById('organizationDialog'),
      organizationList: root.getElementById('organizationList'),
      confirmOrganizationBtn: root.getElementById('confirmOrganizationBtn'),
      sourcesDialog: root.getElementById('sourcesDialog'),
      organizationSourceSummary: root.getElementById('organizationSourceSummary'),
      productsSourceSummary: root.getElementById('productsSourceSummary'),
      materialsSourceSummary: root.getElementById('materialsSourceSummary'),
      materialsSourceDetail: root.getElementById('materialsSourceDetail'),
      packagesSourceSummary: root.getElementById('packagesSourceSummary'),
      setOrganizationSourceBtn: root.getElementById('setOrganizationSourceBtn'),
      setProductsSourceBtn: root.getElementById('setProductsSourceBtn'),
      setMaterialsSourceBtn: root.getElementById('setMaterialsSourceBtn'),
      setPackagesSourceBtn: root.getElementById('setPackagesSourceBtn'),
      newCollectionDialog: root.getElementById('newCollectionDialog'),
      newCollectionDialogTitle: root.getElementById('newCollectionDialogTitle'),
      newCollectionNameInput: root.getElementById('newCollectionNameInput'),
      confirmNewCollectionBtn: root.getElementById('confirmNewCollectionBtn'),
    };
  }

  bindEvents() {
    this.dom.header.addEventListener('workspace-select', (event) => {
      this.switchWorkspace(event.detail?.workspace || 'general');
    });

    this.dom.header.addEventListener('organization-menu-action', (event) => {
      const action = event.detail?.action || '';
      if (action === 'set-organization') {
        this.openOrganizationDialog();
      }
      if (action === 'set-sources') {
        this.openSourcesDialog();
      }
    });

    this.dom.sectionBrowser.addEventListener('panel-back', () => {
      this.navigateBack();
    });

    this.dom.sectionBrowser.addEventListener('panel-action', (event) => {
      const actionId = event.detail?.actionId || '';
      if (actionId) {
        this.handlePanelAction(actionId);
      }
    });

    this.dom.sectionBrowser.addEventListener('entry-select', (event) => {
      const nextEntryRef = event.detail?.entryRef || null;
      this.state.selectedEntryRef = nextEntryRef;
      this.normalizeSelection();
      this.renderBrowser();
      this.renderInspector();
    });

    this.dom.sectionBrowser.addEventListener('section-open', async (event) => {
      const index = Number(event.detail?.index);
      if (!Number.isInteger(index)) {
        return;
      }
      this.state.selectedEntryRef = { index };
      if (this.state.currentLevel === 'products-collections' || this.state.currentLevel === 'materials-collections') {
        await this.openCollectionAtIndex(index);
        return;
      }
      if (
        this.state.currentLevel === 'general-sections'
        || this.state.currentLevel === 'products-sections'
        || this.state.currentLevel === 'materials-sections'
      ) {
        this.openSectionAtIndex(index);
      }
    });

    this.dom.sectionBrowser.addEventListener('view-mode-change', (event) => {
      const mode = event.detail?.mode === 'cards' ? 'cards' : 'rows';
      const key = this.currentViewModeKey();
      this.state.viewModes = {
        ...this.state.viewModes,
        [key]: mode,
      };
      this.renderBrowser();
    });

    this.dom.sectionBrowser.addEventListener('array-action', (event) => {
      const action = event.detail?.action || '';
      if (action) {
        this.applyArrayAction(action);
      }
    });

    this.dom.inspector.addEventListener('entry-change', (event) => {
      this.applyEntryChange(event.detail || {});
    });

    this.dom.openFileInput.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0] || null;
      if (file) {
        await this.handlePendingOpenFile(file);
      }
      event.target.value = '';
    });

    this.shadowRoot.querySelectorAll('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => {
        const dialogId = button.getAttribute('data-close-dialog') || '';
        if (dialogId) {
          this.closeDialog(dialogId);
        }
      });
    });

    this.dom.confirmOrganizationBtn?.addEventListener('click', () => {
      this.confirmOrganizationSelection();
    });

    this.dom.organizationList?.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-organization-id]');
      const organizationId = button?.getAttribute('data-organization-id') || '';
      if (!organizationId) {
        return;
      }
      this.state.pendingOrganizationId = organizationId;
      this.renderOrganizationDialog();
    });

    this.dom.organizationList?.addEventListener('dblclick', (event) => {
      const button = event.target?.closest?.('[data-organization-id]');
      const organizationId = button?.getAttribute('data-organization-id') || '';
      if (!organizationId) {
        return;
      }
      this.state.pendingOrganizationId = organizationId;
      this.confirmOrganizationSelection();
    });

    this.dom.setOrganizationSourceBtn?.addEventListener('click', async () => {
      this.closeDialog('sourcesDialog');
      await this.openOrganizationSourceFolder();
    });
    this.dom.setProductsSourceBtn?.addEventListener('click', async () => {
      this.closeDialog('sourcesDialog');
      await this.openProductsSourceFolder();
    });
    this.dom.setMaterialsSourceBtn?.addEventListener('click', async () => {
      this.closeDialog('sourcesDialog');
      await this.openMaterialsSourceFolder();
    });
    this.dom.setPackagesSourceBtn?.addEventListener('click', async () => {
      this.closeDialog('sourcesDialog');
      await this.openPackagesFile();
    });

    this.dom.newCollectionNameInput?.addEventListener('input', (event) => {
      this.state.pendingNewCollectionName = String(event.target?.value || '');
      this.syncNewCollectionDialogControls();
    });
    this.dom.newCollectionNameInput?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      this.confirmNewCollectionFromDialog();
    });
    this.dom.confirmNewCollectionBtn?.addEventListener('click', () => {
      this.confirmNewCollectionFromDialog();
    });
  }
  currentOrganizationLabel() {
    const currentOrganizationId = this.currentOrganizationId();
    return this.state.organizations.find((org) => org.id === currentOrganizationId)?.label || 'Organization';
  }

  organizationsFromManufacturerSource() {
    const source = this.manufacturerSource();
    if (Array.isArray(source?.discoveredOrganizations) && source.discoveredOrganizations.length > 0) {
      return source.discoveredOrganizations.map((entry) => ({
        id: String(entry.id || entry.folderName || '').trim(),
        label: String(entry.label || entry.folderName || entry.id || '').trim() || 'Organization',
      })).filter((entry) => entry.id);
    }
    const raw = Array.isArray(source?.data?.organizations) ? source.data.organizations : [];
    const normalized = raw
      .map((entry, index) => {
        if (typeof entry === 'string') {
          const label = entry.trim();
          if (!label) {
            return null;
          }
          return {
            id: slugify(label, `org-${index + 1}`),
            label,
          };
        }
        if (!isPlainObject(entry)) {
          return null;
        }
        const id = String(entry.id || entry.organizationId || '').trim() || slugify(entry.label || entry.name || `org-${index + 1}`);
        const label = String(entry.label || entry.name || id).trim() || id;
        return { id, label };
      })
      .filter(Boolean);
    return normalized;
  }

  organizationOptions() {
    const fromSource = this.organizationsFromManufacturerSource();
    if (fromSource.length > 0) {
      return fromSource;
    }
    return Array.isArray(this.state.organizations) ? this.state.organizations : [];
  }

  syncOrganizationsFromSource() {
    const options = this.organizationOptions();
    if (options.length === 0) {
      return;
    }
    this.state.organizations = options;
    const current = this.currentOrganizationId();
    if (!options.some((org) => org.id === current)) {
      this.state.workspace.currentOrganizationId = options[0].id;
    }
  }

  renderOrganizationDialog() {
    if (!this.dom.organizationList) {
      return;
    }
    const organizations = this.organizationOptions();
    if (organizations.length === 0) {
      this.dom.organizationList.innerHTML = '<div class="empty-state">No organizations available.</div>';
      return;
    }
    const pending = this.state.pendingOrganizationId || this.currentOrganizationId();
    this.dom.organizationList.innerHTML = organizations.map((org) => {
      const selected = org.id === pending;
      return `
        <button
          type="button"
          class="pick-item ${selected ? 'is-selected' : ''}"
          data-organization-id="${org.id}"
          aria-selected="${selected ? 'true' : 'false'}"
        >
          <span class="pick-label">${org.label}</span>
          <span class="pick-id">${org.id}</span>
        </button>
      `;
    }).join('');
  }

  openOrganizationDialog() {
    if (!this.dom.organizationDialog) {
      return;
    }
    this.syncOrganizationsFromSource();
    this.state.pendingOrganizationId = this.currentOrganizationId();
    this.renderOrganizationDialog();
    if (!this.dom.organizationDialog.open) {
      this.dom.organizationDialog.showModal();
    }
  }

  async confirmOrganizationSelection() {
    const nextId = String(this.state.pendingOrganizationId || '').trim();
    if (!nextId) {
      return;
    }
    this.state.workspace.currentOrganizationId = nextId;
    try {
      await this.loadOrganizationInfoForCurrentSelection();
      await this.resolveProductsSourceForCurrentOrganization();
      await this.resolveMaterialsSourceForCurrentOrganization();
      this.setStatus(`Organization switched to ${this.currentOrganizationLabel()}.`);
    } catch (error) {
      this.setStatus(`Could not load organization info: ${error.message}`);
    }
    this.closeDialog('organizationDialog');
    this.refreshAll();
  }

  sourceSummary(source) {
    if (!source) {
      return 'Missing';
    }
    const bits = [source.label || source.fileName || source.sourceId || 'Source'];
    if (source.fileName) {
      bits.push(source.fileName);
    }
    if (source.connectionType) {
      bits.push(source.connectionType);
    }
    if (source.isDirty) {
      bits.push('unsaved');
    }
    if (source.needsReconnect) {
      bits.push('reconnect needed');
    }
    return bits.filter(Boolean).join(' | ');
  }

  renderSourcesDialog() {
    const manufacturer = this.manufacturerSource();
    const productsRoot = this.productSource();
    const materialsRoot = this.materialRootSource();
    const materials = this.materialSources();
    const packages = this.packagesSource();

    if (this.dom.organizationSourceSummary) {
      const discoveredCount = Array.isArray(manufacturer?.discoveredOrganizations)
        ? manufacturer.discoveredOrganizations.length
        : 0;
      if (manufacturer?.connectionType === 'local-folder') {
        this.dom.organizationSourceSummary.textContent = `${this.sourceSummary(manufacturer)} | ${discoveredCount} org${discoveredCount === 1 ? '' : 's'}`;
      } else {
        this.dom.organizationSourceSummary.textContent = this.sourceSummary(manufacturer);
      }
    }
    if (this.dom.productsSourceSummary) {
      const discoveredCount = Array.isArray(productsRoot?.discoveredCollections)
        ? productsRoot.discoveredCollections.length
        : 0;
      if (productsRoot?.connectionType === 'local-folder') {
        this.dom.productsSourceSummary.textContent = `${this.sourceSummary(productsRoot)} | ${discoveredCount} product${discoveredCount === 1 ? '' : 's'}`;
      } else {
        this.dom.productsSourceSummary.textContent = this.sourceSummary(productsRoot);
      }
    }
    if (this.dom.materialsSourceSummary) {
      if (materialsRoot?.connectionType === 'local-folder') {
        this.dom.materialsSourceSummary.textContent = `${this.sourceSummary(materialsRoot)} | ${materials.length} material collection${materials.length === 1 ? '' : 's'}`;
      } else if (materials.length === 0) {
        this.dom.materialsSourceSummary.textContent = 'Missing';
      } else {
        this.dom.materialsSourceSummary.textContent = `${materials.length} connected source${materials.length === 1 ? '' : 's'}`;
      }
    }
    if (this.dom.materialsSourceDetail) {
      this.dom.materialsSourceDetail.textContent = materials
        .slice(0, 3)
        .map((entry) => entry.fileName || entry.label || entry.sourceId)
        .filter(Boolean)
        .join(' | ');
    }
    if (this.dom.packagesSourceSummary) {
      this.dom.packagesSourceSummary.textContent = this.sourceSummary(packages);
    }

    if (this.dom.setOrganizationSourceBtn) {
      this.dom.setOrganizationSourceBtn.textContent = manufacturer ? 'Replace source' : 'Set source';
    }
    if (this.dom.setProductsSourceBtn) {
      this.dom.setProductsSourceBtn.textContent = productsRoot ? 'Replace source' : 'Set source';
    }
    if (this.dom.setMaterialsSourceBtn) {
      this.dom.setMaterialsSourceBtn.textContent = materialsRoot ? 'Replace source' : 'Set source';
    }
    if (this.dom.setPackagesSourceBtn) {
      this.dom.setPackagesSourceBtn.textContent = packages ? 'Replace source' : 'Set source';
    }
  }

  openSourcesDialog() {
    if (!this.dom.sourcesDialog) {
      return;
    }
    this.renderSourcesDialog();
    if (!this.dom.sourcesDialog.open) {
      this.dom.sourcesDialog.showModal();
    }
  }

  closeDialog(dialogId) {
    const dialog = this.dom?.[dialogId] || this.shadowRoot.getElementById(dialogId);
    if (dialog?.open) {
      dialog.close();
    }
  }

  openNewCollectionDialog(workspace) {
    if (!this.dom.newCollectionDialog || !this.dom.newCollectionDialogTitle) {
      return;
    }
    this.state.pendingNewCollectionWorkspace = workspace === 'materials' ? 'materials' : 'products';
    this.state.pendingNewCollectionName = '';
    this.dom.newCollectionDialogTitle.textContent = this.state.pendingNewCollectionWorkspace === 'materials'
      ? 'New material collection'
      : 'New product collection';
    if (this.dom.newCollectionNameInput) {
      this.dom.newCollectionNameInput.value = '';
    }
    this.syncNewCollectionDialogControls();
    if (!this.dom.newCollectionDialog.open) {
      this.dom.newCollectionDialog.showModal();
    }
    setTimeout(() => {
      this.dom.newCollectionNameInput?.focus();
    }, 0);
  }

  syncNewCollectionDialogControls() {
    if (!this.dom.confirmNewCollectionBtn) {
      return;
    }
    const name = String(this.state.pendingNewCollectionName || '').trim();
    this.dom.confirmNewCollectionBtn.disabled = name.length === 0;
  }

  confirmNewCollectionFromDialog() {
    const workspace = this.state.pendingNewCollectionWorkspace;
    const name = String(this.state.pendingNewCollectionName || '').trim();
    if ((workspace !== 'products' && workspace !== 'materials') || !name) {
      this.syncNewCollectionDialogControls();
      return;
    }
    this.closeDialog('newCollectionDialog');
    this.createNewCollection(workspace, name);
    this.state.pendingNewCollectionWorkspace = null;
    this.state.pendingNewCollectionName = '';
  }

  minimalDiscoveredOrganizations(list) {
    return (Array.isArray(list) ? list : []).map((entry) => ({
      id: String(entry?.id || '').trim(),
      label: String(entry?.label || '').trim(),
      folderName: String(entry?.folderName || '').trim(),
      infoFileName: String(entry?.infoFileName || '').trim(),
    })).filter((entry) => entry.id);
  }

  minimalDiscoveredCollections(list) {
    return (Array.isArray(list) ? list : []).map((entry) => ({
      sourceId: String(entry?.sourceId || '').trim(),
      id: String(entry?.id || '').trim(),
      title: String(entry?.title || '').trim(),
      label: String(entry?.label || '').trim(),
      role: String(entry?.role || '').trim(),
      ownerOrgId: String(entry?.ownerOrgId || '').trim(),
      ownerOrgName: String(entry?.ownerOrgName || '').trim(),
      collectionId: String(entry?.collectionId || '').trim(),
      connectionType: String(entry?.connectionType || '').trim(),
      fileName: String(entry?.fileName || '').trim(),
      sourcePath: String(entry?.sourcePath || '').trim(),
      isLinkedExternal: Boolean(entry?.isLinkedExternal),
      isDirty: Boolean(entry?.isDirty),
      orgDirectoryName: String(entry?.orgDirectoryName || '').trim(),
      productDirectoryName: String(entry?.productDirectoryName || '').trim(),
      collectionDirectoryName: String(entry?.collectionDirectoryName || '').trim(),
    })).filter((entry) => entry.sourceId || entry.id);
  }

  serializeSourceForPersistence(source) {
    if (!source || typeof source !== 'object') {
      return null;
    }
    return {
      role: source.role || '',
      sourceId: source.sourceId || '',
      label: source.label || '',
      ownerOrgId: source.ownerOrgId || '',
      ownerOrgName: source.ownerOrgName || '',
      collectionId: source.collectionId || '',
      connectionType: source.connectionType || '',
      fileHandle: source.fileHandle || null,
      folderHandle: source.folderHandle || null,
      fileName: source.fileName || '',
      sourcePath: source.sourcePath || '',
      selectedOrganizationId: source.selectedOrganizationId || '',
      discoveredOrganizations: this.minimalDiscoveredOrganizations(source.discoveredOrganizations),
      discoveredCollections: this.minimalDiscoveredCollections(source.discoveredCollections),
      resolvedOrgDirectoryName: source.resolvedOrgDirectoryName || '',
      isLinkedExternal: Boolean(source.isLinkedExternal),
      isDirty: Boolean(source.isDirty),
      isConnected: source.isConnected !== false,
      needsReconnect: Boolean(source.needsReconnect),
      restoreError: source.restoreError || '',
    };
  }

  inflateSourceFromPersistence(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    return createSourceDescriptor({
      ...raw,
      fileHandle: revivePlatformHandle(raw.fileHandle),
      folderHandle: revivePlatformHandle(raw.folderHandle),
      data: null,
      validation: createEmptyValidation(),
    });
  }

  buildWorkspaceSnapshot() {
    return {
      version: 1,
      savedAt: Date.now(),
      currentOrganizationId: this.currentOrganizationId() || '',
      activeWorkspace: this.state.activeWorkspace || 'general',
      activeProductSourceId: this.state.workspace.activeProductSourceId || '',
      activeMaterialSourceId: this.state.workspace.activeMaterialSourceId || '',
      organizations: Array.isArray(this.state.organizations) ? this.state.organizations : [],
      sources: {
        organization: this.serializeSourceForPersistence(this.manufacturerSource()),
        products: this.serializeSourceForPersistence(this.productSource()),
        materialsRoot: this.serializeSourceForPersistence(this.materialRootSource()),
        materials: this.materialSources().map((entry) => this.serializeSourceForPersistence(entry)).filter(Boolean),
        packages: this.serializeSourceForPersistence(this.packagesSource()),
      },
    };
  }

  async persistWorkspaceState() {
    try {
      const snapshot = this.buildWorkspaceSnapshot();
      await saveWorkspaceSnapshot(snapshot);
    } catch (_error) {
      // Best-effort persistence only.
    }
  }

  scheduleWorkspacePersistence() {
    if (this.isRestoringWorkspace) {
      return;
    }
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
    }
    this.persistenceTimer = setTimeout(() => {
      this.persistenceTimer = null;
      this.persistWorkspaceState().catch(() => {});
    }, 220);
  }

  async hasHandleReadPermission(handle) {
    if (!handle) {
      return false;
    }
    if (typeof handle.queryPermission !== 'function') {
      return true;
    }
    try {
      const status = await handle.queryPermission({ mode: 'read' });
      return status === 'granted';
    } catch (_error) {
      return false;
    }
  }

  markSourceReconnect(source, message) {
    if (!source || typeof source !== 'object') {
      return;
    }
    source.isConnected = false;
    source.needsReconnect = true;
    source.restoreError = String(message || '').trim();
  }

  clearSourceReconnect(source) {
    if (!source || typeof source !== 'object') {
      return;
    }
    source.isConnected = true;
    source.needsReconnect = false;
    source.restoreError = '';
  }

  async restorePersistedWorkspaceState() {
    try {
      const snapshot = await loadWorkspaceSnapshot();
      if (!snapshot || typeof snapshot !== 'object') {
        return;
      }

      const workspaceId = String(snapshot.activeWorkspace || '').trim();
      if (WORKSPACES.has(workspaceId)) {
        this.state.activeWorkspace = workspaceId;
      }
      this.state.workspace.currentOrganizationId = String(snapshot.currentOrganizationId || '').trim() || this.state.workspace.currentOrganizationId;
      this.state.workspace.activeProductSourceId = String(snapshot.activeProductSourceId || '').trim() || null;
      this.state.workspace.activeMaterialSourceId = String(snapshot.activeMaterialSourceId || '').trim() || null;

      if (Array.isArray(snapshot.organizations) && snapshot.organizations.length > 0) {
        this.state.organizations = snapshot.organizations
          .map((entry) => ({
            id: String(entry?.id || '').trim(),
            label: String(entry?.label || '').trim() || String(entry?.id || '').trim(),
          }))
          .filter((entry) => entry.id);
      }

      const sources = snapshot.sources && typeof snapshot.sources === 'object' ? snapshot.sources : {};
      this.state.workspace.sources.manufacturer = this.inflateSourceFromPersistence(sources.organization);
      this.state.workspace.sources.products = this.inflateSourceFromPersistence(sources.products);
      this.state.workspace.sources.materialsRoot = this.inflateSourceFromPersistence(sources.materialsRoot);
      this.state.workspace.sources.packages = this.inflateSourceFromPersistence(sources.packages);
      this.state.workspace.sources.materials = Array.isArray(sources.materials)
        ? sources.materials.map((entry) => this.inflateSourceFromPersistence(entry)).filter(Boolean)
        : [];

      if (this.state.activeWorkspace === 'general') {
        this.state.currentLevel = 'general-sections';
      } else if (this.state.activeWorkspace === 'products') {
        this.state.currentLevel = 'products-collections';
      } else if (this.state.activeWorkspace === 'materials') {
        this.state.currentLevel = 'materials-collections';
      }

      await this.restoreSourceConnectionsAfterLoad();
    } catch (_error) {
      // Ignore restore failures and continue with clean runtime state.
    }
  }

  async restoreSourceConnectionsAfterLoad() {
    const manufacturer = this.manufacturerSource();
    if (manufacturer) {
      if (manufacturer.connectionType === 'local-folder') {
        const hasPermission = await this.hasHandleReadPermission(manufacturer.folderHandle);
        if (!hasPermission) {
          this.markSourceReconnect(manufacturer, 'Folder permission required.');
        } else {
          this.clearSourceReconnect(manufacturer);
          const discovery = await this.discoverOrganizationsFromRootFolder(manufacturer.folderHandle);
          manufacturer.discoveredOrganizations = discovery.organizations;
          if (discovery.organizations.length > 0) {
            this.state.organizations = discovery.organizations.map((entry) => ({ id: entry.id, label: entry.label }));
            if (!this.state.organizations.some((entry) => entry.id === this.currentOrganizationId())) {
              this.state.workspace.currentOrganizationId = this.state.organizations[0].id;
            }
            await this.loadOrganizationInfoForCurrentSelection();
          } else {
            this.state.organizations = [];
            manufacturer.data = null;
          }
        }
      } else if (manufacturer.connectionType === 'local-file') {
        const hasPermission = await this.hasHandleReadPermission(manufacturer.fileHandle);
        if (!hasPermission) {
          this.markSourceReconnect(manufacturer, 'File permission required.');
        } else {
          try {
            const file = await manufacturer.fileHandle.getFile();
            const parsed = JSON.parse(await file.text());
            manufacturer.data = isPlainObject(parsed) ? parsed : null;
            manufacturer.validation = validateDataRoot('general', manufacturer.data);
            this.clearSourceReconnect(manufacturer);
          } catch (error) {
            this.markSourceReconnect(manufacturer, error.message);
          }
        }
      }
    }

    const productsRoot = this.productSource();
    if (productsRoot) {
      if (productsRoot.connectionType === 'local-folder') {
        const hasPermission = await this.hasHandleReadPermission(productsRoot.folderHandle);
        if (!hasPermission) {
          this.markSourceReconnect(productsRoot, 'Folder permission required.');
        } else {
          this.clearSourceReconnect(productsRoot);
          await this.resolveProductsSourceForCurrentOrganization();
        }
      } else if (productsRoot.connectionType === 'local-file') {
        const hasPermission = await this.hasHandleReadPermission(productsRoot.fileHandle);
        if (!hasPermission) {
          this.markSourceReconnect(productsRoot, 'File permission required.');
        } else {
          try {
            const file = await productsRoot.fileHandle.getFile();
            const parsed = JSON.parse(await file.text());
            productsRoot.data = isPlainObject(parsed) ? parsed : null;
            productsRoot.validation = validateDataRoot('products', productsRoot.data);
            this.clearSourceReconnect(productsRoot);
          } catch (error) {
            this.markSourceReconnect(productsRoot, error.message);
          }
        }
      }
    }

    const materialsRoot = this.materialRootSource();
    if (materialsRoot) {
      if (materialsRoot.connectionType === 'local-folder') {
        const hasPermission = await this.hasHandleReadPermission(materialsRoot.folderHandle);
        if (!hasPermission) {
          this.markSourceReconnect(materialsRoot, 'Folder permission required.');
        } else {
          this.clearSourceReconnect(materialsRoot);
          await this.resolveMaterialsSourceForCurrentOrganization();
        }
      }
    } else if (this.materialSources().length > 0) {
      const nextMaterials = [];
      for (const entry of this.materialSources()) {
        const hasPermission = await this.hasHandleReadPermission(entry.fileHandle);
        if (!hasPermission) {
          this.markSourceReconnect(entry, 'File permission required.');
          nextMaterials.push(entry);
          continue;
        }
        try {
          const file = await entry.fileHandle.getFile();
          const parsed = JSON.parse(await file.text());
          const next = {
            ...entry,
            data: isPlainObject(parsed) ? parsed : null,
            validation: validateDataRoot('materials', parsed),
          };
          this.clearSourceReconnect(next);
          nextMaterials.push(next);
        } catch (error) {
          this.markSourceReconnect(entry, error.message);
          nextMaterials.push(entry);
        }
      }
      this.state.workspace.sources.materials = nextMaterials;
    }

    const packages = this.packagesSource();
    if (packages) {
      const hasPermission = await this.hasHandleReadPermission(packages.fileHandle);
      if (!hasPermission) {
        this.markSourceReconnect(packages, 'File permission required.');
      } else if (packages.fileHandle) {
        try {
          const file = await packages.fileHandle.getFile();
          const parsed = JSON.parse(await file.text());
          packages.data = isPlainObject(parsed) ? parsed : null;
          this.clearSourceReconnect(packages);
        } catch (error) {
          this.markSourceReconnect(packages, error.message);
        }
      }
    }
  }

  setStatus(text) {
    const next = String(text || '').trim();
    if (next) {
      this.state.statusText = next;
      this.renderHeader();
    }
  }

  currentOrganizationId() {
    return this.state.workspace.currentOrganizationId;
  }

  productsOrgDirectoryName(orgId) {
    const normalized = String(orgId || '').trim();
    if (!normalized) {
      return '';
    }
    return normalized.endsWith('-blks') ? normalized : `${normalized}-blks`;
  }

  manufacturerSource() {
    return this.state.workspace.sources.manufacturer;
  }

  productSource() {
    return this.state.workspace.sources.products;
  }

  productSources() {
    const source = this.productSource();
    if (!source) {
      return [];
    }
    if (source.connectionType === 'local-folder') {
      return Array.isArray(source.discoveredCollections) ? source.discoveredCollections : [];
    }
    return [source];
  }

  packagesSource() {
    return this.state.workspace.sources.packages || null;
  }

  materialRootSource() {
    return this.state.workspace.sources.materialsRoot || null;
  }

  materialSources() {
    return Array.isArray(this.state.workspace.sources.materials)
      ? this.state.workspace.sources.materials
      : [];
  }

  selectedProductSource() {
    const sources = this.productSources();
    if (sources.length === 0) {
      return null;
    }
    const activeId = this.state.workspace.activeProductSourceId;
    if (!activeId) {
      return sources[0];
    }
    return sources.find((entry) => entry.sourceId === activeId || entry.id === activeId) || sources[0];
  }

  selectedMaterialSource() {
    const sources = this.materialSources();
    const activeId = this.state.workspace.activeMaterialSourceId;
    if (!activeId) {
      return sources[0] || null;
    }
    return sources.find((entry) => entry.sourceId === activeId || entry.id === activeId) || sources[0] || null;
  }

  workspaceGeneratedPackage() {
    return this.state.workspace.generatedPackageData;
  }

  workspaceExportWarnings() {
    return Array.isArray(this.state.workspace.exportWarnings)
      ? this.state.workspace.exportWarnings
      : [];
  }

  currentWorkspaceCollections() {
    if (this.state.activeWorkspace === 'products') {
      return this.productSources();
    }
    if (this.state.activeWorkspace === 'materials') {
      return this.materialSources();
    }
    return [];
  }

  selectedCollection() {
    if (this.state.activeWorkspace === 'products') {
      return this.selectedProductSource();
    }
    if (this.state.activeWorkspace === 'materials') {
      return this.selectedMaterialSource();
    }
    return null;
  }

  currentWorkspaceOrder() {
    if (this.state.activeWorkspace === 'products') {
      return PRODUCT_SECTION_ORDER;
    }
    if (this.state.activeWorkspace === 'materials') {
      return MATERIAL_SECTION_ORDER;
    }
    return GENERAL_SECTION_ORDER;
  }

  sectionListForData(data, validation = createEmptyValidation()) {
    if (!isPlainObject(data)) {
      return [];
    }

    const order = this.currentWorkspaceOrder();
    const orderMap = new Map(order.map((key, index) => [normalizeKey(key), index]));
    const keys = Object.keys(data).filter((key) => isEditableSection(data[key]));
    keys.sort((a, b) => {
      const ai = orderMap.has(normalizeKey(a)) ? orderMap.get(normalizeKey(a)) : Number.MAX_SAFE_INTEGER;
      const bi = orderMap.has(normalizeKey(b)) ? orderMap.get(normalizeKey(b)) : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) {
        return ai - bi;
      }
      return a.localeCompare(b);
    });

    const sections = keys.map((key) => {
      const value = data[key];
      return {
        id: key,
        title: friendlySectionLabel(key),
        type: Array.isArray(value) ? 'array' : 'object',
        count: Array.isArray(value) ? value.length : Object.keys(value || {}).length,
        warningCount: validation.sections?.[key]?.warningCount || 0,
      };
    });

    if (this.state.activeWorkspace === 'products') {
      sections.push({
        id: '__export__',
        title: 'Export / Package',
        type: 'export',
        count: null,
        warningCount: this.workspaceExportWarnings().length,
      });
    }

    return sections;
  }

  currentEntryContext() {
    if (this.state.currentLevel === 'general-entries') {
      return {
        ownerType: 'manufacturer',
        owner: this.manufacturerSource(),
        sectionId: this.state.activeSectionId,
        workspace: 'general',
      };
    }

    if (this.state.currentLevel === 'products-entries') {
      const collection = this.selectedCollection();
      return {
        ownerType: 'collection',
        owner: collection,
        sectionId: this.state.activeSectionId,
        workspace: 'products',
      };
    }

    if (this.state.currentLevel === 'materials-entries') {
      const collection = this.selectedCollection();
      return {
        ownerType: 'collection',
        owner: collection,
        sectionId: this.state.activeSectionId,
        workspace: 'materials',
      };
    }

    return null;
  }

  currentSectionValue() {
    const context = this.currentEntryContext();
    if (!context || !context.owner || !isPlainObject(context.owner.data)) {
      return null;
    }
    return context.owner.data[context.sectionId];
  }

  currentSectionValidation() {
    const context = this.currentEntryContext();
    if (!context || !context.owner) {
      return null;
    }
    return context.owner.validation?.sections?.[context.sectionId] || null;
  }

  currentViewModeKey() {
    if (this.state.currentLevel === 'products-collections') {
      return 'products-collections';
    }
    if (this.state.currentLevel === 'materials-collections') {
      return 'materials-collections';
    }
    if (this.state.currentLevel === 'products-entries') {
      return `products-entries:${this.state.activeSectionId || 'section'}`;
    }
    if (this.state.currentLevel === 'materials-entries') {
      return `materials-entries:${this.state.activeSectionId || 'section'}`;
    }
    return `${this.state.currentLevel}`;
  }

  currentViewMode() {
    const key = this.currentViewModeKey();
    const fromState = this.state.viewModes[key];
    if (fromState === 'cards' || fromState === 'rows') {
      return fromState;
    }
    return DEFAULT_CARD_SECTIONS.has(key) ? 'cards' : 'rows';
  }

  inspectorVisible() {
    return this.state.currentLevel === 'general-sections'
      || this.state.currentLevel === 'products-sections'
      || this.state.currentLevel === 'materials-sections'
      || this.state.currentLevel === 'general-entries'
      || this.state.currentLevel === 'products-entries'
      || this.state.currentLevel === 'materials-entries';
  }

  generalMetadataKeys(data) {
    if (!isPlainObject(data)) {
      return [];
    }
    const keys = Object.keys(data).filter((key) => isScalarValue(data[key]));
    keys.sort((a, b) => {
      const ai = GENERAL_METADATA_PRIORITY.indexOf(a);
      const bi = GENERAL_METADATA_PRIORITY.indexOf(b);
      const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.localeCompare(b);
    });
    return keys;
  }

  generalMetadataDraft() {
    const source = this.manufacturerSource();
    const data = isPlainObject(source?.data) ? source.data : {};
    const keys = this.generalMetadataKeys(data);
    const draft = {};
    for (const key of keys) {
      draft[key] = data[key];
    }
    return draft;
  }

  metadataDraftForSource(source) {
    const data = isPlainObject(source?.data) ? source.data : {};
    const keys = this.generalMetadataKeys(data);
    const draft = {};
    for (const key of keys) {
      draft[key] = data[key];
    }
    return draft;
  }

  switchWorkspace(workspace) {
    if (!WORKSPACES.has(workspace)) {
      return;
    }

    this.state.activeWorkspace = workspace;
    this.state.activeSectionId = null;
    this.state.selectedEntryRef = null;

    if (workspace === 'general') {
      this.state.currentLevel = 'general-sections';
    }
    if (workspace === 'products') {
      this.state.currentLevel = 'products-collections';
    }
    if (workspace === 'materials') {
      this.state.currentLevel = 'materials-collections';
    }

    this.refreshAll();
  }

  navigateBack() {
    if (this.state.currentLevel === 'general-entries') {
      this.state.currentLevel = 'general-sections';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
    } else if (this.state.currentLevel === 'products-sections') {
      this.state.currentLevel = 'products-collections';
      this.state.selectedEntryRef = null;
    } else if (this.state.currentLevel === 'products-entries' || this.state.currentLevel === 'products-export') {
      this.state.currentLevel = 'products-sections';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
    } else if (this.state.currentLevel === 'materials-sections') {
      this.state.currentLevel = 'materials-collections';
      this.state.selectedEntryRef = null;
    } else if (this.state.currentLevel === 'materials-entries') {
      this.state.currentLevel = 'materials-sections';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
    }

    this.refreshAll();
  }
  recomputeDerivedState() {
    const manufacturer = this.manufacturerSource();
    if (manufacturer) {
      manufacturer.validation = validateDataRoot('general', manufacturer.data);
      manufacturer.isLoaded = isPlainObject(manufacturer.data);
      manufacturer.dirty = Boolean(manufacturer.isDirty);
    }

    this.syncOrganizationsFromSource();

    const products = this.productSource();
    if (products) {
      if (products.connectionType === 'local-folder') {
        const discovered = Array.isArray(products.discoveredCollections) ? products.discoveredCollections : [];
        products.discoveredCollections = discovered.map((entry) => {
          const next = {
            ...entry,
            validation: validateDataRoot('products', entry.data),
            isLoaded: isPlainObject(entry.data),
          };
          next.dirty = Boolean(next.isDirty);
          return next;
        });
        products.validation = createEmptyValidation();
        products.isLoaded = true;
      } else {
        products.validation = validateDataRoot('products', products.data);
        products.isLoaded = isPlainObject(products.data);
      }
      products.dirty = Boolean(products.isDirty);
    }

    this.state.workspace.sources.materials = this.materialSources().map((source) => {
      const next = {
        ...source,
        validation: validateDataRoot('materials', source.data),
        isLoaded: isPlainObject(source.data),
      };
      next.dirty = Boolean(next.isDirty);
      return next;
    });
    if (this.materialRootSource()?.connectionType === 'local-folder') {
      this.state.workspace.sources.materialsRoot.discoveredCollections = this.state.workspace.sources.materials;
    }

    this.rebuildRelationOptions();
    this.refreshExportSnapshot();
    this.normalizeSelection();
  }

  rebuildRelationOptions() {
    let options = {};
    options = mergeRelationOptions(options, buildRelationOptionsFromData(this.manufacturerSource()?.data));

    for (const source of this.productSources()) {
      options = mergeRelationOptions(options, buildRelationOptionsFromData(source.data));
    }
    for (const source of this.materialSources()) {
      options = mergeRelationOptions(options, buildRelationOptionsFromData(source.data));
    }

    this.state.relationOptions = options;
  }

  refreshExportSnapshot() {
    const selectedProduct = this.selectedProductSource();
    const warnings = [];
    if (!selectedProduct) {
      warnings.push('No connected products source.');
      this.state.workspace.generatedPackageData = {};
      this.state.workspace.exportWarnings = warnings;
      return;
    }

    const base = cloneJson(selectedProduct.data || {});
    const manufacturer = this.manufacturerSource();
    const withOrg = isPlainObject(manufacturer?.data) ? mergeAdditive(base, manufacturer.data) : base;
    let merged = withOrg;

    const materialSources = this.materialSources();
    if (materialSources.length === 0) {
      warnings.push('No material collections loaded.');
    }

    for (const source of materialSources) {
      merged = mergeAdditive(merged, source.data || {});
    }

    const arrayValidation = validateArraySections(merged);
    for (const [sectionId, sectionValidation] of Object.entries(arrayValidation)) {
      if (sectionValidation.missingIds.length > 0) {
        warnings.push(`${friendlySectionLabel(sectionId)} has entries missing id.`);
      }
      if (sectionValidation.duplicateIds.length > 0) {
        warnings.push(`${friendlySectionLabel(sectionId)} has duplicate ids: ${sectionValidation.duplicateIds.join(', ')}`);
      }
    }

    const idSets = buildIdSets(merged);
    const relationWarnings = [];
    for (const [sectionId, sectionValue] of Object.entries(merged)) {
      if (!Array.isArray(sectionValue)) {
        continue;
      }
      sectionValue.forEach((entry, index) => {
        if (!isPlainObject(entry)) {
          return;
        }
        for (const [fieldName, targetSection] of Object.entries(RELATION_FIELD_TARGETS)) {
          if (!(fieldName in entry)) {
            continue;
          }
          const targetIds = idSets.get(targetSection);
          if (!targetIds || targetIds.size === 0) {
            continue;
          }
          const value = entry[fieldName];
          if (Array.isArray(value)) {
            for (const item of value) {
              const id = String(item || '').trim();
              if (id && !targetIds.has(id)) {
                relationWarnings.push(`${sectionId}[${index}] ${fieldName} -> missing ${targetSection}:${id}`);
              }
            }
          } else {
            const id = String(value || '').trim();
            if (id && !targetIds.has(id)) {
              relationWarnings.push(`${sectionId}[${index}] ${fieldName} -> missing ${targetSection}:${id}`);
            }
          }
        }
      });
    }

    this.state.workspace.generatedPackageData = merged;
    this.state.workspace.exportWarnings = [...warnings, ...Array.from(new Set(relationWarnings)).slice(0, 120)];
  }

  normalizeSelection() {
    if (this.state.currentLevel.startsWith('products-')) {
      const products = this.productSources();
      const activeProductSourceId = this.state.workspace.activeProductSourceId;
      const exists = products.some((entry) => entry.sourceId === activeProductSourceId || entry.id === activeProductSourceId);
      if (!exists) {
        this.state.workspace.activeProductSourceId = products[0]?.sourceId || products[0]?.id || null;
      }
      if (!this.state.workspace.activeProductSourceId && this.state.currentLevel !== 'products-collections') {
        this.state.currentLevel = 'products-collections';
      }
    }

    if (this.state.currentLevel.startsWith('materials-')) {
      const materials = this.materialSources();
      const activeMaterialSourceId = this.state.workspace.activeMaterialSourceId;
      const exists = materials.some((entry) => entry.sourceId === activeMaterialSourceId || entry.id === activeMaterialSourceId);
      if (!exists) {
        this.state.workspace.activeMaterialSourceId = materials[0]?.sourceId || materials[0]?.id || null;
      }
      if (!this.state.workspace.activeMaterialSourceId && this.state.currentLevel !== 'materials-collections') {
        this.state.currentLevel = 'materials-collections';
      }
    }

    const list = this.currentListEntries();

    if (this.state.currentLevel.endsWith('sections') || this.state.currentLevel.endsWith('collections')) {
      if (list.length === 0) {
        this.state.selectedEntryRef = null;
        return;
      }
      const index = Number(this.state.selectedEntryRef?.index);
      if (!Number.isInteger(index) || index < 0 || index >= list.length) {
        this.state.selectedEntryRef = { index: 0 };
      }
      const resolvedIndex = Number(this.state.selectedEntryRef?.index);
      if (this.state.currentLevel === 'products-collections' && Number.isInteger(resolvedIndex) && list[resolvedIndex]) {
        this.state.workspace.activeProductSourceId = list[resolvedIndex].sourceId || list[resolvedIndex].id;
      }
      if (this.state.currentLevel === 'materials-collections' && Number.isInteger(resolvedIndex) && list[resolvedIndex]) {
        this.state.workspace.activeMaterialSourceId = list[resolvedIndex].sourceId || list[resolvedIndex].id;
      }
      return;
    }

    const context = this.currentEntryContext();
    if (!context) {
      this.state.selectedEntryRef = null;
      return;
    }

    const value = this.currentSectionValue();
    if (Array.isArray(value)) {
      if (value.length === 0) {
        this.state.selectedEntryRef = null;
        return;
      }
      const index = Number(this.state.selectedEntryRef?.index);
      if (!Number.isInteger(index) || index < 0 || index >= value.length) {
        this.state.selectedEntryRef = { index: 0 };
      }
      return;
    }

    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        this.state.selectedEntryRef = { scope: 'section' };
        return;
      }
      const key = this.state.selectedEntryRef?.key;
      if (!key || !keys.includes(key)) {
        this.state.selectedEntryRef = { key: keys[0] };
      }
      return;
    }

    this.state.selectedEntryRef = null;
  }

  currentListEntries() {
    if (this.state.currentLevel === 'products-collections') {
      return this.productSources();
    }
    if (this.state.currentLevel === 'materials-collections') {
      return this.materialSources();
    }
    if (this.state.currentLevel === 'products-sections' || this.state.currentLevel === 'materials-sections' || this.state.currentLevel === 'general-sections') {
      return this.sectionEntriesForCurrentLevel();
    }
    return [];
  }

  sectionEntriesForCurrentLevel() {
    if (this.state.currentLevel === 'general-sections') {
      const manufacturer = this.manufacturerSource();
      return this.sectionListForData(manufacturer?.data, manufacturer?.validation);
    }

    const collection = this.selectedCollection();
    if (!collection) {
      return [];
    }
    return this.sectionListForData(collection.data, collection.validation);
  }

  contextActions() {
    if (this.state.currentLevel === 'general-sections') {
      return [
        { id: 'open-manufacturer', label: 'Open' },
        { id: 'save-manufacturer', label: 'Save', variant: 'primary', disabled: !this.manufacturerSource()?.data },
      ];
    }

    if (this.state.currentLevel === 'general-entries') {
      return [
        { id: 'save-manufacturer', label: 'Save', variant: 'primary', disabled: !this.manufacturerSource()?.data },
      ];
    }

    if (this.state.currentLevel === 'products-collections') {
      return [
        { id: 'new-product-collection', label: 'New' },
        { id: 'open-product-collection-file', label: 'Open' },
        { id: 'save-product-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'products-sections') {
      return [
        { id: 'new-product-collection', label: 'New' },
        { id: 'open-product-collection-file', label: 'Open' },
        { id: 'save-product-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'products-entries') {
      return [
        { id: 'save-product-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'products-export') {
      return [
        { id: 'generate-export', label: 'Generate Export', variant: 'primary' },
        { id: 'download-export', label: 'Download Export', disabled: !isPlainObject(this.workspaceGeneratedPackage()) || Object.keys(this.workspaceGeneratedPackage()).length === 0 },
      ];
    }

    if (this.state.currentLevel === 'materials-collections') {
      return [
        { id: 'new-material-collection', label: 'New' },
        { id: 'open-material-collection-file', label: 'Open' },
        { id: 'save-material-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'materials-sections') {
      return [
        { id: 'new-material-collection', label: 'New' },
        { id: 'open-material-collection-file', label: 'Open' },
        { id: 'save-material-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'materials-entries') {
      return [
        { id: 'save-material-collection', label: 'Save', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    return [];
  }

  sourceMetaText(source) {
    if (!source) {
      return 'No source connected';
    }
    const parts = [];
    parts.push(sourceDescriptorLabel(source));
    if (source.isDirty) {
      parts.push('Unsaved');
    }
    if (source.needsReconnect) {
      parts.push('Reconnect needed');
    }
    return parts.join(' | ');
  }

  browserModel() {
    const model = {
      section: { id: 'overview', label: 'Workspace', kind: 'overview' },
      sectionValue: null,
      selectedEntryRef: this.state.selectedEntryRef,
      arrayPresentation: 'data',
      showBack: this.state.currentLevel !== 'general-sections' && this.state.currentLevel !== 'products-collections' && this.state.currentLevel !== 'materials-collections',
      showViewToggle: true,
      contextActions: this.contextActions(),
      overviewStats: [],
      overviewWarnings: [],
      exportPayload: null,
      viewMode: this.currentViewMode(),
      sectionValidation: null,
      arrayActions: this.arrayActionState(),
      sourceMeta: '',
    };

    if (this.state.currentLevel === 'general-sections') {
      const manufacturer = this.manufacturerSource();
      model.section = { id: 'general-sections', label: 'General Sections', kind: 'array' };
      model.sectionValue = this.sectionEntriesForCurrentLevel();
      model.showViewToggle = false;
      model.arrayPresentation = 'section-nav';
      model.overviewWarnings = manufacturer?.validation?.overviewWarnings || [];
      model.sourceMeta = this.sourceMetaText(manufacturer);
      return model;
    }

    if (this.state.currentLevel === 'products-collections') {
      model.section = { id: 'products-collections', label: 'Product Collections', kind: 'array' };
      const sources = this.productSources();
      model.sectionValue = sources.map((source) => ({
        sourceId: source.sourceId,
        id: source.id,
        title: source.title,
        type: source.connectionType || source.sourceType || 'source',
        count: Object.keys(source.data || {}).filter((key) => isEditableSection(source.data?.[key])).length,
        warningCount: Number(source.validation?.overviewWarnings?.length || 0),
        metaText: [
          source.fileName || '',
          source.isLinkedExternal ? 'linked' : 'local',
          source.isDirty ? 'unsaved' : '',
        ].filter(Boolean).join(' | '),
        owner: source.ownerOrganizationId || source.ownerOrgId,
        sourceType: source.sourceType || source.connectionType,
        sourceLabel: source.label,
        fileName: source.fileName,
        connectionType: source.connectionType,
        isLinkedExternal: source.isLinkedExternal,
        isDirty: Boolean(source.isDirty),
      }));
      model.showViewToggle = false;
      model.arrayPresentation = 'section-nav';
      const productsRoot = this.productSource();
      if (productsRoot) {
        model.sourceMeta = this.sourceMetaText(productsRoot);
      }
      return model;
    }

    if (this.state.currentLevel === 'materials-collections') {
      model.section = { id: 'materials-collections', label: 'Material Collections', kind: 'array' };
      const sources = this.materialSources();
      model.sectionValue = sources.map((source) => ({
        sourceId: source.sourceId,
        id: source.id,
        title: source.title,
        type: source.connectionType || source.sourceType || 'source',
        count: Object.keys(source.data || {}).filter((key) => isEditableSection(source.data?.[key])).length,
        warningCount: Number(source.validation?.overviewWarnings?.length || 0),
        metaText: [
          source.fileName || '',
          source.isLinkedExternal ? 'linked' : 'local',
          source.isDirty ? 'unsaved' : '',
        ].filter(Boolean).join(' | '),
        owner: source.ownerOrganizationId || source.ownerOrgId,
        sourceType: source.sourceType || source.connectionType,
        sourceLabel: source.label,
        fileName: source.fileName,
        connectionType: source.connectionType,
        isLinkedExternal: source.isLinkedExternal,
        isDirty: Boolean(source.isDirty),
      }));
      model.showViewToggle = false;
      model.arrayPresentation = 'section-nav';
      if (sources.length > 0) {
        model.sourceMeta = `${sources.length} connected material source${sources.length === 1 ? '' : 's'}`;
      }
      return model;
    }

    if (this.state.currentLevel === 'products-sections' || this.state.currentLevel === 'materials-sections') {
      const collection = this.selectedCollection();
      const label = this.state.currentLevel === 'products-sections' ? 'Product Sections' : 'Material Sections';
      model.section = { id: 'collection-sections', label: collection?.title ? `${collection.title} ${label}` : label, kind: 'array' };
      model.sectionValue = this.sectionEntriesForCurrentLevel();
      model.showViewToggle = false;
      model.arrayPresentation = 'section-nav';
      model.sourceMeta = this.sourceMetaText(collection);
      return model;
    }

    if (this.state.currentLevel === 'products-export') {
      model.section = { id: 'export', label: 'Export / Package', kind: 'export' };
      model.showViewToggle = false;
      model.exportPayload = {
        warnings: this.workspaceExportWarnings(),
        summary: this.exportSummaryStats(),
        jsonText: JSON.stringify(this.workspaceGeneratedPackage() || {}, null, 2),
      };
      model.overviewWarnings = this.workspaceExportWarnings();
      model.sourceMeta = this.sourceMetaText(this.selectedProductSource());
      return model;
    }

    if (this.state.currentLevel === 'general-entries' || this.state.currentLevel === 'products-entries' || this.state.currentLevel === 'materials-entries') {
      const context = this.currentEntryContext();
      const value = this.currentSectionValue();
      const kind = Array.isArray(value) ? 'array' : (isPlainObject(value) ? 'object' : 'overview');
      model.section = {
        id: this.state.activeSectionId || 'section',
        label: friendlySectionLabel(this.state.activeSectionId || 'Section'),
        kind,
      };
      model.sectionValue = value;
      model.sectionValidation = this.currentSectionValidation();
      model.showViewToggle = kind === 'array';
      model.overviewWarnings = [];
      model.sourceMeta = this.sourceMetaText(context?.owner);
      return model;
    }

    model.section = { id: 'overview', label: 'Workspace', kind: 'overview' };
    model.overviewStats = [];
    model.showViewToggle = false;
    return model;
  }

  exportSummaryStats() {
    const generated = this.workspaceGeneratedPackage();
    if (!isPlainObject(generated)) {
      return [];
    }
    const stats = [];
    for (const [key, value] of Object.entries(generated)) {
      if (Array.isArray(value)) {
        stats.push({ label: friendlySectionLabel(key), count: value.length });
      }
    }
    return stats.slice(0, 12);
  }

  arrayActionState() {
    const isEntryLevel = this.state.currentLevel === 'general-entries' || this.state.currentLevel === 'products-entries' || this.state.currentLevel === 'materials-entries';
    if (!isEntryLevel) {
      return {
        canAdd: false,
        canDuplicate: false,
        canDelete: false,
        canMoveUp: false,
        canMoveDown: false,
      };
    }

    const value = this.currentSectionValue();
    if (!Array.isArray(value)) {
      return {
        canAdd: false,
        canDuplicate: false,
        canDelete: false,
        canMoveUp: false,
        canMoveDown: false,
      };
    }

    const index = Number(this.state.selectedEntryRef?.index);
    const hasSelection = Number.isInteger(index) && index >= 0 && index < value.length;
    return {
      canAdd: true,
      canDuplicate: hasSelection,
      canDelete: hasSelection,
      canMoveUp: hasSelection && index > 0,
      canMoveDown: hasSelection && index < value.length - 1,
    };
  }

  renderHeader() {
    this.dom.header.setState({
      activeWorkspace: this.state.activeWorkspace,
      organizations: this.state.organizations,
      currentOrganizationId: this.currentOrganizationId(),
      statusText: this.state.statusText,
    });
  }

  renderBrowser() {
    this.dom.sectionBrowser.update(this.browserModel());
  }

  renderInspector() {
    this.syncInspectorPlacement();

    if (this.state.currentLevel === 'general-sections') {
      this.dom.inspector.setData({
        section: {
          id: '__general_metadata',
          label: 'Organization metadata',
          kind: 'object',
        },
        entryRef: { scope: 'section' },
        entryValue: this.generalMetadataDraft(),
        relationOptions: this.state.relationOptions,
        relationFieldTargets: RELATION_FIELD_TARGETS,
        entryWarnings: [],
      });
      return;
    }

    if (this.state.currentLevel === 'products-sections') {
      const source = this.selectedProductSource();
      this.dom.inspector.setData({
        section: {
          id: '__products_metadata',
          label: 'Collection metadata',
          kind: 'object',
        },
        entryRef: { scope: 'section' },
        entryValue: this.metadataDraftForSource(source),
        relationOptions: this.state.relationOptions,
        relationFieldTargets: RELATION_FIELD_TARGETS,
        entryWarnings: [],
      });
      return;
    }

    if (this.state.currentLevel === 'materials-sections') {
      const source = this.selectedMaterialSource();
      this.dom.inspector.setData({
        section: {
          id: '__materials_metadata',
          label: 'Collection metadata',
          kind: 'object',
        },
        entryRef: { scope: 'section' },
        entryValue: this.metadataDraftForSource(source),
        relationOptions: this.state.relationOptions,
        relationFieldTargets: RELATION_FIELD_TARGETS,
        entryWarnings: [],
      });
      return;
    }

    if (!this.inspectorVisible()) {
      this.dom.inspector.setData({
        section: null,
        entryRef: null,
        entryValue: undefined,
        relationOptions: this.state.relationOptions,
        relationFieldTargets: RELATION_FIELD_TARGETS,
        entryWarnings: [],
      });
      return;
    }

    const context = this.currentEntryContext();
    const section = {
      id: this.state.activeSectionId,
      label: friendlySectionLabel(this.state.activeSectionId),
      kind: Array.isArray(this.currentSectionValue()) ? 'array' : 'object',
    };

    const entryWarnings = (() => {
      if (!context?.owner?.validation || !Array.isArray(this.currentSectionValue())) {
        return [];
      }
      const index = Number(this.state.selectedEntryRef?.index);
      const map = context.owner.validation.sections?.[this.state.activeSectionId]?.entryWarnings || {};
      return Array.isArray(map[index]) ? map[index] : [];
    })();

    this.dom.inspector.setData({
      section,
      entryRef: this.state.selectedEntryRef,
      entryValue: this.selectedEntryValue(),
      relationOptions: this.state.relationOptions,
      relationFieldTargets: RELATION_FIELD_TARGETS,
      entryWarnings,
    });
  }

  selectedEntryValue() {
    const context = this.currentEntryContext();
    if (!context || !context.owner || !isPlainObject(context.owner.data)) {
      return undefined;
    }
    const sectionValue = context.owner.data[context.sectionId];
    if (Array.isArray(sectionValue)) {
      const index = Number(this.state.selectedEntryRef?.index);
      return Number.isInteger(index) ? sectionValue[index] : undefined;
    }
    if (isPlainObject(sectionValue)) {
      if (this.state.selectedEntryRef?.scope === 'section') {
        return sectionValue;
      }
      const key = this.state.selectedEntryRef?.key;
      return typeof key === 'string' ? sectionValue[key] : undefined;
    }
    return undefined;
  }

  syncInspectorPlacement() {
    const placement = this.inspectorVisible() ? 'right' : 'hidden';
    this.dom.paneLayout.setAttribute('inspector-placement', placement);
  }

  refreshAll() {
    this.recomputeDerivedState();
    this.renderHeader();
    this.renderBrowser();
    this.renderInspector();
    this.scheduleWorkspacePersistence();
  }
  async handlePanelAction(actionId) {
    if (actionId === 'new-manufacturer') {
      this.createNewManufacturer();
      return;
    }
    if (actionId === 'open-manufacturer') {
      await this.openManufacturerFile();
      return;
    }
    if (actionId === 'save-manufacturer') {
      await this.saveManufacturer();
      return;
    }
    if (actionId === 'new-product-collection') {
      this.openNewCollectionDialog('products');
      return;
    }
    if (actionId === 'new-material-collection') {
      this.openNewCollectionDialog('materials');
      return;
    }
    if (actionId === 'open-product-collection-file') {
      if (this.productSource()?.connectionType === 'local-folder') {
        await this.resolveProductsSourceForCurrentOrganization();
        this.refreshAll();
      } else {
        await this.openCollectionFile('products');
      }
      return;
    }
    if (actionId === 'open-material-collection-file') {
      if (this.materialRootSource()?.connectionType === 'local-folder') {
        await this.resolveMaterialsSourceForCurrentOrganization();
        this.refreshAll();
      } else {
        await this.openCollectionFile('materials');
      }
      return;
    }
    if (actionId === 'save-product-collection') {
      await this.saveSelectedCollection('products');
      return;
    }
    if (actionId === 'save-material-collection') {
      await this.saveSelectedCollection('materials');
      return;
    }
    if (actionId === 'generate-export') {
      this.refreshExportSnapshot();
      const warnings = this.workspaceExportWarnings();
      this.setStatus(warnings.length > 0
        ? `Generated export with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`
        : 'Generated package export.');
      this.renderBrowser();
      return;
    }
    if (actionId === 'download-export') {
      await this.downloadGeneratedExport();
    }
  }

  async openSelectedCollection() {
    await this.openCollectionAtIndex(Number(this.state.selectedEntryRef?.index));
  }

  async openCollectionAtIndex(index) {
    const entries = this.currentListEntries();
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
      return;
    }
    const selected = entries[index];
    if (!selected) {
      return;
    }

    if (this.state.activeWorkspace === 'products') {
      this.state.workspace.activeProductSourceId = selected.sourceId || selected.id;
      await this.reloadProductCollectionFromIndex(selected.sourceId || selected.id);
      this.state.currentLevel = 'products-sections';
    } else if (this.state.activeWorkspace === 'materials') {
      this.state.workspace.activeMaterialSourceId = selected.sourceId || selected.id;
      await this.reloadMaterialCollectionFromSettings(selected.sourceId || selected.id);
      this.state.currentLevel = 'materials-sections';
    }

    this.state.selectedEntryRef = null;
    this.state.activeSectionId = null;
    this.refreshAll();
  }

  openSelectedSection() {
    this.openSectionAtIndex(Number(this.state.selectedEntryRef?.index));
  }

  openSectionAtIndex(index) {
    const entries = this.sectionEntriesForCurrentLevel();
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
      return;
    }

    const selected = entries[index];
    if (!selected) {
      return;
    }

    if (selected.id === '__export__' && this.state.activeWorkspace === 'products') {
      this.state.currentLevel = 'products-export';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
      this.refreshAll();
      return;
    }

    this.state.activeSectionId = selected.id;
    this.state.selectedEntryRef = null;
    if (this.state.currentLevel === 'general-sections') {
      this.state.currentLevel = 'general-entries';
    } else if (this.state.currentLevel === 'products-sections') {
      this.state.currentLevel = 'products-entries';
    } else if (this.state.currentLevel === 'materials-sections') {
      this.state.currentLevel = 'materials-entries';
    }

    this.refreshAll();
  }

  createNewManufacturer() {
    const manufacturer = createSourceDescriptor({
      role: 'manufacturer',
      label: 'Manufacturer source',
      ownerOrgId: this.currentOrganizationId(),
      connectionType: 'local-file',
      fileName: 'manufacturer_info.json',
      sourcePath: 'manufacturer_info.json',
      data: createManufacturerTemplate(),
      isLoaded: true,
      isDirty: true,
      validation: createEmptyValidation(),
    });
    manufacturer.dirty = true;
    this.state.workspace.sources.manufacturer = manufacturer;
    this.state.currentLevel = 'general-sections';
    this.state.activeSectionId = null;
    this.state.selectedEntryRef = null;
    this.setStatus('Created a new manufacturer source template.');
    this.refreshAll();
  }

  createNewCollection(workspace, name = '') {
    const resolvedName = String(name || '').trim() || `New ${workspace === 'products' ? 'product' : 'material'} collection`;
    const baseId = slugify(resolvedName, workspace === 'products' ? 'product-collection' : 'material-collection');
    const existingIds = new Set(this.currentWorkspaceCollections().map((entry) => String(entry.collectionId || entry.id || '').trim()).filter(Boolean));
    let uniqueId = baseId;
    let suffix = 2;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const template = createCollectionTemplate(workspace);
    template.id = uniqueId;
    template.title = resolvedName;
    if (!template.name) {
      template.name = resolvedName;
    }
    const collection = makeCollectionRecord(
      workspace,
      template,
      this.currentOrganizationId(),
      null,
      `${uniqueId}.json`,
    );
    collection.isDirty = true;
    collection.dirty = true;

    if (workspace === 'products') {
      const productsRoot = this.productSource();
      if (productsRoot?.connectionType === 'local-folder') {
        const existing = Array.isArray(productsRoot.discoveredCollections) ? productsRoot.discoveredCollections : [];
        const tempSourceId = `products-temp-${uniqueId}`;
        productsRoot.discoveredCollections = [
          ...existing,
          {
            ...collection,
            sourceId: tempSourceId,
            id: uniqueId,
            title: resolvedName,
            fileName: `${uniqueId}/index.json`,
            sourcePath: `${productsRoot.resolvedOrgDirectoryName || this.productsOrgDirectoryName(this.currentOrganizationId())}/${uniqueId}/index.json`,
          },
        ];
        this.state.workspace.activeProductSourceId = tempSourceId;
      } else {
        this.state.workspace.sources.products = collection;
        this.state.workspace.activeProductSourceId = collection.sourceId || collection.id;
      }
      this.state.activeWorkspace = 'products';
      this.state.currentLevel = 'products-sections';
    } else {
      const materialsRoot = this.materialRootSource();
      if (materialsRoot?.connectionType === 'local-folder') {
        const tempSourceId = `materials-temp-${uniqueId}`;
        this.state.workspace.sources.materials = [
          ...this.materialSources(),
          {
            ...collection,
            sourceId: tempSourceId,
            id: uniqueId,
            title: resolvedName,
            fileName: `${uniqueId}/settings.json`,
            sourcePath: `${materialsRoot.resolvedOrgDirectoryName || `suppliers/${this.currentOrganizationId() || ''}`}/${uniqueId}/settings.json`,
          },
        ];
        this.state.workspace.activeMaterialSourceId = tempSourceId;
      } else {
        this.state.workspace.sources.materials = [...this.materialSources(), collection];
        this.state.workspace.activeMaterialSourceId = collection.sourceId || collection.id;
      }
      this.state.activeWorkspace = 'materials';
      this.state.currentLevel = 'materials-sections';
    }

    this.state.activeSectionId = null;
    this.state.selectedEntryRef = null;
    this.setStatus(`Created ${resolvedName}.`);
    this.refreshAll();
  }

  async openManufacturerFile() {
    this.state.pendingOpenTarget = { type: 'manufacturer' };
    await this.openJsonPicker();
  }

  async openOrganizationSourceFolder() {
    try {
      const rootHandle = await openSourceDirectory();
      if (!rootHandle) {
        return;
      }

      const discovery = await this.discoverOrganizationsFromRootFolder(rootHandle);
      const source = createSourceDescriptor({
        role: 'organization-source',
        sourceId: this.manufacturerSource()?.sourceId || '',
        label: `Organization source (${rootHandle.name})`,
        ownerOrgId: '',
        ownerOrgName: '',
        connectionType: 'local-folder',
        folderHandle: rootHandle,
        fileHandle: null,
        fileName: '',
        sourcePath: rootHandle.name || '',
        selectedOrganizationId: '',
        discoveredOrganizations: discovery.organizations,
        isLoaded: true,
        isDirty: false,
        data: null,
        validation: createEmptyValidation(),
      });
      source.dirty = false;
      this.state.workspace.sources.manufacturer = source;

      if (discovery.organizations.length === 0) {
        this.state.organizations = [];
        this.state.workspace.currentOrganizationId = '';
        this.setStatus('Organization source set, but no valid organization folders were found.');
        this.refreshAll();
        return;
      }

      this.state.organizations = discovery.organizations.map((entry) => ({
        id: entry.id,
        label: entry.label,
      }));
      const current = this.currentOrganizationId();
      const nextId = discovery.organizations.some((entry) => entry.id === current)
        ? current
        : discovery.organizations[0].id;
      this.state.workspace.currentOrganizationId = nextId;
      await this.loadOrganizationInfoForCurrentSelection();
      await this.resolveProductsSourceForCurrentOrganization();
      await this.resolveMaterialsSourceForCurrentOrganization();

      if (discovery.warnings.length > 0) {
        this.setStatus(`Organization source set (${discovery.organizations.length} orgs, ${discovery.warnings.length} warning${discovery.warnings.length === 1 ? '' : 's'}).`);
      } else {
        this.setStatus(`Organization source set. Discovered ${discovery.organizations.length} organization${discovery.organizations.length === 1 ? '' : 's'}.`);
      }
      this.refreshAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Set organization source failed: ${error.message}`);
    }
  }

  async openProductsSourceFolder() {
    try {
      const rootHandle = await openSourceDirectory();
      if (!rootHandle) {
        return;
      }

      const source = createSourceDescriptor({
        role: 'products-source',
        sourceId: this.productSource()?.sourceId || '',
        label: `Products source (${rootHandle.name})`,
        ownerOrgId: this.currentOrganizationId(),
        ownerOrgName: this.currentOrganizationLabel(),
        connectionType: 'local-folder',
        folderHandle: rootHandle,
        fileHandle: null,
        fileName: '',
        sourcePath: rootHandle.name || '',
        discoveredCollections: [],
        resolvedOrgDirectoryName: '',
        isLoaded: true,
        isDirty: false,
        data: null,
        validation: createEmptyValidation(),
      });
      source.dirty = false;
      this.state.workspace.sources.products = source;

      await this.resolveProductsSourceForCurrentOrganization();

      const discoveredCount = Array.isArray(source.discoveredCollections) ? source.discoveredCollections.length : 0;
      if (discoveredCount > 0) {
        this.setStatus(`Products source set. Discovered ${discoveredCount} product collection${discoveredCount === 1 ? '' : 's'} for ${this.currentOrganizationId() || 'current org'}.`);
      } else if (!this.currentOrganizationId()) {
        this.setStatus('Products source set. Select an organization to resolve product collections.');
      }
      this.state.activeWorkspace = 'products';
      this.state.currentLevel = 'products-collections';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
      this.refreshAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Set products source failed: ${error.message}`);
    }
  }

  async openMaterialsSourceFolder() {
    try {
      const rootHandle = await openSourceDirectory();
      if (!rootHandle) {
        return;
      }

      const source = createSourceDescriptor({
        role: 'materials-source',
        sourceId: this.materialRootSource()?.sourceId || '',
        label: `Materials source (${rootHandle.name})`,
        ownerOrgId: this.currentOrganizationId(),
        ownerOrgName: this.currentOrganizationLabel(),
        connectionType: 'local-folder',
        folderHandle: rootHandle,
        fileHandle: null,
        fileName: '',
        sourcePath: rootHandle.name || '',
        discoveredCollections: [],
        resolvedOrgDirectoryName: '',
        isLoaded: true,
        isDirty: false,
        data: null,
        validation: createEmptyValidation(),
      });
      source.dirty = false;
      this.state.workspace.sources.materialsRoot = source;

      await this.resolveMaterialsSourceForCurrentOrganization();

      const discoveredCount = this.materialSources().length;
      if (discoveredCount > 0) {
        this.setStatus(`Materials source set. Discovered ${discoveredCount} material collection${discoveredCount === 1 ? '' : 's'} for ${this.currentOrganizationId() || 'current org'}.`);
      } else if (!this.currentOrganizationId()) {
        this.setStatus('Materials source set. Select an organization to resolve material collections.');
      }
      this.state.activeWorkspace = 'materials';
      this.state.currentLevel = 'materials-collections';
      this.state.activeSectionId = null;
      this.state.selectedEntryRef = null;
      this.refreshAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Set materials source failed: ${error.message}`);
    }
  }

  async resolveProductsSourceForCurrentOrganization() {
    const source = this.productSource();
    if (!source || source.connectionType !== 'local-folder') {
      return;
    }

    const orgId = String(this.currentOrganizationId() || '').trim();
    if (!orgId) {
      source.discoveredCollections = [];
      source.resolvedOrgDirectoryName = '';
      this.state.workspace.activeProductSourceId = null;
      return;
    }

    const orgDirectoryName = this.productsOrgDirectoryName(orgId);
    source.resolvedOrgDirectoryName = orgDirectoryName;
    source.ownerOrgId = orgId;
    source.ownerOrgName = this.currentOrganizationLabel();

    if (!source.folderHandle || typeof source.folderHandle.getDirectoryHandle !== 'function') {
      source.discoveredCollections = [];
      this.state.workspace.activeProductSourceId = null;
      return;
    }

    let orgDirectoryHandle = null;
    try {
      orgDirectoryHandle = await source.folderHandle.getDirectoryHandle(orgDirectoryName);
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        source.discoveredCollections = [];
        this.state.workspace.activeProductSourceId = null;
        if (this.state.activeWorkspace === 'products') {
          this.state.currentLevel = 'products-collections';
          this.state.activeSectionId = null;
          this.state.selectedEntryRef = null;
        }
        this.setStatus(`Products source does not contain ${orgDirectoryName}.`);
        return;
      }
      throw error;
    }

    const discoveredCollections = [];
    let warningCount = 0;
    const previousActive = this.state.workspace.activeProductSourceId;

    for await (const [entryName, entryHandle] of orgDirectoryHandle.entries()) {
      if (!entryHandle || entryHandle.kind !== 'directory') {
        continue;
      }
      const productDirName = String(entryName || '').trim();
      if (!productDirName) {
        continue;
      }

      let indexFileHandle = null;
      try {
        indexFileHandle = await entryHandle.getFileHandle('index.json');
      } catch (error) {
        if (error?.name !== 'NotFoundError') {
          warningCount += 1;
        }
        continue;
      }

      try {
        const file = await indexFileHandle.getFile();
        const parsed = JSON.parse(await file.text());
        if (!isPlainObject(parsed)) {
          warningCount += 1;
          continue;
        }

        const collectionId = slugify(String(parsed.id || '').trim() || productDirName, productDirName);
        const title = String(parsed.title || parsed.name || parsed.label || '').trim() || productDirName;
        const stableSourceId = `products-${slugify(orgDirectoryName)}-${slugify(productDirName)}`;
        const collection = createSourceDescriptor({
          role: 'products',
          sourceId: stableSourceId,
          label: title,
          ownerOrgId: orgId,
          ownerOrgName: this.currentOrganizationLabel(),
          collectionId,
          connectionType: 'local-file',
          fileHandle: indexFileHandle,
          fileName: `${productDirName}/index.json`,
          sourcePath: `${orgDirectoryName}/${productDirName}/index.json`,
          isLinkedExternal: false,
          isLoaded: true,
          isDirty: false,
          data: parsed,
          validation: validateDataRoot('products', parsed),
        });
        collection.dirty = false;
        discoveredCollections.push({
          ...collection,
          id: collectionId,
          title,
          sourceType: collection.connectionType,
          linked: false,
          ownerOrganizationId: orgId,
          sourceOrganizationId: orgId,
          orgDirectoryName,
          productDirectoryName: productDirName,
          collectionDirectoryHandle: entryHandle,
          indexFileHandle,
        });
      } catch (_error) {
        warningCount += 1;
      }
    }

    discoveredCollections.sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
    source.discoveredCollections = discoveredCollections;

    const activeExists = discoveredCollections.some((entry) => entry.sourceId === previousActive || entry.id === previousActive);
    this.state.workspace.activeProductSourceId = activeExists
      ? previousActive
      : (discoveredCollections[0]?.sourceId || discoveredCollections[0]?.id || null);

    if (warningCount > 0) {
      this.setStatus(`Products source resolved ${discoveredCollections.length} collection${discoveredCollections.length === 1 ? '' : 's'} with ${warningCount} warning${warningCount === 1 ? '' : 's'}.`);
    }
  }

  async resolveMaterialsSourceForCurrentOrganization() {
    const source = this.materialRootSource();
    if (!source || source.connectionType !== 'local-folder') {
      return;
    }

    const orgId = String(this.currentOrganizationId() || '').trim();
    if (!orgId) {
      source.discoveredCollections = [];
      source.resolvedOrgDirectoryName = '';
      this.state.workspace.sources.materials = [];
      this.state.workspace.activeMaterialSourceId = null;
      return;
    }

    source.ownerOrgId = orgId;
    source.ownerOrgName = this.currentOrganizationLabel();

    if (!source.folderHandle || typeof source.folderHandle.getDirectoryHandle !== 'function') {
      source.discoveredCollections = [];
      this.state.workspace.sources.materials = [];
      this.state.workspace.activeMaterialSourceId = null;
      return;
    }

    let suppliersDirectoryHandle = null;
    try {
      suppliersDirectoryHandle = await source.folderHandle.getDirectoryHandle('suppliers');
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        source.discoveredCollections = [];
        source.resolvedOrgDirectoryName = '';
        this.state.workspace.sources.materials = [];
        this.state.workspace.activeMaterialSourceId = null;
        this.setStatus('Materials source missing suppliers directory.');
        return;
      }
      throw error;
    }

    let orgDirectoryHandle = null;
    try {
      orgDirectoryHandle = await suppliersDirectoryHandle.getDirectoryHandle(orgId);
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        source.discoveredCollections = [];
        source.resolvedOrgDirectoryName = `suppliers/${orgId}`;
        this.state.workspace.sources.materials = [];
        this.state.workspace.activeMaterialSourceId = null;
        if (this.state.activeWorkspace === 'materials') {
          this.state.currentLevel = 'materials-collections';
          this.state.activeSectionId = null;
          this.state.selectedEntryRef = null;
        }
        this.setStatus(`Materials source does not contain suppliers/${orgId}.`);
        return;
      }
      throw error;
    }

    source.resolvedOrgDirectoryName = `suppliers/${orgId}`;
    const previousActive = this.state.workspace.activeMaterialSourceId;
    const discoveredCollections = [];
    let warningCount = 0;

    for await (const [entryName, entryHandle] of orgDirectoryHandle.entries()) {
      if (!entryHandle || entryHandle.kind !== 'directory') {
        continue;
      }
      const collectionDirName = String(entryName || '').trim();
      if (!collectionDirName) {
        continue;
      }

      let settingsFileHandle = null;
      try {
        settingsFileHandle = await entryHandle.getFileHandle('settings.json');
      } catch (error) {
        if (error?.name !== 'NotFoundError') {
          warningCount += 1;
        }
        continue;
      }

      try {
        const file = await settingsFileHandle.getFile();
        const parsed = JSON.parse(await file.text());
        if (!isPlainObject(parsed)) {
          warningCount += 1;
          continue;
        }

        const collectionId = slugify(String(parsed.id || '').trim() || collectionDirName, collectionDirName);
        const title = String(parsed.title || parsed.name || parsed.label || '').trim() || collectionDirName;
        const stableSourceId = `materials-${slugify(orgId)}-${slugify(collectionDirName)}`;
        const collection = createSourceDescriptor({
          role: 'materials',
          sourceId: stableSourceId,
          label: title,
          ownerOrgId: orgId,
          ownerOrgName: this.currentOrganizationLabel(),
          collectionId,
          connectionType: 'local-file',
          fileHandle: settingsFileHandle,
          fileName: `${collectionDirName}/settings.json`,
          sourcePath: `suppliers/${orgId}/${collectionDirName}/settings.json`,
          isLinkedExternal: false,
          isLoaded: true,
          isDirty: false,
          data: parsed,
          validation: validateDataRoot('materials', parsed),
        });
        collection.dirty = false;
        discoveredCollections.push({
          ...collection,
          id: collectionId,
          title,
          sourceType: collection.connectionType,
          linked: false,
          ownerOrganizationId: orgId,
          sourceOrganizationId: orgId,
          orgDirectoryName: `suppliers/${orgId}`,
          collectionDirectoryName: collectionDirName,
          collectionDirectoryHandle: entryHandle,
          settingsFileHandle,
        });
      } catch (_error) {
        warningCount += 1;
      }
    }

    discoveredCollections.sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
    source.discoveredCollections = discoveredCollections;
    this.state.workspace.sources.materials = discoveredCollections;

    const activeExists = discoveredCollections.some((entry) => entry.sourceId === previousActive || entry.id === previousActive);
    this.state.workspace.activeMaterialSourceId = activeExists
      ? previousActive
      : (discoveredCollections[0]?.sourceId || discoveredCollections[0]?.id || null);

    if (warningCount > 0) {
      this.setStatus(`Materials source resolved ${discoveredCollections.length} collection${discoveredCollections.length === 1 ? '' : 's'} with ${warningCount} warning${warningCount === 1 ? '' : 's'}.`);
    }
  }

  async reloadProductCollectionFromIndex(productSourceId) {
    const sourceRoot = this.productSource();
    if (!sourceRoot || sourceRoot.connectionType !== 'local-folder') {
      return;
    }
    const list = Array.isArray(sourceRoot.discoveredCollections) ? sourceRoot.discoveredCollections : [];
    const index = list.findIndex((entry) => entry.sourceId === productSourceId || entry.id === productSourceId);
    if (index < 0) {
      return;
    }
    const target = list[index];
    if (!target) {
      return;
    }

    let fileHandle = target.indexFileHandle || target.fileHandle || null;
    if (!fileHandle && target.collectionDirectoryHandle && typeof target.collectionDirectoryHandle.getFileHandle === 'function') {
      fileHandle = await target.collectionDirectoryHandle.getFileHandle('index.json');
    }
    if (!fileHandle) {
      return;
    }

    try {
      const file = await fileHandle.getFile();
      const parsed = JSON.parse(await file.text());
      if (!isPlainObject(parsed)) {
        throw new Error('index.json must contain an object');
      }
      const nextTitle = String(parsed.title || parsed.name || parsed.label || '').trim() || target.productDirectoryName || target.title || target.id;
      const next = {
        ...target,
        data: parsed,
        title: nextTitle,
        label: nextTitle,
        fileHandle,
        indexFileHandle: fileHandle,
        validation: validateDataRoot('products', parsed),
        isLoaded: true,
      };
      sourceRoot.discoveredCollections = list.map((entry, entryIndex) => (entryIndex === index ? next : entry));
    } catch (error) {
      this.setStatus(`Failed to load ${target.fileName || 'index.json'}: ${error.message}`);
    }
  }

  async reloadMaterialCollectionFromSettings(materialSourceId) {
    const sourceRoot = this.materialRootSource();
    if (!sourceRoot || sourceRoot.connectionType !== 'local-folder') {
      return;
    }
    const list = this.materialSources();
    const index = list.findIndex((entry) => entry.sourceId === materialSourceId || entry.id === materialSourceId);
    if (index < 0) {
      return;
    }
    const target = list[index];
    if (!target) {
      return;
    }

    let fileHandle = target.settingsFileHandle || target.fileHandle || null;
    if (!fileHandle && target.collectionDirectoryHandle && typeof target.collectionDirectoryHandle.getFileHandle === 'function') {
      fileHandle = await target.collectionDirectoryHandle.getFileHandle('settings.json');
    }
    if (!fileHandle) {
      return;
    }

    try {
      const file = await fileHandle.getFile();
      const parsed = JSON.parse(await file.text());
      if (!isPlainObject(parsed)) {
        throw new Error('settings.json must contain an object');
      }
      const nextTitle = String(parsed.title || parsed.name || parsed.label || '').trim() || target.collectionDirectoryName || target.title || target.id;
      const next = {
        ...target,
        data: parsed,
        title: nextTitle,
        label: nextTitle,
        fileHandle,
        settingsFileHandle: fileHandle,
        validation: validateDataRoot('materials', parsed),
        isLoaded: true,
      };
      this.state.workspace.sources.materials = list.map((entry, entryIndex) => (entryIndex === index ? next : entry));
      sourceRoot.discoveredCollections = this.state.workspace.sources.materials;
    } catch (error) {
      this.setStatus(`Failed to load ${target.fileName || 'settings.json'}: ${error.message}`);
    }
  }

  async discoverOrganizationsFromRootFolder(rootHandle) {
    const organizations = [];
    const warnings = [];
    const entries = [];
    for await (const [entryName, entryHandle] of rootHandle.entries()) {
      entries.push([entryName, entryHandle]);
    }

    for (const [entryName, entryHandle] of entries) {
      if (!entryHandle || entryHandle.kind !== 'directory') {
        continue;
      }

      const folderName = String(entryName || '').trim();
      if (!folderName) {
        continue;
      }

      const infoFileName = `${folderName}_info.json`;
      let infoFileHandle = null;
      try {
        infoFileHandle = await entryHandle.getFileHandle(infoFileName);
      } catch (error) {
        if (error?.name !== 'NotFoundError') {
          warnings.push(`${folderName}: ${error.message}`);
        }
        continue;
      }

      try {
        const file = await infoFileHandle.getFile();
        const parsed = JSON.parse(await file.text());
        if (!isPlainObject(parsed)) {
          warnings.push(`${folderName}: ${infoFileName} must contain a JSON object.`);
          continue;
        }
        const label = String(parsed.name || parsed.title || parsed.label || '').trim() || folderName;
        const orgId = folderName;
        organizations.push({
          id: orgId,
          label,
          folderName,
          infoFileName,
          directoryHandle: entryHandle,
          infoFileHandle,
        });
      } catch (error) {
        warnings.push(`${folderName}: invalid ${infoFileName} (${error.message}).`);
      }
    }

    organizations.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return { organizations, warnings };
  }

  async loadOrganizationInfoForCurrentSelection() {
    const source = this.manufacturerSource();
    const selectedId = String(this.currentOrganizationId() || '').trim();
    if (!source || source.connectionType !== 'local-folder' || !selectedId) {
      return false;
    }

    const discovered = Array.isArray(source.discoveredOrganizations) ? source.discoveredOrganizations : [];
    const match = discovered.find((entry) => entry.id === selectedId);
    if (!match) {
      return false;
    }

    let infoFileHandle = match.infoFileHandle || null;
    if (!infoFileHandle && source.folderHandle && typeof source.folderHandle.getDirectoryHandle === 'function') {
      const dirHandle = await source.folderHandle.getDirectoryHandle(match.folderName);
      infoFileHandle = await dirHandle.getFileHandle(match.infoFileName);
    }
    if (!infoFileHandle) {
      return false;
    }

    const file = await infoFileHandle.getFile();
    const parsed = JSON.parse(await file.text());
    if (!isPlainObject(parsed)) {
      throw new Error(`${match.infoFileName} does not contain an object`);
    }

    source.data = parsed;
    source.fileHandle = infoFileHandle;
    source.fileName = match.infoFileName;
    source.ownerOrgId = selectedId;
    source.ownerOrgName = match.label;
    source.selectedOrganizationId = selectedId;
    source.isLoaded = true;
    source.isDirty = false;
    source.dirty = false;
    source.validation = validateDataRoot('general', parsed);
    return true;
  }

  async openCollectionFile(workspace) {
    this.state.pendingOpenTarget = { type: 'collection', workspace };
    await this.openJsonPicker();
  }

  async openPackagesFile() {
    this.state.pendingOpenTarget = { type: 'packages' };
    await this.openJsonPicker();
  }

  async openJsonPicker() {
    try {
      const picked = await openJsonSourceFile();
      if (picked) {
        const file = {
          name: picked.name || picked.handle?.name || 'data.json',
          async text() {
            return picked.text;
          },
        };
        await this.handleOpenedFile(file, picked.handle || null);
        return;
      }

    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Open failed: ${error.message}`);
    }
  }

  async handlePendingOpenFile(file) {
    await this.handleOpenedFile(file, null);
  }

  async handleOpenedFile(file, handle) {
    const pending = this.state.pendingOpenTarget;
    this.state.pendingOpenTarget = null;

    if (!pending) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isPlainObject(parsed)) {
        throw new Error('Selected JSON must contain one top-level object.');
      }

      if (pending.type === 'manufacturer') {
        const manufacturer = createSourceDescriptor({
          role: 'manufacturer',
          sourceId: this.manufacturerSource()?.sourceId || '',
          label: 'Manufacturer source',
          ownerOrgId: this.currentOrganizationId(),
          connectionType: 'local-file',
          fileHandle: handle,
          fileName: file.name || (handle?.name || 'manufacturer_info.json'),
          sourcePath: file.name || (handle?.name || ''),
          data: parsed,
          isLoaded: true,
          isDirty: false,
          validation: validateDataRoot('general', parsed),
        });
        manufacturer.dirty = false;
        this.state.workspace.sources.manufacturer = manufacturer;
        this.state.activeWorkspace = 'general';
        this.state.currentLevel = 'general-sections';
        this.state.activeSectionId = null;
        this.state.selectedEntryRef = null;
        this.setStatus(`Opened manufacturer source ${manufacturer.fileName}.`);
      }

      if (pending.type === 'collection') {
        const workspace = pending.workspace;
        const collection = makeCollectionRecord(
          workspace,
          parsed,
          this.currentOrganizationId(),
          handle,
          file.name || (handle?.name || `${workspace}-collection.json`),
        );

        if (workspace === 'products') {
          const previous = this.productSource();
          if (previous && previous.collectionId === collection.collectionId) {
            collection.sourceId = previous.sourceId;
          }
          this.state.workspace.sources.products = collection;
          this.state.workspace.activeProductSourceId = collection.sourceId || collection.id;
          this.state.activeWorkspace = 'products';
          this.state.currentLevel = 'products-sections';
        } else {
          const next = [...this.materialSources()];
          const existingIndex = next.findIndex((entry) => entry.collectionId === collection.collectionId || entry.id === collection.id);
          if (existingIndex >= 0) {
            collection.sourceId = next[existingIndex].sourceId || collection.sourceId;
            next[existingIndex] = collection;
          } else {
            next.push(collection);
          }
          this.state.workspace.sources.materials = next;
          this.state.workspace.activeMaterialSourceId = collection.sourceId || collection.id;
          this.state.activeWorkspace = 'materials';
          this.state.currentLevel = 'materials-sections';
        }

        this.state.activeSectionId = null;
        this.state.selectedEntryRef = null;
        this.setStatus(`Opened ${workspace} source ${collection.title}.`);
      }

      if (pending.type === 'packages') {
        const packagesSource = createSourceDescriptor({
          role: 'packages',
          sourceId: this.packagesSource()?.sourceId || '',
          label: 'Packages source',
          ownerOrgId: this.currentOrganizationId(),
          connectionType: 'local-file',
          fileHandle: handle,
          fileName: file.name || (handle?.name || 'packages.json'),
          sourcePath: file.name || (handle?.name || ''),
          data: parsed,
          isLoaded: true,
          isDirty: false,
          validation: createEmptyValidation(),
        });
        packagesSource.dirty = false;
        this.state.workspace.sources.packages = packagesSource;
        this.setStatus(`Opened packages source ${packagesSource.fileName}.`);
      }

      this.refreshAll();
    } catch (error) {
      this.setStatus(`Open failed: ${error.message}`);
    }
  }
  async saveManufacturer() {
    const manufacturer = this.manufacturerSource();
    if (!isPlainObject(manufacturer?.data)) {
      this.setStatus('No manufacturer source loaded.');
      return;
    }

    try {
      const text = `${JSON.stringify(manufacturer.data, null, 2)}\n`;
      if (manufacturer.fileHandle && typeof manufacturer.fileHandle.createWritable === 'function') {
        await this.writeToHandle(manufacturer.fileHandle, text);
      } else {
        await this.saveTextAsFile(text, manufacturer.fileName || 'manufacturer_info.json');
      }
      setSourceDirty(manufacturer, false);
      this.setStatus('Manufacturer source saved.');
      this.refreshAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Save manufacturer failed: ${error.message}`);
    }
  }

  async saveSelectedCollection(workspace) {
    const collection = workspace === 'products'
      ? this.selectedProductSource()
      : this.selectedMaterialSource();

    if (!collection) {
      this.setStatus('No collection selected.');
      return;
    }

    try {
      const text = `${JSON.stringify(collection.data, null, 2)}\n`;
      if (collection.fileHandle && typeof collection.fileHandle.createWritable === 'function') {
        await this.writeToHandle(collection.fileHandle, text);
      } else {
        await this.saveTextAsFile(text, collection.fileName || `${workspace}-collection.json`);
      }
      setSourceDirty(collection, false);
      this.setStatus(`${workspace === 'products' ? 'Products' : 'Materials'} source saved.`);
      this.refreshAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Save collection failed: ${error.message}`);
    }
  }

  async downloadGeneratedExport() {
    try {
      const text = `${JSON.stringify(this.workspaceGeneratedPackage() || {}, null, 2)}\n`;
      await this.saveTextAsFile(text, 'configurator-package.json');
      this.setStatus('Generated package exported.');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      this.setStatus(`Export download failed: ${error.message}`);
    }
  }

  async saveTextAsFile(text, suggestedName) {
    await saveSourceText(text, suggestedName);
  }

  async writeToHandle(handle, text) {
    await writeSourceText(handle, text);
  }

  applyEntryChange(detail) {
    if (this.state.currentLevel === 'general-sections' && detail.sectionId === '__general_metadata') {
      const source = this.manufacturerSource();
      if (!isPlainObject(source?.data) || !isPlainObject(detail.value)) {
        return;
      }

      const keys = this.generalMetadataKeys(source.data);
      const nextData = { ...source.data };
      for (const key of keys) {
        if (key in detail.value) {
          nextData[key] = detail.value[key];
        }
      }
      source.data = nextData;
      setSourceDirty(source, true);
      this.setStatus('Edited organization metadata.');
      this.refreshAll();
      return;
    }

    if (this.state.currentLevel === 'products-sections' && detail.sectionId === '__products_metadata') {
      const source = this.selectedProductSource();
      if (!isPlainObject(source?.data) || !isPlainObject(detail.value)) {
        return;
      }

      const keys = this.generalMetadataKeys(source.data);
      const nextData = { ...source.data };
      for (const key of keys) {
        if (key in detail.value) {
          nextData[key] = detail.value[key];
        }
      }
      source.data = nextData;
      setSourceDirty(source, true);
      this.setStatus('Edited product collection metadata.');
      this.refreshAll();
      return;
    }

    if (this.state.currentLevel === 'materials-sections' && detail.sectionId === '__materials_metadata') {
      const source = this.selectedMaterialSource();
      if (!isPlainObject(source?.data) || !isPlainObject(detail.value)) {
        return;
      }

      const keys = this.generalMetadataKeys(source.data);
      const nextData = { ...source.data };
      for (const key of keys) {
        if (key in detail.value) {
          nextData[key] = detail.value[key];
        }
      }
      source.data = nextData;
      setSourceDirty(source, true);
      this.setStatus('Edited material collection metadata.');
      this.refreshAll();
      return;
    }

    const context = this.currentEntryContext();
    if (!context || !context.owner || !isPlainObject(context.owner.data)) {
      return;
    }

    const sectionId = context.sectionId;
    if (!sectionId || detail.sectionId !== sectionId) {
      return;
    }

    const nextData = cloneJson(context.owner.data);
    const ref = detail.entryRef || {};
    const value = detail.value;

    if (Array.isArray(nextData[sectionId]) && Number.isInteger(ref.index)) {
      nextData[sectionId][ref.index] = value;
    } else if (isPlainObject(nextData[sectionId])) {
      if (typeof ref.key === 'string') {
        nextData[sectionId][ref.key] = value;
      } else if (ref.scope === 'section') {
        nextData[sectionId] = value;
      }
    }

    context.owner.data = nextData;
    setSourceDirty(context.owner, true);
    this.setStatus(`Edited ${friendlySectionLabel(sectionId)}.`);
    this.refreshAll();
  }

  applyArrayAction(action) {
    const context = this.currentEntryContext();
    if (!context || !context.owner || !isPlainObject(context.owner.data)) {
      return;
    }

    const sectionId = context.sectionId;
    const list = context.owner.data[sectionId];
    if (!Array.isArray(list)) {
      return;
    }

    const index = Number(this.state.selectedEntryRef?.index);
    const hasSelection = Number.isInteger(index) && index >= 0 && index < list.length;

    if (action === 'add') {
      const template = {
        id: `${slugify(sectionId, 'entry')}-${list.length + 1}`,
        title: `New ${friendlySectionLabel(sectionId)}`,
      };
      template.id = ensureUniqueEntryId(list, template.id);
      list.push(template);
      this.state.selectedEntryRef = { index: list.length - 1 };
    } else if (action === 'duplicate') {
      if (!hasSelection) return;
      const next = cloneJson(list[index]);
      if (isPlainObject(next) && next.id) {
        next.id = ensureUniqueEntryId(list, `${next.id}-copy`);
      }
      list.splice(index + 1, 0, next);
      this.state.selectedEntryRef = { index: index + 1 };
    } else if (action === 'delete') {
      if (!hasSelection) return;
      if (!window.confirm(`Delete selected entry from ${friendlySectionLabel(sectionId)}?`)) {
        return;
      }
      list.splice(index, 1);
      this.state.selectedEntryRef = list.length > 0 ? { index: Math.max(0, Math.min(index, list.length - 1)) } : null;
    } else if (action === 'move-up') {
      if (!hasSelection || index <= 0) return;
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      this.state.selectedEntryRef = { index: index - 1 };
    } else if (action === 'move-down') {
      if (!hasSelection || index >= list.length - 1) return;
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      this.state.selectedEntryRef = { index: index + 1 };
    }

    context.owner.data = { ...context.owner.data, [sectionId]: list };
    setSourceDirty(context.owner, true);
    this.refreshAll();
  }
}

if (!customElements.get('open-configurator-manager')) {
  customElements.define('open-configurator-manager', OpenConfiguratorManagerElement);
}

export { OpenConfiguratorManagerElement };

