
import '../../collector/src/components/pane-layout.js';
import './components/configurator-header.js';
import './components/configurator-section-browser.js';
import './components/configurator-inspector.js';
import { configuratorShellStyles } from './css/shell.css.js';

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

function createEmptyManufacturerSource() {
  return {
    fileHandle: null,
    fileName: '',
    data: null,
    dirty: false,
    validation: createEmptyValidation(),
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

  return {
    id: normalizedId,
    title,
    ownerOrganizationId: organizationId,
    sourceOrganizationId: organizationId,
    sourceType: 'local',
    linked: false,
    fileHandle,
    fileName,
    data: isPlainObject(data) ? data : {},
    dirty: false,
    validation: validateDataRoot(workspace, data),
  };
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
    this.state = {
      organizations: [
        {
          id: 'org-4x6-sofa',
          label: '4x6 sofa',
        },
      ],
      currentOrganizationId: 'org-4x6-sofa',
      activeWorkspace: 'general',
      currentLevel: 'general-sections',
      manufacturer: createEmptyManufacturerSource(),
      productCollections: [],
      materialCollections: [],
      selectedProductCollectionId: null,
      selectedMaterialCollectionId: null,
      activeSectionId: null,
      selectedEntryRef: null,
      viewModes: {},
      relationOptions: {},
      generatedPackageData: null,
      exportWarnings: [],
      statusText: 'Select an organization and open source files to begin.',
      pendingOpenTarget: null,
    };
  }

  connectedCallback() {
    this.render();
    this.cacheDom();
    this.bindEvents();
    this.recomputeDerivedState();
    this.refreshAll();
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
    };
  }

  bindEvents() {
    this.dom.header.addEventListener('workspace-select', (event) => {
      this.switchWorkspace(event.detail?.workspace || 'general');
    });

    this.dom.header.addEventListener('organization-select', (event) => {
      const organizationId = event.detail?.organizationId || '';
      if (organizationId) {
        this.state.currentOrganizationId = organizationId;
        this.state.statusText = `Organization switched to ${this.currentOrganizationLabel()}.`;
        this.refreshAll();
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
      this.state.selectedEntryRef = event.detail?.entryRef || null;
      this.normalizeSelection();
      this.renderBrowser();
      this.renderInspector();
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
  }
  currentOrganizationLabel() {
    return this.state.organizations.find((org) => org.id === this.state.currentOrganizationId)?.label || 'Organization';
  }

  setStatus(text) {
    const next = String(text || '').trim();
    if (next) {
      this.state.statusText = next;
      this.renderHeader();
    }
  }

  currentWorkspaceCollections() {
    if (this.state.activeWorkspace === 'products') {
      return this.state.productCollections;
    }
    if (this.state.activeWorkspace === 'materials') {
      return this.state.materialCollections;
    }
    return [];
  }

  selectedCollection() {
    if (this.state.activeWorkspace === 'products') {
      return this.state.productCollections.find((entry) => entry.id === this.state.selectedProductCollectionId) || null;
    }
    if (this.state.activeWorkspace === 'materials') {
      return this.state.materialCollections.find((entry) => entry.id === this.state.selectedMaterialCollectionId) || null;
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
        warningCount: this.state.exportWarnings.length,
      });
    }

    return sections;
  }

  currentEntryContext() {
    if (this.state.currentLevel === 'general-entries') {
      return {
        ownerType: 'manufacturer',
        owner: this.state.manufacturer,
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
    return this.state.currentLevel === 'general-entries'
      || this.state.currentLevel === 'products-entries'
      || this.state.currentLevel === 'materials-entries';
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
    this.state.manufacturer.validation = validateDataRoot('general', this.state.manufacturer.data);

    this.state.productCollections = this.state.productCollections.map((collection) => ({
      ...collection,
      validation: validateDataRoot('products', collection.data),
    }));

    this.state.materialCollections = this.state.materialCollections.map((collection) => ({
      ...collection,
      validation: validateDataRoot('materials', collection.data),
    }));

    this.rebuildRelationOptions();
    this.refreshExportSnapshot();
    this.normalizeSelection();
  }

  rebuildRelationOptions() {
    let options = {};
    options = mergeRelationOptions(options, buildRelationOptionsFromData(this.state.manufacturer.data));

    for (const collection of this.state.productCollections) {
      options = mergeRelationOptions(options, buildRelationOptionsFromData(collection.data));
    }
    for (const collection of this.state.materialCollections) {
      options = mergeRelationOptions(options, buildRelationOptionsFromData(collection.data));
    }

    this.state.relationOptions = options;
  }

  refreshExportSnapshot() {
    const selectedProduct = this.state.productCollections.find((entry) => entry.id === this.state.selectedProductCollectionId) || null;
    const warnings = [];
    if (!selectedProduct) {
      warnings.push('No selected product collection.');
      this.state.generatedPackageData = {};
      this.state.exportWarnings = warnings;
      return;
    }

    const base = cloneJson(selectedProduct.data || {});
    const withOrg = isPlainObject(this.state.manufacturer.data) ? mergeAdditive(base, this.state.manufacturer.data) : base;
    let merged = withOrg;

    if (this.state.materialCollections.length === 0) {
      warnings.push('No material collections loaded.');
    }

    for (const collection of this.state.materialCollections) {
      merged = mergeAdditive(merged, collection.data || {});
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

    this.state.generatedPackageData = merged;
    this.state.exportWarnings = [...warnings, ...Array.from(new Set(relationWarnings)).slice(0, 120)];
  }

  normalizeSelection() {
    if (this.state.currentLevel.startsWith('products-')) {
      const exists = this.state.productCollections.some((entry) => entry.id === this.state.selectedProductCollectionId);
      if (!exists) {
        this.state.selectedProductCollectionId = this.state.productCollections[0]?.id || null;
      }
      if (!this.state.selectedProductCollectionId && this.state.currentLevel !== 'products-collections') {
        this.state.currentLevel = 'products-collections';
      }
    }

    if (this.state.currentLevel.startsWith('materials-')) {
      const exists = this.state.materialCollections.some((entry) => entry.id === this.state.selectedMaterialCollectionId);
      if (!exists) {
        this.state.selectedMaterialCollectionId = this.state.materialCollections[0]?.id || null;
      }
      if (!this.state.selectedMaterialCollectionId && this.state.currentLevel !== 'materials-collections') {
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
        this.state.selectedProductCollectionId = list[resolvedIndex].id;
      }
      if (this.state.currentLevel === 'materials-collections' && Number.isInteger(resolvedIndex) && list[resolvedIndex]) {
        this.state.selectedMaterialCollectionId = list[resolvedIndex].id;
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
      return this.state.productCollections;
    }
    if (this.state.currentLevel === 'materials-collections') {
      return this.state.materialCollections;
    }
    if (this.state.currentLevel === 'products-sections' || this.state.currentLevel === 'materials-sections' || this.state.currentLevel === 'general-sections') {
      return this.sectionEntriesForCurrentLevel();
    }
    return [];
  }

  sectionEntriesForCurrentLevel() {
    if (this.state.currentLevel === 'general-sections') {
      return this.sectionListForData(this.state.manufacturer.data, this.state.manufacturer.validation);
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
        { id: 'new-manufacturer', label: 'New Manufacturer' },
        { id: 'open-manufacturer', label: 'Open Manufacturer' },
        { id: 'save-manufacturer', label: 'Save Manufacturer', variant: 'primary', disabled: !this.state.manufacturer.data },
        { id: 'open-section', label: 'Open Section' },
      ];
    }

    if (this.state.currentLevel === 'general-entries') {
      return [
        { id: 'save-manufacturer', label: 'Save Manufacturer', variant: 'primary', disabled: !this.state.manufacturer.data },
      ];
    }

    if (this.state.currentLevel === 'products-collections') {
      return [
        { id: 'new-product-collection', label: 'New Collection' },
        { id: 'open-product-collection-file', label: 'Open Collection' },
        { id: 'save-product-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
        { id: 'open-selected-collection', label: 'Open Selected' },
      ];
    }

    if (this.state.currentLevel === 'products-sections') {
      return [
        { id: 'open-section', label: 'Open Section' },
        { id: 'save-product-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'products-entries') {
      return [
        { id: 'save-product-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'products-export') {
      return [
        { id: 'generate-export', label: 'Generate Export', variant: 'primary' },
        { id: 'download-export', label: 'Download Export', disabled: !isPlainObject(this.state.generatedPackageData) || Object.keys(this.state.generatedPackageData).length === 0 },
      ];
    }

    if (this.state.currentLevel === 'materials-collections') {
      return [
        { id: 'new-material-collection', label: 'New Collection' },
        { id: 'open-material-collection-file', label: 'Open Collection' },
        { id: 'save-material-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
        { id: 'open-selected-collection', label: 'Open Selected' },
      ];
    }

    if (this.state.currentLevel === 'materials-sections') {
      return [
        { id: 'open-section', label: 'Open Section' },
        { id: 'save-material-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    if (this.state.currentLevel === 'materials-entries') {
      return [
        { id: 'save-material-collection', label: 'Save Collection', variant: 'primary', disabled: !this.selectedCollection() },
      ];
    }

    return [];
  }
  browserModel() {
    const model = {
      section: { id: 'overview', label: 'Workspace', kind: 'overview' },
      sectionValue: null,
      selectedEntryRef: this.state.selectedEntryRef,
      showBack: this.state.currentLevel !== 'general-sections' && this.state.currentLevel !== 'products-collections' && this.state.currentLevel !== 'materials-collections',
      showViewToggle: true,
      contextActions: this.contextActions(),
      overviewStats: [],
      overviewWarnings: [],
      exportPayload: null,
      viewMode: this.currentViewMode(),
      sectionValidation: null,
      arrayActions: this.arrayActionState(),
    };

    if (this.state.currentLevel === 'general-sections') {
      model.section = { id: 'general-sections', label: 'General Sections', kind: 'array' };
      model.sectionValue = this.sectionEntriesForCurrentLevel();
      model.showViewToggle = false;
      model.overviewWarnings = this.state.manufacturer.validation.overviewWarnings;
      return model;
    }

    if (this.state.currentLevel === 'products-collections') {
      model.section = { id: 'products-collections', label: 'Product Collections', kind: 'array' };
      model.sectionValue = this.state.productCollections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        owner: collection.ownerOrganizationId,
        sourceType: collection.sourceType,
      }));
      return model;
    }

    if (this.state.currentLevel === 'materials-collections') {
      model.section = { id: 'materials-collections', label: 'Material Collections', kind: 'array' };
      model.sectionValue = this.state.materialCollections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        owner: collection.ownerOrganizationId,
        sourceType: collection.sourceType,
      }));
      return model;
    }

    if (this.state.currentLevel === 'products-sections' || this.state.currentLevel === 'materials-sections') {
      const collection = this.selectedCollection();
      const label = this.state.currentLevel === 'products-sections' ? 'Product Sections' : 'Material Sections';
      model.section = { id: 'collection-sections', label: collection?.title ? `${collection.title} ${label}` : label, kind: 'array' };
      model.sectionValue = this.sectionEntriesForCurrentLevel();
      model.showViewToggle = false;
      return model;
    }

    if (this.state.currentLevel === 'products-export') {
      model.section = { id: 'export', label: 'Export / Package', kind: 'export' };
      model.showViewToggle = false;
      model.exportPayload = {
        warnings: this.state.exportWarnings,
        summary: this.exportSummaryStats(),
        jsonText: JSON.stringify(this.state.generatedPackageData || {}, null, 2),
      };
      model.overviewWarnings = this.state.exportWarnings;
      return model;
    }

    if (this.state.currentLevel === 'general-entries' || this.state.currentLevel === 'products-entries' || this.state.currentLevel === 'materials-entries') {
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
      return model;
    }

    model.section = { id: 'overview', label: 'Workspace', kind: 'overview' };
    model.overviewStats = [];
    model.showViewToggle = false;
    return model;
  }

  exportSummaryStats() {
    const generated = this.state.generatedPackageData;
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
      currentOrganizationId: this.state.currentOrganizationId,
      statusText: this.state.statusText,
    });
  }

  renderBrowser() {
    this.dom.sectionBrowser.update(this.browserModel());
  }

  renderInspector() {
    this.syncInspectorPlacement();

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
      this.createNewCollection('products');
      return;
    }
    if (actionId === 'new-material-collection') {
      this.createNewCollection('materials');
      return;
    }
    if (actionId === 'open-product-collection-file') {
      await this.openCollectionFile('products');
      return;
    }
    if (actionId === 'open-material-collection-file') {
      await this.openCollectionFile('materials');
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
    if (actionId === 'open-selected-collection') {
      this.openSelectedCollection();
      return;
    }
    if (actionId === 'open-section') {
      this.openSelectedSection();
      return;
    }
    if (actionId === 'generate-export') {
      this.refreshExportSnapshot();
      this.setStatus(this.state.exportWarnings.length > 0
        ? `Generated export with ${this.state.exportWarnings.length} warning${this.state.exportWarnings.length === 1 ? '' : 's'}.`
        : 'Generated package export.');
      this.renderBrowser();
      return;
    }
    if (actionId === 'download-export') {
      await this.downloadGeneratedExport();
    }
  }

  openSelectedCollection() {
    const entries = this.currentListEntries();
    const index = Number(this.state.selectedEntryRef?.index);
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
      return;
    }
    const selected = entries[index];
    if (!selected) {
      return;
    }

    if (this.state.activeWorkspace === 'products') {
      this.state.selectedProductCollectionId = selected.id;
      this.state.currentLevel = 'products-sections';
    } else if (this.state.activeWorkspace === 'materials') {
      this.state.selectedMaterialCollectionId = selected.id;
      this.state.currentLevel = 'materials-sections';
    }

    this.state.selectedEntryRef = null;
    this.state.activeSectionId = null;
    this.refreshAll();
  }

  openSelectedSection() {
    const entries = this.sectionEntriesForCurrentLevel();
    const index = Number(this.state.selectedEntryRef?.index);
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
    this.state.manufacturer = {
      ...createEmptyManufacturerSource(),
      fileName: 'manufacturer_info.json',
      data: createManufacturerTemplate(),
      dirty: true,
    };
    this.state.currentLevel = 'general-sections';
    this.state.activeSectionId = null;
    this.state.selectedEntryRef = null;
    this.setStatus('Created a new manufacturer source template.');
    this.refreshAll();
  }

  createNewCollection(workspace) {
    const collection = makeCollectionRecord(
      workspace,
      createCollectionTemplate(workspace),
      this.state.currentOrganizationId,
      null,
      workspace === 'products' ? 'product-collection.json' : 'material-collection.json',
    );
    collection.dirty = true;

    if (workspace === 'products') {
      this.state.productCollections = [...this.state.productCollections, collection];
      this.state.selectedProductCollectionId = collection.id;
      this.state.activeWorkspace = 'products';
      this.state.currentLevel = 'products-sections';
    } else {
      this.state.materialCollections = [...this.state.materialCollections, collection];
      this.state.selectedMaterialCollectionId = collection.id;
      this.state.activeWorkspace = 'materials';
      this.state.currentLevel = 'materials-sections';
    }

    this.state.activeSectionId = null;
    this.state.selectedEntryRef = null;
    this.setStatus(`Created a new ${workspace === 'products' ? 'product' : 'material'} collection.`);
    this.refreshAll();
  }

  async openManufacturerFile() {
    this.state.pendingOpenTarget = { type: 'manufacturer' };
    await this.openJsonPicker();
  }

  async openCollectionFile(workspace) {
    this.state.pendingOpenTarget = { type: 'collection', workspace };
    await this.openJsonPicker();
  }

  async openJsonPicker() {
    try {
      if (typeof window.showOpenFilePicker === 'function') {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'JSON files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });

        if (!handle) {
          return;
        }

        const file = await handle.getFile();
        await this.handleOpenedFile(file, handle);
        return;
      }

      this.dom.openFileInput.click();
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
        this.state.manufacturer = {
          fileHandle: handle,
          fileName: file.name || (handle?.name || 'manufacturer_info.json'),
          data: parsed,
          dirty: false,
          validation: validateDataRoot('general', parsed),
        };
        this.state.activeWorkspace = 'general';
        this.state.currentLevel = 'general-sections';
        this.state.activeSectionId = null;
        this.state.selectedEntryRef = null;
        this.setStatus(`Opened manufacturer source ${this.state.manufacturer.fileName}.`);
      }

      if (pending.type === 'collection') {
        const workspace = pending.workspace;
        const collection = makeCollectionRecord(
          workspace,
          parsed,
          this.state.currentOrganizationId,
          handle,
          file.name || (handle?.name || `${workspace}-collection.json`),
        );

        if (workspace === 'products') {
          const existingIndex = this.state.productCollections.findIndex((entry) => entry.id === collection.id);
          if (existingIndex >= 0) {
            this.state.productCollections[existingIndex] = collection;
          } else {
            this.state.productCollections = [...this.state.productCollections, collection];
          }
          this.state.selectedProductCollectionId = collection.id;
          this.state.activeWorkspace = 'products';
          this.state.currentLevel = 'products-sections';
        } else {
          const existingIndex = this.state.materialCollections.findIndex((entry) => entry.id === collection.id);
          if (existingIndex >= 0) {
            this.state.materialCollections[existingIndex] = collection;
          } else {
            this.state.materialCollections = [...this.state.materialCollections, collection];
          }
          this.state.selectedMaterialCollectionId = collection.id;
          this.state.activeWorkspace = 'materials';
          this.state.currentLevel = 'materials-sections';
        }

        this.state.activeSectionId = null;
        this.state.selectedEntryRef = null;
        this.setStatus(`Opened ${workspace} collection ${collection.title}.`);
      }

      this.refreshAll();
    } catch (error) {
      this.setStatus(`Open failed: ${error.message}`);
    }
  }
  async saveManufacturer() {
    if (!isPlainObject(this.state.manufacturer.data)) {
      this.setStatus('No manufacturer source loaded.');
      return;
    }

    try {
      const text = `${JSON.stringify(this.state.manufacturer.data, null, 2)}\n`;
      if (this.state.manufacturer.fileHandle && typeof this.state.manufacturer.fileHandle.createWritable === 'function') {
        await this.writeToHandle(this.state.manufacturer.fileHandle, text);
      } else {
        await this.saveTextAsFile(text, this.state.manufacturer.fileName || 'manufacturer_info.json');
      }
      this.state.manufacturer.dirty = false;
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
      ? this.state.productCollections.find((entry) => entry.id === this.state.selectedProductCollectionId)
      : this.state.materialCollections.find((entry) => entry.id === this.state.selectedMaterialCollectionId);

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
      collection.dirty = false;
      this.setStatus(`${workspace === 'products' ? 'Product' : 'Material'} collection saved.`);
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
      const text = `${JSON.stringify(this.state.generatedPackageData || {}, null, 2)}\n`;
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
    if (typeof window.showSaveFilePicker === 'function') {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'JSON files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });
      if (!handle) {
        return;
      }
      await this.writeToHandle(handle, text);
      return;
    }

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async writeToHandle(handle, text) {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  applyEntryChange(detail) {
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
    context.owner.dirty = true;
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
    context.owner.dirty = true;
    this.refreshAll();
  }
}

if (!customElements.get('open-configurator-manager')) {
  customElements.define('open-configurator-manager', OpenConfiguratorManagerElement);
}

export { OpenConfiguratorManagerElement };
