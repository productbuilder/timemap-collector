import { validateCollectionShape } from '../../../packages/collector-schema/src/schema.js';
import {
  PROVIDER_AVAILABILITY,
  READ_ONLY_CAPABILITIES,
  READ_WRITE_CAPABILITIES,
  cloneItem,
  createProviderDescriptor,
  mergeItem,
  providerNotConnectedError,
} from '../../provider-core/src/provider.js';

const DEFAULT_SOURCE_PATH = '/site/examples/demo-host/collections.json';

export function createLocalProvider() {
  // Host model: selected directory handle = host root containing collections.json.
  // Each collection lives in its own child directory with collection.json and files beside it.
  let connected = false;
  let sourcePath = DEFAULT_SOURCE_PATH;
  let connectionMode = 'http';
  let rootDirectoryHandle = null;
  let rootDirectoryLabel = '';
  let collections = [];
  let itemsById = new Map();
  let itemLocations = new Map();
  let capabilities = READ_ONLY_CAPABILITIES;

  const descriptor = createProviderDescriptor({
    id: 'local',
    label: 'Local folder host',
    category: 'builtin',
    availability: PROVIDER_AVAILABILITY.available,
    description: 'Connect a local host root folder and manage writable collections via the File System Access API.',
    statusLabel: 'Available',
    capabilities: READ_WRITE_CAPABILITIES,
  });

  function hostLabelFromPath(path) {
    const normalized = String(path || '').replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) {
      return 'Local host';
    }
    const file = parts[parts.length - 1] || '';
    const dir = file.endsWith('.json') ? (parts[parts.length - 2] || '') : file;
    return dir || 'Local host';
  }

  function toAbsoluteUrl(path, basePath) {
    const raw = String(path || '').trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      return new URL(raw).toString();
    }
    if (raw.startsWith('/')) {
      return new URL(raw, window.location.origin).toString();
    }
    return new URL(raw, basePath).toString();
  }

  function toRelativePath(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search || ''}`;
    } catch (error) {
      return url;
    }
  }

  function collectionIdFromValue(value, fallback = 'collection') {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || fallback;
  }

  function toCollectionSummary(collection) {
    return {
      id: collection.id,
      title: collection.title,
      description: collection.description || '',
      license: collection.license || '',
      publisher: collection.publisher || '',
      language: collection.language || '',
      rootPath: collection.rootPath,
      path: collection.directoryName,
      manifest: collection.manifestPath,
      collectionJsonPath: collection.manifestPath,
      updatedAt: collection.updatedAt || '',
    };
  }

  function normalizeCollectionRecord(manifest, options = {}) {
    const fallbackId = options.fallbackId || options.directoryName || options.fallbackTitle || 'collection';
    const collectionId = collectionIdFromValue(manifest.id || fallbackId, 'collection');
    const collectionTitle = String(manifest.title || options.fallbackTitle || collectionId).trim() || collectionId;
    const rootPath = String(
      options.rootPath || manifest.rootPath || `${options.directoryName || collectionId}/`,
    ).trim() || `${options.directoryName || collectionId}/`;
    const directoryName = collectionIdFromValue(options.directoryName || rootPath.split('/')[0] || collectionId, collectionId);
    const manifestPath = String(options.manifestPath || `${directoryName}/collection.json`).trim() || `${directoryName}/collection.json`;

    const normalizedManifest = {
      id: collectionId,
      title: collectionTitle,
      description: String(manifest.description || '').trim(),
      license: String(manifest.license || '').trim(),
      publisher: String(manifest.publisher || '').trim(),
      language: String(manifest.language || '').trim(),
      rootPath,
      items: Array.isArray(manifest.items) ? manifest.items.map((item) => cloneItem(item)) : [],
    };

    return {
      id: collectionId,
      title: collectionTitle,
      description: normalizedManifest.description,
      license: normalizedManifest.license,
      publisher: normalizedManifest.publisher,
      language: normalizedManifest.language,
      rootPath,
      directoryName,
      manifestPath,
      manifestUrl: options.manifestUrl || manifestPath,
      updatedAt: String(options.updatedAt || '').trim(),
      manifest: normalizedManifest,
    };
  }

  function normalizeCollectionManifest(manifest, fallbackId, fallbackTitle, manifestUrl) {
    const relativeManifestUrl = toRelativePath(manifestUrl);
    const record = normalizeCollectionRecord(manifest, {
      fallbackId,
      fallbackTitle,
      rootPath: manifest.rootPath || `${fallbackId || 'collection'}/`,
      manifestPath: relativeManifestUrl,
      manifestUrl,
      directoryName: manifest.rootPath || fallbackId,
    });

    const normalizedItems = (record.manifest.items || []).map((item) => ({
      ...cloneItem(item),
      collectionId: record.id,
      collectionLabel: record.title,
      collectionRootPath: record.rootPath,
      source: item.source || relativeManifestUrl,
    }));

    record.manifest.items = normalizedItems.map((item) => {
      const next = cloneItem(item);
      delete next.collectionId;
      delete next.collectionLabel;
      delete next.collectionRootPath;
      return next;
    });

    return record;
  }

  async function fetchJson(pathOrUrl, basePath = window.location.href) {
    const targetUrl = toAbsoluteUrl(pathOrUrl, basePath);
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${toRelativePath(targetUrl)} (${response.status}).`);
    }
    const json = await response.json();
    return { json, url: targetUrl };
  }

  function resetState() {
    connected = false;
    collections = [];
    itemsById = new Map();
    itemLocations = new Map();
    capabilities = READ_ONLY_CAPABILITIES;
  }

  function canWriteLocalHost() {
    return connectionMode === 'filesystem' && Boolean(rootDirectoryHandle);
  }

  function ensureWritableLocalHost() {
    if (!connected) {
      throw providerNotConnectedError('local');
    }
    if (!canWriteLocalHost()) {
      throw new Error('Connected local source is read-only. Reconnect with a writable folder host.');
    }
  }

  async function ensureDirectoryPermission(handle, mode = 'readwrite') {
    if (!handle || typeof handle.queryPermission !== 'function') {
      return true;
    }
    const initial = await handle.queryPermission({ mode });
    if (initial === 'granted') {
      return true;
    }
    if (initial === 'prompt' && typeof handle.requestPermission === 'function') {
      const requested = await handle.requestPermission({ mode });
      return requested === 'granted';
    }
    return false;
  }

  async function tryGetFileHandle(directoryHandle, fileName) {
    try {
      return await directoryHandle.getFileHandle(fileName);
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  async function getDirectoryByRelativePath(directoryHandle, relativePath, options = {}) {
    const create = options.create === true;
    const parts = String(relativePath || '')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    let current = directoryHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create });
    }
    return current;
  }

  async function readJsonFile(directoryHandle, fileName) {
    const fileHandle = await directoryHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async function readJsonFileIfExists(directoryHandle, fileName) {
    const fileHandle = await tryGetFileHandle(directoryHandle, fileName);
    if (!fileHandle) {
      return null;
    }
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  async function writeJsonFile(directoryHandle, fileName, value) {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(value, null, 2));
    await writable.close();
  }

  async function writeBlobByRelativePath(directoryHandle, relativePath, blob) {
    const parts = String(relativePath || '')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Cannot write file: empty relative path.');
    }
    const fileName = parts.pop();
    const parentPath = parts.join('/');
    const parentDir = parentPath
      ? await getDirectoryByRelativePath(directoryHandle, parentPath, { create: true })
      : directoryHandle;
    const fileHandle = await parentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async function readBlobByRelativePath(directoryHandle, relativePath) {
    const normalized = String(relativePath || '')
      .trim()
      .replace(/^\/+/, '')
      .split('?')[0]
      .split('#')[0];
    const parts = normalized
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    const fileName = parts.pop();
    const parentPath = parts.join('/');
    try {
      const parentDir = parentPath
        ? await getDirectoryByRelativePath(directoryHandle, parentPath, { create: false })
        : directoryHandle;
      const fileHandle = await parentDir.getFileHandle(fileName);
      return await fileHandle.getFile();
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  async function loadCollectionRecordFromRelativeManifestPath(manifestPath, options = {}) {
    const relativePath = String(manifestPath || '').trim().replace(/^\/+/, '');
    if (!relativePath) {
      throw new Error('Collection manifest path is empty.');
    }
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error(`Collection manifest path must include directory and file: ${relativePath}`);
    }
    const fileName = parts.pop();
    const directoryPath = parts.join('/');
    const directoryHandle = await getDirectoryByRelativePath(rootDirectoryHandle, directoryPath, { create: false });
    const manifest = await readJsonFile(directoryHandle, fileName);
    const validationErrors = validateCollectionShape(manifest);
    if (validationErrors.length > 0) {
      throw new Error(`Collection schema invalid for ${relativePath}: ${validationErrors.join(' ')}`);
    }
    return normalizeCollectionRecord(manifest, {
      fallbackId: options.fallbackId || directoryPath.split('/').filter(Boolean).pop() || 'collection',
      fallbackTitle: options.fallbackTitle || options.fallbackId || 'Collection',
      rootPath: options.rootPath || manifest.rootPath || `${directoryPath}/`,
      directoryName: options.directoryName || directoryPath.split('/').filter(Boolean).pop() || directoryPath,
      manifestPath: relativePath,
      updatedAt: options.updatedAt || '',
    });
  }

  async function loadCollectionsFromFilesystem() {
    const loaded = [];
    const indexJson = await readJsonFileIfExists(rootDirectoryHandle, 'collections.json');
    const indexCollections =
      Array.isArray(indexJson)
        ? indexJson
        : Array.isArray(indexJson?.collections)
          ? indexJson.collections
          : [];

    if (indexCollections.length > 0) {
      for (const entry of indexCollections) {
        if (!entry || typeof entry !== 'object') {
          continue;
        }
        const manifestPath = String(
          entry.manifest || entry.collectionJsonPath || (entry.id ? `${entry.id}/collection.json` : ''),
        ).trim();
        if (!manifestPath) {
          continue;
        }
        const pathSegment = String(entry.path || entry.directory || entry.id || '')
          .split('/')
          .filter(Boolean)
          .pop();
        const manifestParts = manifestPath.split('/').filter(Boolean);
        const manifestFolder = manifestParts.length > 1 ? manifestParts[manifestParts.length - 2] : '';
        const folderSegment = pathSegment || manifestFolder;
        const fallbackId = String(entry.id || folderSegment || 'collection').trim();
        try {
          const collection = await loadCollectionRecordFromRelativeManifestPath(manifestPath, {
            fallbackId,
            fallbackTitle: entry.title || fallbackId,
            rootPath: entry.rootPath || `${folderSegment || fallbackId}/`,
            directoryName: folderSegment || fallbackId,
            updatedAt: entry.updatedAt || '',
          });
          loaded.push(collection);
        } catch (error) {
          // Skip stale index entries and allow fallback scanning below.
        }
      }
    }

    if (loaded.length > 0) {
      return loaded;
    }

    for await (const [name, handle] of rootDirectoryHandle.entries()) {
      if (!handle || handle.kind !== 'directory') {
        continue;
      }
      const manifestHandle = await tryGetFileHandle(handle, 'collection.json');
      if (!manifestHandle) {
        continue;
      }
      try {
        const file = await manifestHandle.getFile();
        const text = await file.text();
        const manifest = JSON.parse(text);
        const validationErrors = validateCollectionShape(manifest);
        if (validationErrors.length > 0) {
          continue;
        }
        loaded.push(
          normalizeCollectionRecord(manifest, {
            fallbackId: name,
            fallbackTitle: name,
            rootPath: manifest.rootPath || `${name}/`,
            directoryName: name,
            manifestPath: `${name}/collection.json`,
          }),
        );
      } catch (error) {
        // Skip invalid collection directories during fallback scan.
      }
    }

    return loaded;
  }

  function extensionForFileName(name = '', fallback = '.jpg') {
    const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : fallback;
  }

  function ensureUniqueCollectionId(baseId) {
    if (!collections.some((entry) => entry.id === baseId)) {
      return baseId;
    }
    let index = 2;
    while (collections.some((entry) => entry.id === `${baseId}-${index}`)) {
      index += 1;
    }
    return `${baseId}-${index}`;
  }

  function ensureUniqueItemId(collection, baseId) {
    const existing = new Set((collection.manifest.items || []).map((entry) => entry.id));
    if (!existing.has(baseId)) {
      return baseId;
    }
    let index = 2;
    while (existing.has(`${baseId}-${index}`)) {
      index += 1;
    }
    return `${baseId}-${index}`;
  }

  function findCollection(collectionId) {
    return collections.find((entry) => entry.id === collectionId) || null;
  }

  async function writeCollectionManifest(collection) {
    const directory = await getDirectoryByRelativePath(rootDirectoryHandle, collection.directoryName, { create: true });
    const manifestPayload = {
      id: collection.id,
      title: collection.title,
      description: collection.description || '',
      license: collection.license || '',
      publisher: collection.publisher || '',
      language: collection.language || '',
      rootPath: collection.rootPath,
      items: Array.isArray(collection.manifest.items)
        ? collection.manifest.items.map((item) => cloneItem(item))
        : [],
    };
    await writeJsonFile(directory, 'collection.json', manifestPayload);
    collection.manifest = manifestPayload;
    collection.manifestPath = `${collection.directoryName}/collection.json`;
    collection.updatedAt = new Date().toISOString();
  }

  async function writeCollectionsIndex() {
    const payload = {
      collections: collections.map((collection) => ({
        id: collection.id,
        manifest: collection.manifestPath,
      })),
    };
    await writeJsonFile(rootDirectoryHandle, 'collections.json', payload);
  }

  function providerItemIdFor(collectionId, manifestItemId) {
    for (const [providerItemId, location] of itemLocations.entries()) {
      if (location.collectionId === collectionId && location.manifestItemId === manifestItemId) {
        return providerItemId;
      }
    }
    return null;
  }

  function rebuildIndex() {
    itemsById = new Map();
    itemLocations = new Map();
    for (const collection of collections) {
      const manifestItems = Array.isArray(collection.manifest?.items) ? collection.manifest.items : [];
      for (let index = 0; index < manifestItems.length; index += 1) {
        const manifestItem = manifestItems[index];
        const manifestItemId = String(manifestItem.id || '').trim() || `${collection.id}-item-${index + 1}`;
        manifestItem.id = manifestItemId;

        let providerItemId = manifestItemId;
        if (itemsById.has(providerItemId)) {
          const base = `${collection.id}::${manifestItemId}`;
          providerItemId = base;
          let suffix = 2;
          while (itemsById.has(providerItemId)) {
            providerItemId = `${base}-${suffix}`;
            suffix += 1;
          }
        }

        const normalizedItem = {
          ...cloneItem(manifestItem),
          id: providerItemId,
          collectionId: collection.id,
          collectionLabel: collection.title,
          collectionRootPath: collection.rootPath,
          source: manifestItem.source || collection.manifestPath,
        };

        itemsById.set(providerItemId, normalizedItem);
        itemLocations.set(providerItemId, {
          collectionId: collection.id,
          manifestItemId,
        });
      }
    }
  }

  return {
    ...descriptor,

    getDescriptor() {
      return descriptor;
    },

    async connect(config = {}) {
      sourcePath = String(config.path || sourcePath || DEFAULT_SOURCE_PATH).trim() || DEFAULT_SOURCE_PATH;
      const sourceLabel = String(config.localDirectoryName || '').trim() || hostLabelFromPath(sourcePath);
      const nextDirectoryHandle =
        config.localDirectoryHandle && config.localDirectoryHandle.kind === 'directory'
          ? config.localDirectoryHandle
          : null;

      if (nextDirectoryHandle) {
        try {
          const hasPermission = await ensureDirectoryPermission(nextDirectoryHandle, 'readwrite');
          if (!hasPermission) {
            resetState();
            connectionMode = 'filesystem';
            rootDirectoryHandle = null;
            rootDirectoryLabel = '';
            return {
              ok: false,
              message: 'Local folder permission was not granted.',
              capabilities: READ_ONLY_CAPABILITIES,
            };
          }

          connectionMode = 'filesystem';
          rootDirectoryHandle = nextDirectoryHandle;
          rootDirectoryLabel = sourceLabel || nextDirectoryHandle.name || 'Local host';
          collections = await loadCollectionsFromFilesystem();
          rebuildIndex();
          connected = true;
          capabilities = READ_WRITE_CAPABILITIES;

          return {
            ok: true,
            message: `Connected to local host ${rootDirectoryLabel}.`,
            sourceDisplayLabel: rootDirectoryLabel,
            sourceDetailLabel: `${rootDirectoryLabel} (host root)`,
            capabilities,
            collections: collections.map((collection) => toCollectionSummary(collection)),
          };
        } catch (error) {
          resetState();
          connectionMode = 'filesystem';
          rootDirectoryHandle = null;
          rootDirectoryLabel = '';
          return {
            ok: false,
            message: `Failed to open local host folder: ${error.message}`,
            capabilities: READ_ONLY_CAPABILITIES,
          };
        }
      }

      connectionMode = 'http';
      rootDirectoryHandle = null;
      rootDirectoryLabel = '';

      try {
        const { json, url } = await fetchJson(sourcePath);

        if (Array.isArray(json.collections)) {
          const loadedCollections = [];
          for (const entry of json.collections) {
            if (!entry || typeof entry !== 'object') {
              continue;
            }
            const manifestPath = String(entry.manifest || entry.collectionJsonPath || '').trim();
            if (!manifestPath) {
              continue;
            }
            const { json: manifest, url: manifestUrl } = await fetchJson(manifestPath, url);
            const validationErrors = validateCollectionShape(manifest);
            if (validationErrors.length > 0) {
              throw new Error(`Collection schema invalid for ${manifestPath}: ${validationErrors.join(' ')}`);
            }
            loadedCollections.push(normalizeCollectionManifest(manifest, entry.id || '', entry.title || entry.id || '', manifestUrl));
          }

          collections = loadedCollections;
          rebuildIndex();
          connected = true;
          capabilities = READ_ONLY_CAPABILITIES;
          return {
            ok: true,
            message: `Connected to ${sourcePath}`,
            sourceDisplayLabel: sourceLabel,
            sourceDetailLabel: sourcePath,
            capabilities,
            collections: collections.map((collection) => toCollectionSummary(collection)),
          };
        }

        const validationErrors = validateCollectionShape(json);
        if (validationErrors.length > 0) {
          throw new Error(`Collection schema invalid: ${validationErrors.join(' ')}`);
        }

        collections = [
          normalizeCollectionManifest(
            cloneItem(json),
            json.id || sourceLabel,
            json.title || sourceLabel,
            url,
          ),
        ];
        rebuildIndex();
        connected = true;
        capabilities = READ_ONLY_CAPABILITIES;

        return {
          ok: true,
          message: `Connected to ${sourcePath}`,
          sourceDisplayLabel: sourceLabel,
          sourceDetailLabel: sourcePath,
          capabilities,
          collections: collections.map((collection) => toCollectionSummary(collection)),
        };
      } catch (error) {
        resetState();
        return {
          ok: false,
          message: error.message,
          capabilities: READ_ONLY_CAPABILITIES,
        };
      }
    },

    async listAssets() {
      if (!connected) {
        throw providerNotConnectedError('local');
      }
      return Array.from(itemsById.values()).map(cloneItem);
    },

    async getAsset(id) {
      if (!connected) {
        throw providerNotConnectedError('local');
      }
      return itemsById.has(id) ? cloneItem(itemsById.get(id)) : null;
    },

    async saveMetadata(id, patch) {
      if (!connected) {
        throw providerNotConnectedError('local');
      }

      ensureWritableLocalHost();

      const location = itemLocations.get(id);
      if (!location) {
        return null;
      }

      const collection = findCollection(location.collectionId);
      if (!collection || !Array.isArray(collection.manifest?.items)) {
        return null;
      }

      const itemIndex = collection.manifest.items.findIndex((entry) => entry.id === location.manifestItemId);
      if (itemIndex === -1) {
        return null;
      }

      const existing = collection.manifest.items[itemIndex];
      const updated = mergeItem(existing, patch);
      updated.id = existing.id;
      collection.manifest.items[itemIndex] = cloneItem(updated);
      await writeCollectionManifest(collection);
      await writeCollectionsIndex();
      rebuildIndex();
      return itemsById.has(id) ? cloneItem(itemsById.get(id)) : cloneItem(updated);
    },

    async createCollection(collectionMeta = {}) {
      ensureWritableLocalHost();

      const baseId = collectionIdFromValue(collectionMeta.id || collectionMeta.title || 'collection', 'collection');
      const collectionId = ensureUniqueCollectionId(baseId);
      const directoryName = collectionId;

      const existingDirectory = await getDirectoryByRelativePath(rootDirectoryHandle, directoryName, { create: true });
      const existingManifestHandle = await tryGetFileHandle(existingDirectory, 'collection.json');
      if (existingManifestHandle) {
        throw new Error(`Collection directory ${directoryName} already contains collection.json.`);
      }

      const rootPath = String(collectionMeta.rootPath || `${directoryName}/`).trim() || `${directoryName}/`;
      const title = String(collectionMeta.title || collectionId).trim() || collectionId;
      const record = normalizeCollectionRecord(
        {
          id: collectionId,
          title,
          description: String(collectionMeta.description || '').trim(),
          license: String(collectionMeta.license || '').trim(),
          publisher: String(collectionMeta.publisher || '').trim(),
          language: String(collectionMeta.language || '').trim(),
          rootPath,
          items: [],
        },
        {
          fallbackId: collectionId,
          fallbackTitle: title,
          rootPath,
          directoryName,
          manifestPath: `${directoryName}/collection.json`,
        },
      );

      collections = [...collections, record];
      await writeCollectionManifest(record);
      await writeCollectionsIndex();
      rebuildIndex();
      return { collection: toCollectionSummary(record) };
    },

    async saveCollectionMetadata(collectionId, patch = {}) {
      ensureWritableLocalHost();

      const collection = findCollection(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} was not found in this local host.`);
      }

      collection.title = String(patch.title ?? collection.title).trim() || collection.title;
      collection.description = String(patch.description ?? collection.description).trim();
      collection.license = String(patch.license ?? collection.license).trim();
      collection.publisher = String(patch.publisher ?? collection.publisher).trim();
      collection.language = String(patch.language ?? collection.language).trim();

      collection.manifest.title = collection.title;
      collection.manifest.description = collection.description;
      collection.manifest.license = collection.license;
      collection.manifest.publisher = collection.publisher;
      collection.manifest.language = collection.language;
      collection.manifest.rootPath = collection.rootPath;

      await writeCollectionManifest(collection);
      await writeCollectionsIndex();
      rebuildIndex();
      return { collection: toCollectionSummary(collection) };
    },

    async addAssetToCollection(collectionId, payload = {}) {
      ensureWritableLocalHost();

      const collection = findCollection(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} was not found in this local host.`);
      }

      const originalFile = payload.file;
      if (!originalFile || typeof originalFile.arrayBuffer !== 'function') {
        throw new Error('Cannot add asset: local file payload is missing.');
      }

      const rawItemId = collectionIdFromValue(payload.itemId || payload.id || payload.title || originalFile.name || 'item', 'item');
      const itemId = ensureUniqueItemId(collection, rawItemId);
      const mediaRelativePath = String(payload.mediaPath || `${itemId}${extensionForFileName(originalFile.name, '.jpg')}`)
        .trim()
        .replace(/^\/+/, '');
      const thumbnailRelativePath = payload.thumbnailBlob
        ? String(payload.thumbnailPath || `${itemId}.thumb.jpg`).trim().replace(/^\/+/, '')
        : '';

      await writeBlobByRelativePath(rootDirectoryHandle, `${collection.directoryName}/${mediaRelativePath}`, originalFile);
      if (payload.thumbnailBlob && thumbnailRelativePath) {
        await writeBlobByRelativePath(rootDirectoryHandle, `${collection.directoryName}/${thumbnailRelativePath}`, payload.thumbnailBlob);
      }

      const item = {
        id: itemId,
        title: String(payload.title || itemId).trim() || itemId,
        description: String(payload.description || '').trim(),
        creator: String(payload.creator || '').trim(),
        date: String(payload.date || '').trim(),
        location: String(payload.location || '').trim(),
        license: String(payload.license || '').trim(),
        attribution: String(payload.attribution || '').trim(),
        source: String(payload.source || `${collection.directoryName}/collection.json`).trim(),
        tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
        include: payload.include !== false,
        media: {
          type: String(payload.mediaType || 'image').trim() || 'image',
          url: mediaRelativePath,
          ...(thumbnailRelativePath ? { thumbnailUrl: thumbnailRelativePath } : {}),
        },
      };

      collection.manifest.items = Array.isArray(collection.manifest.items) ? collection.manifest.items : [];
      collection.manifest.items.push(item);

      await writeCollectionManifest(collection);
      await writeCollectionsIndex();
      rebuildIndex();

      const providerItemId = providerItemIdFor(collection.id, item.id) || item.id;
      return itemsById.has(providerItemId)
        ? cloneItem(itemsById.get(providerItemId))
        : {
            ...cloneItem(item),
            id: providerItemId,
            collectionId: collection.id,
            collectionLabel: collection.title,
            collectionRootPath: collection.rootPath,
          };
    },

    async readCollectionFileBlob(collectionId, relativePath) {
      if (!connected) {
        throw providerNotConnectedError('local');
      }
      if (!canWriteLocalHost()) {
        return null;
      }
      const collection = findCollection(collectionId);
      if (!collection) {
        return null;
      }
      const filePath = String(relativePath || '').trim().replace(/^\/+/, '');
      if (!filePath) {
        return null;
      }
      return readBlobByRelativePath(rootDirectoryHandle, `${collection.directoryName}/${filePath}`);
    },

    async exportCollection(collectionMeta) {
      if (!connected) {
        throw providerNotConnectedError('local');
      }

      const items = Array.from(itemsById.values()).map(cloneItem);
      return {
        id: collectionMeta.id,
        title: collectionMeta.title,
        description: collectionMeta.description,
        items,
      };
    },

    getCapabilities() {
      return capabilities;
    },
  };
}
