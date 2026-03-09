import {
  PROVIDER_AVAILABILITY,
  READ_ONLY_CAPABILITIES,
  READ_WRITE_CAPABILITIES,
  cloneItem,
  createProviderDescriptor,
  providerNotConnectedError,
} from '../../provider-core/src/provider.js';
import { validateCollectionShape } from '../../../packages/collector-schema/src/schema.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

function extensionFor(path = '') {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
}

function mediaTypeForPath(path) {
  const ext = extensionFor(path);
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video';
  }
  return null;
}

function itemIdFromPath(path) {
  return path.replace(/\//g, '__');
}

function titleFromPath(path) {
  const file = path.split('/').pop() || path;
  return file.replace(/\.[^.]+$/, '');
}

function asApiPath(path) {
  return path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : '';
}

function asRawPath(path) {
  return path ? path.replace(/^\/+/, '') : '';
}

function joinRepoPath(...parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part).replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean)
    .join('/');
}

function normalizeFolderPath(path = '') {
  const trimmed = String(path).trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return asApiPath(trimmed);
}

function isAbsoluteUrl(value = '') {
  return /^https?:\/\//i.test(value) || /^data:/i.test(value);
}

export function createGithubProvider() {
  let connected = false;
  let token = '';
  let owner = '';
  let repo = '';
  let branch = 'main';
  let contentPath = '';
  let items = [];
  let collection = null;
  let manifestPath = '';
  let manifestSha = '';
  let manifestRootPath = '';
  let hasWriteAccess = false;
  let capabilities = READ_ONLY_CAPABILITIES;

  const descriptor = createProviderDescriptor({
    id: 'github',
    label: 'GitHub',
    category: 'external',
    availability: PROVIDER_AVAILABILITY.available,
    description: 'Connect to a GitHub repository using a Personal Access Token and load media files.',
    statusLabel: 'Available (token auth)',
    capabilities: READ_ONLY_CAPABILITIES,
  });

  function rawUrlForRepoPath(pathValue) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${asRawPath(pathValue)}`;
  }

  function blobUrlForRepoPath(pathValue) {
    return `https://github.com/${owner}/${repo}/blob/${branch}/${asRawPath(pathValue)}`;
  }

  async function fetchRepoContents(pathValue, options = {}) {
    const targetPath = asApiPath(pathValue);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}?ref=${branch}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      if (response.status === 404 && options.allowNotFound) {
        return null;
      }

      const errorBody = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed or repository access denied.');
      }

      if (response.status === 404) {
        const location = targetPath || '/';
        throw new Error(`Repository or path not accessible: ${location}`);
      }

      throw new Error(`GitHub API ${response.status}: ${errorBody.slice(0, 220)}`);
    }

    return response.json();
  }

  async function putRepoContent(pathValue, payload) {
    const targetPath = asApiPath(pathValue);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error('Save failed: insufficient permissions or invalid token.');
      }
      if (response.status === 409 || response.status === 422) {
        throw new Error('Save failed: collection.json changed upstream (SHA conflict). Refresh source and retry.');
      }
      throw new Error(`Save failed: GitHub API ${response.status}: ${errorBody.slice(0, 220)}`);
    }

    return response.json();
  }

  async function detectWriteAccess() {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.json();
    const permissions = body?.permissions || {};
    return Boolean(permissions.push || permissions.maintain || permissions.admin);
  }

  async function decodeContentEntry(entry) {
    if (typeof entry.content === 'string' && entry.encoding === 'base64') {
      const binary = atob(entry.content.replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    if (entry.download_url) {
      const response = await fetch(entry.download_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest content (${response.status}).`);
      }

      return response.text();
    }

    throw new Error('Unable to read collection.json content from GitHub response.');
  }

  function resolveRepoReference(reference, manifestFolderPath) {
    const raw = typeof reference === 'string' ? reference.trim() : '';
    if (!raw || isAbsoluteUrl(raw)) {
      return null;
    }

    if (raw.startsWith('/')) {
      return asApiPath(raw);
    }

    return joinRepoPath(manifestFolderPath, raw);
  }

  function resolveMediaUrl(url, manifestFolderPath) {
    const raw = typeof url === 'string' ? url.trim() : '';
    if (!raw) {
      return '';
    }

    if (isAbsoluteUrl(raw)) {
      return raw;
    }

    const repoPath = resolveRepoReference(raw, manifestFolderPath);
    return repoPath ? rawUrlForRepoPath(repoPath) : raw;
  }

  function resolveSourceUrl(url, manifestFolderPath) {
    const raw = typeof url === 'string' ? url.trim() : '';
    if (!raw) {
      return '';
    }

    if (isAbsoluteUrl(raw)) {
      return raw;
    }

    const repoPath = resolveRepoReference(raw, manifestFolderPath);
    return repoPath ? blobUrlForRepoPath(repoPath) : raw;
  }

  function normalizeManifestItem(item, index, manifestFolderPath) {
    const media = item && typeof item.media === 'object' ? item.media : {};
    const mediaUrl = resolveMediaUrl(media.url, manifestFolderPath);
    const thumbnailUrl = resolveMediaUrl(media.thumbnailUrl, manifestFolderPath);
    const mediaType = (media.type || mediaTypeForPath(media.url || '') || mediaTypeForPath(mediaUrl || '') || 'image')
      .toLowerCase();

    const fallbackId = `manifest_item_${index + 1}`;
    const fallbackTitle =
      titleFromPath(resolveRepoReference(media.url || media.thumbnailUrl || '', manifestFolderPath) || fallbackId) ||
      `Item ${index + 1}`;

    return {
      ...item,
      id: (item.id || '').trim() || fallbackId,
      title: (item.title || '').trim() || fallbackTitle,
      description: item.description || '',
      creator: item.creator || '',
      date: item.date || '',
      location: item.location || '',
      license: item.license || '',
      attribution: item.attribution || '',
      source: resolveSourceUrl(item.source, manifestFolderPath),
      tags: Array.isArray(item.tags) ? item.tags : [],
      include: item.include !== false,
      media: {
        ...media,
        type: mediaType,
        url: mediaUrl,
        thumbnailUrl: thumbnailUrl || (mediaType === 'image' ? mediaUrl : ''),
      },
    };
  }

  async function loadCollectionManifest(rootFolderPath) {
    const manifestPath = joinRepoPath(rootFolderPath, 'collection.json');
    const manifestEntry = await fetchRepoContents(manifestPath, { allowNotFound: true });
    if (!manifestEntry || Array.isArray(manifestEntry) || manifestEntry.type !== 'file') {
      return { found: false, manifestPath };
    }

    const manifestText = await decodeContentEntry(manifestEntry);
    let manifestJson;
    try {
      manifestJson = JSON.parse(manifestText);
    } catch (error) {
      throw new Error(`collection.json could not be parsed: ${error.message}`);
    }

    const validationErrors = validateCollectionShape(manifestJson);
    if (validationErrors.length > 0) {
      throw new Error(`collection.json schema invalid: ${validationErrors.join(' ')}`);
    }

    const normalizedItems = (manifestJson.items || []).map((item, index) =>
      normalizeManifestItem(item, index, rootFolderPath),
    );

    return {
      found: true,
      manifestPath,
      manifestSha: manifestEntry.sha || '',
      manifestRootPath: rootFolderPath,
      rawCollection: cloneItem(manifestJson),
      items: normalizedItems,
    };
  }

  function mergeItemPatch(item, patch) {
    return {
      ...item,
      ...patch,
      tags: Array.isArray(patch.tags) ? patch.tags : item.tags,
      media: {
        ...(item.media || {}),
        ...(patch.media || {}),
      },
    };
  }

  function resetManifestContext() {
    manifestPath = '';
    manifestSha = '';
    manifestRootPath = '';
    hasWriteAccess = false;
  }

  function updateCapabilities() {
    const canWrite = Boolean(token && collection && manifestPath && manifestSha && hasWriteAccess);
    capabilities = canWrite
      ? {
          ...READ_WRITE_CAPABILITIES,
          canUploadAssets: true,
          canPublishCollection: true,
        }
      : {
          ...READ_ONLY_CAPABILITIES,
          canUploadAssets: Boolean(token && owner && repo && hasWriteAccess),
          canPublishCollection: Boolean(token && owner && repo && hasWriteAccess),
        };
  }

  function encodeBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  async function encodeBase64Blob(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  async function listMediaFilesRecursive(pathValue) {
    const entry = await fetchRepoContents(pathValue);

    if (!Array.isArray(entry)) {
      return [];
    }

    const files = [];
    for (const child of entry) {
      if (child.type === 'dir') {
        const nested = await listMediaFilesRecursive(child.path);
        files.push(...nested);
      }

      if (child.type === 'file') {
        const mediaType = mediaTypeForPath(child.path);
        if (!mediaType) {
          continue;
        }

        const rawUrl = rawUrlForRepoPath(child.path);
        files.push({
          id: itemIdFromPath(child.path),
          title: titleFromPath(child.path),
          description: '',
          source: blobUrlForRepoPath(child.path),
          include: true,
          tags: [],
          license: '',
          attribution: owner,
          media: {
            type: mediaType,
            url: rawUrl,
            thumbnailUrl: mediaType === 'image' ? rawUrl : undefined,
          },
        });
      }
    }

    return files;
  }

  return {
    ...descriptor,

    getDescriptor() {
      return descriptor;
    },

    async connect(config = {}) {
      token = (config.token || '').trim();
      owner = (config.owner || '').trim();
      repo = (config.repo || '').trim();
      branch = (config.branch || 'main').trim() || 'main';
      contentPath = normalizeFolderPath(config.path || '');

      if (!token || !owner || !repo) {
        connected = false;
        items = [];
        collection = null;
        resetManifestContext();
        updateCapabilities();
        return {
          ok: false,
          message: 'Enter token, owner, and repository to connect GitHub.',
          capabilities,
        };
      }

      try {
        await fetchRepoContents(contentPath || '');
        const manifestResult = await loadCollectionManifest(contentPath);

        if (manifestResult.found) {
          collection = cloneItem(manifestResult.rawCollection);
          items = manifestResult.items.map(cloneItem);
          manifestPath = manifestResult.manifestPath;
          manifestSha = manifestResult.manifestSha;
          manifestRootPath = manifestResult.manifestRootPath;
          hasWriteAccess = await detectWriteAccess();
        } else {
          collection = null;
          items = await listMediaFilesRecursive(contentPath);
          manifestPath = manifestResult.manifestPath;
          manifestSha = '';
          manifestRootPath = contentPath;
          hasWriteAccess = await detectWriteAccess();
        }

        connected = true;
        updateCapabilities();
        const where = contentPath ? `${owner}/${repo}/${contentPath}` : `${owner}/${repo}/`;
        const message = manifestResult.found
          ? `Connected to GitHub repo ${where}. Found ${manifestResult.manifestPath}, loaded ${items.length} items, and ${
              capabilities.canSaveMetadata ? 'enabled metadata save.' : 'running in read-only mode (no repo write permission).'
            }`
          : `Connected to GitHub repo ${where}. No manifest found at ${manifestResult.manifestPath}; loaded ${items.length} media assets from file browser.`;
        return {
          ok: true,
          message,
          capabilities,
        };
      } catch (error) {
        connected = false;
        items = [];
        collection = null;
        resetManifestContext();
        updateCapabilities();
        return {
          ok: false,
          message: `GitHub connection failed: ${error.message}`,
          capabilities,
        };
      }
    },

    async listAssets() {
      if (!connected) {
        throw providerNotConnectedError('github');
      }
      return items.map(cloneItem);
    },

    async getAsset(id) {
      if (!connected) {
        throw providerNotConnectedError('github');
      }
      const item = items.find((entry) => entry.id === id);
      return item ? cloneItem(item) : null;
    },

    async saveMetadata(id, patch) {
      if (!connected) {
        throw providerNotConnectedError('github');
      }

      if (!capabilities.canSaveMetadata) {
        throw new Error('Save failed: collection manifest is read-only for this GitHub source.');
      }

      if (!collection || !Array.isArray(collection.items)) {
        throw new Error('Save failed: no editable collection manifest loaded.');
      }

      const targetIndex = collection.items.findIndex((entry) => entry.id === id);
      if (targetIndex === -1) {
        throw new Error(`Save failed: item not found in manifest (${id}).`);
      }

      const currentItem = collection.items[targetIndex];
      const nextItem = mergeItemPatch(currentItem, patch || {});

      const nextCollection = cloneItem(collection);
      nextCollection.items[targetIndex] = nextItem;

      const serialized = `${JSON.stringify(nextCollection, null, 2)}\n`;
      const commitMessage = `Update metadata for ${id} via TimeMap Collector`;
      const payload = {
        message: commitMessage,
        content: encodeBase64Utf8(serialized),
        sha: manifestSha,
        branch,
      };

      const response = await putRepoContent(manifestPath, payload);
      const nextSha = response?.content?.sha;
      if (!nextSha) {
        throw new Error('Save failed: missing updated file SHA in GitHub response.');
      }

      collection = nextCollection;
      manifestSha = nextSha;
      items = (collection.items || []).map((entry, index) => normalizeManifestItem(entry, index, manifestRootPath));

      const updated = items.find((entry) => entry.id === id);
      if (!updated) {
        throw new Error(`Save failed: item not found after save (${id}).`);
      }

      return cloneItem(updated);
    },

    async exportCollection(collectionMeta) {
      if (!connected) {
        throw providerNotConnectedError('github');
      }

      return {
        id: collectionMeta.id,
        title: collectionMeta.title,
        description: collectionMeta.description,
        items: items.map(cloneItem),
      };
    },

    async publishCollection(payload = {}) {
      if (!connected) {
        throw providerNotConnectedError('github');
      }

      if (!token || !owner || !repo) {
        throw new Error('Publish failed: connect GitHub with token, owner, and repository.');
      }

      if (!hasWriteAccess) {
        throw new Error('Publish failed: token does not have write access to this repository.');
      }

      const manifest = payload.manifest;
      if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.items)) {
        throw new Error('Publish failed: manifest payload is invalid.');
      }

      const validationErrors = validateCollectionShape(manifest);
      if (validationErrors.length > 0) {
        throw new Error(`Publish failed: manifest validation errors: ${validationErrors.join(' ')}`);
      }

      const uploads = Array.isArray(payload.uploads) ? payload.uploads : [];
      const uploadResults = [];
      for (const entry of uploads) {
        const path = asApiPath(entry?.path || '');
        const blob = entry?.blob || null;
        if (!path || !blob) {
          continue;
        }

        const existing = await fetchRepoContents(path, { allowNotFound: true });
        const nextPayload = {
          message: entry.message || `Upload ${path} via TimeMap Collector`,
          content: await encodeBase64Blob(blob),
          branch,
        };
        if (existing && !Array.isArray(existing) && existing.type === 'file' && existing.sha) {
          nextPayload.sha = existing.sha;
        }

        await putRepoContent(path, nextPayload);
        uploadResults.push({
          path,
          rawUrl: rawUrlForRepoPath(path),
          blobUrl: blobUrlForRepoPath(path),
        });
      }

      const targetManifestPath = manifestPath || joinRepoPath(contentPath, 'collection.json');
      const existingManifestEntry = await fetchRepoContents(targetManifestPath, { allowNotFound: true });
      const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
      const manifestPayload = {
        message: payload.commitMessage || 'Publish collection via TimeMap Collector',
        content: encodeBase64Utf8(serialized),
        branch,
      };
      if (
        existingManifestEntry &&
        !Array.isArray(existingManifestEntry) &&
        existingManifestEntry.type === 'file' &&
        existingManifestEntry.sha
      ) {
        manifestPayload.sha = existingManifestEntry.sha;
      }

      const manifestResponse = await putRepoContent(targetManifestPath, manifestPayload);
      const nextSha = manifestResponse?.content?.sha || '';

      collection = cloneItem(manifest);
      manifestPath = targetManifestPath;
      manifestSha = nextSha;
      manifestRootPath = contentPath;
      items = (collection.items || []).map((entry, index) => normalizeManifestItem(entry, index, manifestRootPath));
      updateCapabilities();

      return {
        ok: true,
        manifestPath: targetManifestPath,
        manifestRawUrl: rawUrlForRepoPath(targetManifestPath),
        uploaded: uploadResults,
        itemCount: items.length,
      };
    },

    getCapabilities() {
      return capabilities;
    },
  };
}
