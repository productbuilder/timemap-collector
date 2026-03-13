import { configuratorInspectorStyles } from '../css/inspector.css.js';

function cloneJson(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function typeOfValue(value) {
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

function getByPath(source, path) {
  if (!source || !path) {
    return undefined;
  }
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return acc[key];
    }
    return undefined;
  }, source);
}

function setByPath(source, path, value) {
  if (!source || typeof source !== 'object' || !path) {
    return;
  }
  const parts = path.split('.');
  let current = source;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

class OpenConfiguratorInspectorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.model = {
      section: null,
      entryRef: null,
      entryValue: null,
      relationOptions: {},
      relationFieldTargets: {},
      entryWarnings: [],
    };
    this.entryDraft = null;
  }

  connectedCallback() {
    this.render();
    this.applyView();
  }

  setData(data = {}) {
    this.model = { ...this.model, ...data };
    this.entryDraft = this.model.entryValue === undefined ? undefined : cloneJson(this.model.entryValue);
    this.applyView();
  }

  dispatch(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  emitEntryChange() {
    if (!this.model.section || this.entryDraft === undefined) {
      return;
    }
    this.dispatch('entry-change', {
      sectionId: this.model.section.id,
      entryRef: this.model.entryRef,
      value: cloneJson(this.entryDraft),
    });
  }

  parseJsonField(textValue) {
    const raw = String(textValue || '').trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }

  relationTargetForField(fieldKey) {
    const map = this.model.relationFieldTargets || {};
    return map[fieldKey] || '';
  }

  relationOptionsForTarget(target) {
    const source = this.model.relationOptions || {};
    return Array.isArray(source[target]) ? source[target] : [];
  }

  relationOptionsMarkup(target, selectedValues = [], includeBlank = false) {
    const options = this.relationOptionsForTarget(target);
    const selectedSet = new Set((selectedValues || []).map((value) => String(value)));
    const mapped = options.map((entry) => {
      const selected = selectedSet.has(String(entry.value)) ? 'selected' : '';
      return `<option value="${escapeHtml(entry.value)}" ${selected}>${escapeHtml(entry.label)}</option>`;
    }).join('');
    if (includeBlank) {
      return `<option value=""></option>${mapped}`;
    }
    return mapped;
  }

  bindCommonFieldEvents() {
    this.shadowRoot.querySelectorAll('[data-path]').forEach((node) => {
      const encodedPath = node.getAttribute('data-path') || '';
      const path = encodedPath ? decodeURIComponent(encodedPath) : '';
      const kind = node.getAttribute('data-kind') || 'string';
      if (!path) {
        return;
      }

      if (kind === 'boolean') {
        node.addEventListener('change', () => {
          setByPath(this.entryDraft, path, Boolean(node.checked));
          this.emitEntryChange();
        });
        return;
      }

      if (kind === 'relation-multi') {
        node.addEventListener('change', () => {
          const values = Array.from(node.selectedOptions || []).map((option) => option.value).filter(Boolean);
          setByPath(this.entryDraft, path, values);
          this.emitEntryChange();
        });
        return;
      }

      node.addEventListener('change', () => {
        try {
          if (kind === 'number') {
            const nextValue = String(node.value || '').trim();
            setByPath(this.entryDraft, path, nextValue === '' ? 0 : Number(nextValue));
          } else if (kind === 'json') {
            setByPath(this.entryDraft, path, this.parseJsonField(node.value));
          } else {
            setByPath(this.entryDraft, path, node.value);
          }
          node.classList.remove('invalid');
          this.emitEntryChange();
        } catch (error) {
          node.classList.add('invalid');
        }
      });
    });
  }

  bindObjectFieldEvents() {
    this.shadowRoot.querySelectorAll('[data-field-key]').forEach((node) => {
      const encoded = node.getAttribute('data-field-key') || '';
      const key = encoded ? decodeURIComponent(encoded) : '';
      const kind = node.getAttribute('data-field-kind') || 'string';
      if (!key || !this.entryDraft || typeof this.entryDraft !== 'object' || Array.isArray(this.entryDraft)) {
        return;
      }

      if (kind === 'boolean') {
        node.addEventListener('change', () => {
          this.entryDraft[key] = Boolean(node.checked);
          this.emitEntryChange();
        });
        return;
      }

      if (kind === 'relation-multi') {
        node.addEventListener('change', () => {
          this.entryDraft[key] = Array.from(node.selectedOptions || []).map((option) => option.value).filter(Boolean);
          this.emitEntryChange();
        });
        return;
      }

      node.addEventListener('change', () => {
        try {
          if (kind === 'number') {
            const nextValue = String(node.value || '').trim();
            this.entryDraft[key] = nextValue === '' ? 0 : Number(nextValue);
          } else if (kind === 'json') {
            this.entryDraft[key] = this.parseJsonField(node.value);
          } else {
            this.entryDraft[key] = node.value;
          }
          node.classList.remove('invalid');
          this.emitEntryChange();
        } catch (error) {
          node.classList.add('invalid');
        }
      });
    });
  }

  bindPrimitiveEvents() {
    const primitive = this.shadowRoot.getElementById('primitiveValueInput');
    if (!primitive) {
      return;
    }
    const kind = primitive.getAttribute('data-primitive-kind') || 'string';
    if (kind === 'boolean') {
      primitive.addEventListener('change', () => {
        this.entryDraft = Boolean(primitive.checked);
        this.emitEntryChange();
      });
      return;
    }
    primitive.addEventListener('change', () => {
      try {
        if (kind === 'number') {
          const nextValue = String(primitive.value || '').trim();
          this.entryDraft = nextValue === '' ? 0 : Number(nextValue);
        } else if (kind === 'json') {
          this.entryDraft = this.parseJsonField(primitive.value);
        } else {
          this.entryDraft = primitive.value;
        }
        primitive.classList.remove('invalid');
        this.emitEntryChange();
      } catch (error) {
        primitive.classList.add('invalid');
      }
    });
  }

  bindConfigurationEvents() {
    this.bindCommonFieldEvents();
    this.shadowRoot.getElementById('addInstanceBtn')?.addEventListener('click', () => {
      if (!Array.isArray(this.entryDraft.instances)) {
        this.entryDraft.instances = [];
      }
      this.entryDraft.instances.push({
        id: `instance-${this.entryDraft.instances.length + 1}`,
        blockId: '',
      });
      this.emitEntryChange();
      this.applyView();
    });

    this.shadowRoot.querySelectorAll('[data-instance-remove-index]').forEach((node) => {
      node.addEventListener('click', () => {
        const index = Number(node.getAttribute('data-instance-remove-index'));
        if (!Number.isInteger(index) || !Array.isArray(this.entryDraft.instances)) {
          return;
        }
        this.entryDraft.instances.splice(index, 1);
        this.emitEntryChange();
        this.applyView();
      });
    });

    this.shadowRoot.querySelectorAll('[data-instance-block-index]').forEach((node) => {
      node.addEventListener('change', () => {
        const index = Number(node.getAttribute('data-instance-block-index'));
        if (!Number.isInteger(index) || !Array.isArray(this.entryDraft.instances) || !this.entryDraft.instances[index]) {
          return;
        }
        this.entryDraft.instances[index].blockId = node.value;
        this.emitEntryChange();
      });
    });

    this.shadowRoot.querySelectorAll('[data-instance-json-index]').forEach((node) => {
      node.addEventListener('change', () => {
        const index = Number(node.getAttribute('data-instance-json-index'));
        if (!Number.isInteger(index) || !Array.isArray(this.entryDraft.instances)) {
          return;
        }
        try {
          const parsed = this.parseJsonField(node.value);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Instance JSON must be an object.');
          }
          this.entryDraft.instances[index] = parsed;
          node.classList.remove('invalid');
          this.emitEntryChange();
          this.applyView();
        } catch (error) {
          node.classList.add('invalid');
        }
      });
    });
  }

  warningBlockMarkup() {
    const warnings = Array.isArray(this.model.entryWarnings) ? this.model.entryWarnings : [];
    if (warnings.length === 0) {
      return '';
    }
    return `
      <div class="warning-box">
        <strong>Entry warnings</strong>
        <ul>${warnings.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </div>
    `;
  }

  objectFieldsMarkup(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const keys = Object.keys(source);
    if (keys.length === 0) {
      return '<div class="empty">This entry is empty.</div>';
    }

    return keys.map((key) => {
      const fieldValue = source[key];
      const kind = typeOfValue(fieldValue);
      const encodedKey = encodeURIComponent(key);
      const safeKey = escapeHtml(key);
      const relationTarget = this.relationTargetForField(key);
      const relationOptions = relationTarget ? this.relationOptionsForTarget(relationTarget) : [];

      if (kind === 'boolean') {
        return `
          <label class="checkbox">
            <input data-field-key="${encodedKey}" data-field-kind="boolean" type="checkbox" ${fieldValue ? 'checked' : ''} />
            <span>${safeKey}</span>
          </label>
        `;
      }

      if (relationTarget && Array.isArray(fieldValue)) {
        const selectedValues = fieldValue.map((value) => String(value));
        return `
          <div class="field">
            <label for="field-${encodedKey}">${safeKey}</label>
            <select id="field-${encodedKey}" data-field-key="${encodedKey}" data-field-kind="relation-multi" multiple size="6">
              ${this.relationOptionsMarkup(relationTarget, selectedValues, false)}
            </select>
            <p class="hint">Reference list (${relationOptions.length} options)</p>
          </div>
        `;
      }

      if (relationTarget && (kind === 'string' || kind === 'number')) {
        const selectedValues = [String(fieldValue ?? '')];
        return `
          <div class="field">
            <label for="field-${encodedKey}">${safeKey}</label>
            <select id="field-${encodedKey}" data-field-key="${encodedKey}" data-field-kind="string">
              ${this.relationOptionsMarkup(relationTarget, selectedValues, true)}
            </select>
          </div>
        `;
      }

      if (kind === 'number') {
        return `
          <div class="field">
            <label for="field-${encodedKey}">${safeKey}</label>
            <input id="field-${encodedKey}" data-field-key="${encodedKey}" data-field-kind="number" type="number" value="${escapeHtml(fieldValue)}" />
          </div>
        `;
      }

      if (kind === 'array' || kind === 'object' || kind === 'null') {
        return `
          <div class="field">
            <label for="field-${encodedKey}">${safeKey}</label>
            <textarea id="field-${encodedKey}" data-field-key="${encodedKey}" data-field-kind="json">${escapeHtml(JSON.stringify(fieldValue, null, 2))}</textarea>
            <p class="hint">JSON value</p>
          </div>
        `;
      }

      return `
        <div class="field">
          <label for="field-${encodedKey}">${safeKey}</label>
          <input id="field-${encodedKey}" data-field-key="${encodedKey}" data-field-kind="string" type="text" value="${escapeHtml(String(fieldValue || ''))}" />
        </div>
      `;
    }).join('');
  }

  primitiveMarkup(value) {
    const kind = typeOfValue(value);
    if (kind === 'boolean') {
      return `
        <label class="checkbox">
          <input id="primitiveValueInput" data-primitive-kind="boolean" type="checkbox" ${value ? 'checked' : ''} />
          <span>Value</span>
        </label>
      `;
    }
    if (kind === 'number') {
      return `
        <div class="field">
          <label for="primitiveValueInput">Value</label>
          <input id="primitiveValueInput" data-primitive-kind="number" type="number" value="${value}" />
        </div>
      `;
    }
    if (kind === 'array' || kind === 'object' || kind === 'null') {
      return `
        <div class="field">
          <label for="primitiveValueInput">Value</label>
          <textarea id="primitiveValueInput" data-primitive-kind="json">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
          <p class="hint">JSON value</p>
        </div>
      `;
    }
    return `
      <div class="field">
        <label for="primitiveValueInput">Value</label>
        <input id="primitiveValueInput" data-primitive-kind="string" type="text" value="${escapeHtml(String(value || ''))}" />
      </div>
    `;
  }

  blockEditorMarkup() {
    const entry = this.entryDraft && typeof this.entryDraft === 'object' ? this.entryDraft : {};
    const preview = String(entry.thumbnailUrl || entry.previewUrl || entry.imageUrl || entry.image || '').trim();
    const width = getByPath(entry, 'dimensions.width') ?? entry.width ?? '';
    const height = getByPath(entry, 'dimensions.height') ?? entry.height ?? '';
    const depth = getByPath(entry, 'dimensions.depth') ?? entry.depth ?? '';
    const categoryIds = Array.isArray(entry.categoryIds) ? entry.categoryIds.map((value) => String(value)) : [];
    const materialIds = Array.isArray(entry.materialIds) ? entry.materialIds.map((value) => String(value)) : [];
    const meshIds = Array.isArray(entry.meshIds) ? entry.meshIds.map((value) => String(value)) : [];

    return `
      ${this.warningBlockMarkup()}
      ${preview ? `<div class="preview"><img src="${escapeHtml(preview)}" alt="Block preview" /></div>` : ''}

      <div class="field"><label for="block-id">id</label><input id="block-id" data-path="${encodeURIComponent('id')}" data-kind="string" type="text" value="${escapeHtml(entry.id || '')}" /></div>
      <div class="field"><label for="block-title">title</label><input id="block-title" data-path="${encodeURIComponent('title')}" data-kind="string" type="text" value="${escapeHtml(entry.title || '')}" /></div>
      <div class="field"><label for="block-name">name</label><input id="block-name" data-path="${encodeURIComponent('name')}" data-kind="string" type="text" value="${escapeHtml(entry.name || '')}" /></div>
      <div class="field"><label for="block-description">description</label><textarea id="block-description" data-path="${encodeURIComponent('description')}" data-kind="string">${escapeHtml(entry.description || '')}</textarea></div>

      <div class="field"><label for="block-categoryId">categoryId</label>
        <select id="block-categoryId" data-path="${encodeURIComponent('categoryId')}" data-kind="string">
          ${this.relationOptionsMarkup('categories', [String(entry.categoryId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-meshId">meshId</label>
        <select id="block-meshId" data-path="${encodeURIComponent('meshId')}" data-kind="string">
          ${this.relationOptionsMarkup('meshes', [String(entry.meshId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-materialId">materialId</label>
        <select id="block-materialId" data-path="${encodeURIComponent('materialId')}" data-kind="string">
          ${this.relationOptionsMarkup('materials', [String(entry.materialId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-textureId">textureId</label>
        <select id="block-textureId" data-path="${encodeURIComponent('textureId')}" data-kind="string">
          ${this.relationOptionsMarkup('textures', [String(entry.textureId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-gltfId">gltfId</label>
        <select id="block-gltfId" data-path="${encodeURIComponent('gltfId')}" data-kind="string">
          ${this.relationOptionsMarkup('gltfs', [String(entry.gltfId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-connectorTypeId">connectorTypeId</label>
        <select id="block-connectorTypeId" data-path="${encodeURIComponent('connectorTypeId')}" data-kind="string">
          ${this.relationOptionsMarkup('connectorTypes', [String(entry.connectorTypeId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="block-connectionTypeId">connectionTypeId</label>
        <select id="block-connectionTypeId" data-path="${encodeURIComponent('connectionTypeId')}" data-kind="string">
          ${this.relationOptionsMarkup('connectionTypes', [String(entry.connectionTypeId || '')], true)}
        </select>
      </div>

      <div class="field"><label for="block-categoryIds">categoryIds</label>
        <select id="block-categoryIds" data-path="${encodeURIComponent('categoryIds')}" data-kind="relation-multi" multiple size="5">
          ${this.relationOptionsMarkup('categories', categoryIds, false)}
        </select>
      </div>
      <div class="field"><label for="block-materialIds">materialIds</label>
        <select id="block-materialIds" data-path="${encodeURIComponent('materialIds')}" data-kind="relation-multi" multiple size="5">
          ${this.relationOptionsMarkup('materials', materialIds, false)}
        </select>
      </div>
      <div class="field"><label for="block-meshIds">meshIds</label>
        <select id="block-meshIds" data-path="${encodeURIComponent('meshIds')}" data-kind="relation-multi" multiple size="5">
          ${this.relationOptionsMarkup('meshes', meshIds, false)}
        </select>
      </div>

      <div class="field-group">
        <p class="group-title">Dimensions</p>
        <div class="field three">
          <div class="field">
            <label for="block-width">width</label>
            <input id="block-width" data-path="${encodeURIComponent('dimensions.width')}" data-kind="number" type="number" value="${escapeHtml(width)}" />
          </div>
          <div class="field">
            <label for="block-height">height</label>
            <input id="block-height" data-path="${encodeURIComponent('dimensions.height')}" data-kind="number" type="number" value="${escapeHtml(height)}" />
          </div>
          <div class="field">
            <label for="block-depth">depth</label>
            <input id="block-depth" data-path="${encodeURIComponent('dimensions.depth')}" data-kind="number" type="number" value="${escapeHtml(depth)}" />
          </div>
        </div>
      </div>
    `;
  }

  configurationEditorMarkup() {
    const entry = this.entryDraft && typeof this.entryDraft === 'object' ? this.entryDraft : {};
    const blockIds = Array.isArray(entry.blockIds) ? entry.blockIds.map((value) => String(value)) : [];
    const instances = Array.isArray(entry.instances) ? entry.instances : [];
    const instanceMarkup = instances.map((instance, index) => `
      <article class="instance-card">
        <div class="instance-head">
          <strong>Instance ${index + 1}</strong>
          <button class="btn tiny danger" type="button" data-instance-remove-index="${index}">Remove</button>
        </div>
        <div class="field">
          <label for="instance-block-${index}">blockId</label>
          <select id="instance-block-${index}" data-instance-block-index="${index}">
            ${this.relationOptionsMarkup('blocks', [String(instance?.blockId || '')], true)}
          </select>
        </div>
        <div class="field">
          <label for="instance-json-${index}">instance JSON</label>
          <textarea id="instance-json-${index}" data-instance-json-index="${index}">${escapeHtml(JSON.stringify(instance || {}, null, 2))}</textarea>
        </div>
      </article>
    `).join('');

    return `
      ${this.warningBlockMarkup()}
      <div class="field"><label for="config-id">id</label><input id="config-id" data-path="${encodeURIComponent('id')}" data-kind="string" type="text" value="${escapeHtml(entry.id || '')}" /></div>
      <div class="field"><label for="config-title">title</label><input id="config-title" data-path="${encodeURIComponent('title')}" data-kind="string" type="text" value="${escapeHtml(entry.title || '')}" /></div>
      <div class="field"><label for="config-name">name</label><input id="config-name" data-path="${encodeURIComponent('name')}" data-kind="string" type="text" value="${escapeHtml(entry.name || '')}" /></div>
      <div class="field"><label for="config-description">description</label><textarea id="config-description" data-path="${encodeURIComponent('description')}" data-kind="string">${escapeHtml(entry.description || '')}</textarea></div>
      <label class="checkbox"><input data-path="${encodeURIComponent('active')}" data-kind="boolean" type="checkbox" ${entry.active ? 'checked' : ''} /><span>active</span></label>

      <div class="field"><label for="config-blockId">blockId</label>
        <select id="config-blockId" data-path="${encodeURIComponent('blockId')}" data-kind="string">
          ${this.relationOptionsMarkup('blocks', [String(entry.blockId || '')], true)}
        </select>
      </div>
      <div class="field"><label for="config-blockIds">blockIds</label>
        <select id="config-blockIds" data-path="${encodeURIComponent('blockIds')}" data-kind="relation-multi" multiple size="6">
          ${this.relationOptionsMarkup('blocks', blockIds, false)}
        </select>
      </div>

      <div class="field-group">
        <div class="group-head">
          <p class="group-title">Instances</p>
          <button class="btn tiny" id="addInstanceBtn" type="button">Add instance</button>
        </div>
        ${instanceMarkup || '<div class="empty">No instances yet.</div>'}
      </div>
    `;
  }

  applyView() {
    const title = this.shadowRoot.getElementById('inspectorTitle');
    const context = this.shadowRoot.getElementById('inspectorContext');
    const body = this.shadowRoot.getElementById('inspectorBody');
    if (!title || !context || !body) {
      return;
    }

    const section = this.model.section;
    if (!section || section.id === 'overview') {
      title.textContent = 'Inspector';
      context.textContent = 'Select a section entry to edit.';
      body.innerHTML = '<div class="empty">Choose an entry from the center panel to edit its values.</div>';
      return;
    }

    if (this.entryDraft === undefined) {
      title.textContent = section.label;
      context.textContent = 'No entry selected.';
      body.innerHTML = '<div class="empty">Select an entry to edit.</div>';
      return;
    }

    const ref = this.model.entryRef || {};
    const contextLabel = typeof ref.key === 'string'
      ? `Key: ${ref.key}`
      : Number.isInteger(ref.index)
        ? `Entry ${ref.index + 1}`
        : 'Section object';
    title.textContent = section.label;
    context.textContent = contextLabel;

    if (section.id === 'configurations' && this.entryDraft && typeof this.entryDraft === 'object' && !Array.isArray(this.entryDraft)) {
      body.innerHTML = this.configurationEditorMarkup();
      this.bindConfigurationEvents();
      return;
    }

    if (section.id === 'blocks' && this.entryDraft && typeof this.entryDraft === 'object' && !Array.isArray(this.entryDraft)) {
      body.innerHTML = this.blockEditorMarkup();
      this.bindCommonFieldEvents();
      return;
    }

    if (this.entryDraft && typeof this.entryDraft === 'object' && !Array.isArray(this.entryDraft)) {
      body.innerHTML = `${this.warningBlockMarkup()}${this.objectFieldsMarkup(this.entryDraft)}`;
      this.bindObjectFieldEvents();
      return;
    }

    body.innerHTML = `${this.warningBlockMarkup()}${this.primitiveMarkup(this.entryDraft)}`;
    this.bindPrimitiveEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${configuratorInspectorStyles}</style>
      <section class="panel" aria-label="Entry inspector">
        <header class="head">
          <h2 id="inspectorTitle" class="title">Inspector</h2>
          <p id="inspectorContext" class="context">Select a section entry to edit.</p>
        </header>
        <div id="inspectorBody" class="body">
          <div class="empty">Choose an entry from the center panel to edit its values.</div>
        </div>
      </section>
    `;
  }
}

if (!customElements.get('open-configurator-inspector')) {
  customElements.define('open-configurator-inspector', OpenConfiguratorInspectorElement);
}

export { OpenConfiguratorInspectorElement };
