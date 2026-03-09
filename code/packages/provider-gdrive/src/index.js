import { validateCollectionShape } from '../../../packages/collector-schema/src/schema.js';
import {
  PROVIDER_AVAILABILITY,
  READ_ONLY_CAPABILITIES,
  cloneItem,
  createProviderDescriptor,
  providerNotConnectedError,
} from '../../provider-core/src/provider.js';

const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
const DRIVE_READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const CONNECTION_STATES = {
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  error: 'error',
};

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureUrl(value) {
  const raw = asTrimmedString(value);
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw);
  } catch (error) {
    return null;
  }
}

function normalizeCandidateId(value) {
  const id = asTrimmedString(value);
  if (!id) {
    return '';
  }

  try {
    return decodeURIComponent(id);
  } catch (error) {
    return id;
  }
}

function normalizeManifestTitle(raw) {
  const title = asTrimmedString(raw);
  if (!title) {
    return '';
  }
  return title.replace(/\.json$/i, '');
}

function extractFileIdFromUrl(parsed) {
  if (!parsed) {
    return '';
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname || '';
  const pathParts = pathname.split('/').filter(Boolean);

  if (host === 'drive.google.com' || host.endsWith('.drive.google.com')) {
    const fileSegmentIndex = pathParts.findIndex((part) => part === 'd');
    if (fileSegmentIndex >= 0 && pathParts[fileSegmentIndex + 1]) {
      return normalizeCandidateId(pathParts[fileSegmentIndex + 1]);
    }

    const queryId = parsed.searchParams.get('id');
    if (queryId) {
      return normalizeCandidateId(queryId);
    }
  }

  if (host === 'docs.google.com' || host.endsWith('.docs.google.com')) {
    const docsFileIndex = pathParts.findIndex((part) => part === 'd');
    if (docsFileIndex >= 0 && pathParts[docsFileIndex + 1]) {
      return normalizeCandidateId(pathParts[docsFileIndex + 1]);
    }

    const docsQueryId = parsed.searchParams.get('id');
    if (docsQueryId) {
      return normalizeCandidateId(docsQueryId);
    }
  }

  if (host === 'www.googleapis.com' || host === 'googleapis.com' || host.endsWith('.googleapis.com')) {
    const filesSegment = pathParts.findIndex((part) => part === 'files');
    if (filesSegment >= 0 && pathParts[filesSegment + 1]) {
      return normalizeCandidateId(pathParts[filesSegment + 1]);
    }
  }

  return '';
}

function parseCollectionJson(rawText) {
  try {
    const json = JSON.parse(rawText);
    const validationErrors = validateCollectionShape(json);
    if (validationErrors.length > 0) {
      return {
        ok: false,
        message: `Manifest schema invalid: ${validationErrors.join(' ')}`,
      };
    }
    return {
      ok: true,
      json,
    };
  } catch (error) {
    if (/^\s*</.test(rawText)) {
      return {
        ok: false,
        message: 'File is not publicly accessible or not shared as a direct JSON file.',
      };
    }
    return {
      ok: false,
      message: 'Could not parse JSON manifest. Ensure the shared file is a valid collection.json.',
    };
  }
}

function driveCapabilities(authRequired) {
  return {
    ...READ_ONLY_CAPABILITIES,
    authRequired,
  };
}

export function normalizeGoogleDriveManifestUrl(inputUrl) {
  const raw = asTrimmedString(inputUrl);
  if (!raw) {
    return {
      ok: false,
      message: 'Paste a Google Drive file URL to a shared collection.json manifest.',
    };
  }

  if (DRIVE_FILE_ID_PATTERN.test(raw)) {
    return {
      ok: true,
      fileId: raw,
      fetchUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(raw)}`,
      canonicalUrl: `https://drive.google.com/file/d/${encodeURIComponent(raw)}/view`,
      variant: 'file-id',
    };
  }

  const parsed = ensureUrl(raw);
  if (!parsed) {
    return {
      ok: false,
      message: 'Invalid Google Drive file URL.',
    };
  }

  const fileId = extractFileIdFromUrl(parsed);
  if (!fileId || !DRIVE_FILE_ID_PATTERN.test(fileId)) {
    return {
      ok: false,
      message: 'Invalid Google Drive file URL.',
    };
  }

  return {
    ok: true,
    fileId,
    fetchUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    canonicalUrl: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`,
    variant: parsed.pathname.includes('/uc') ? 'uc-download' : 'shared-link',
  };
}

export function requestGoogleDriveAccessToken({
  clientId = '',
  scope = DRIVE_READ_SCOPE,
  prompt = 'consent',
} = {}) {
  return new Promise((resolve, reject) => {
    const safeClientId = asTrimmedString(clientId);
    if (!safeClientId) {
      reject(new Error('Google OAuth client ID is required.'));
      return;
    }

    const oauth2 = window?.google?.accounts?.oauth2;
    if (!oauth2 || typeof oauth2.initTokenClient !== 'function') {
      reject(
        new Error(
          'Google Identity Services is not available. Load the GIS script before requesting a Google token.',
        ),
      );
      return;
    }

    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: safeClientId,
        scope: asTrimmedString(scope) || DRIVE_READ_SCOPE,
        prompt: asTrimmedString(prompt) || 'consent',
        callback: (response) => {
          if (response?.error) {
            reject(new Error(response.error_description || response.error || 'Google authorization failed.'));
            return;
          }

          if (!response?.access_token) {
            reject(new Error('Google authorization did not return an access token.'));
            return;
          }

          resolve({
            accessToken: response.access_token,
            expiresIn: Number(response.expires_in) || 0,
            scope: response.scope || scope,
            tokenType: response.token_type || 'Bearer',
          });
        },
      });

      tokenClient.requestAccessToken();
    } catch (error) {
      reject(new Error(`Google authorization failed: ${error.message}`));
    }
  });
}

export function createGoogleDriveProvider() {
  let connected = false;
  let collection = null;
  let fileId = '';
  let manifestUrl = '';
  let normalizedManifestUrl = '';
  let sourceMode = 'public-manifest-url';
  let connectionState = CONNECTION_STATES.disconnected;
  let lastError = '';

  const descriptor = createProviderDescriptor({
    id: 'gdrive',
    label: 'Google Drive',
    category: 'external',
    availability: PROVIDER_AVAILABILITY.available,
    description: 'Connect to Google Drive and browse shared or private collection sources.',
    statusLabel: 'Available',
    capabilities: driveCapabilities(false),
  });

  function setState(nextState, errorMessage = '') {
    connectionState = nextState;
    lastError = errorMessage;
  }

  function disconnectWithError(message, authRequired) {
    connected = false;
    collection = null;
    setState(CONNECTION_STATES.error, message);
    return {
      ok: false,
      message,
      capabilities: driveCapabilities(authRequired),
      connectionState,
      sourceMode,
    };
  }

  async function loadPublicManifest(config = {}) {
    manifestUrl = asTrimmedString(config.manifestUrl);
    if (!manifestUrl) {
      return disconnectWithError(
        'Paste a Google Drive file URL to a shared collection.json manifest.',
        false,
      );
    }

    const normalized = normalizeGoogleDriveManifestUrl(manifestUrl);
    if (!normalized.ok) {
      fileId = '';
      normalizedManifestUrl = '';
      return disconnectWithError(normalized.message || 'Invalid Google Drive file URL.', false);
    }

    fileId = normalized.fileId;
    normalizedManifestUrl = normalized.fetchUrl;

    const response = await fetch(normalizedManifestUrl, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
    });

    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) {
        return disconnectWithError(
          'File is not publicly accessible. Share as Anyone with the link -> Viewer.',
          false,
        );
      }

      return disconnectWithError(`Failed to load Google Drive file (${response.status}).`, false);
    }

    const rawText = await response.text();
    const parsed = parseCollectionJson(rawText);
    if (!parsed.ok) {
      return disconnectWithError(parsed.message, false);
    }

    collection = cloneItem(parsed.json);
    connected = true;
    setState(CONNECTION_STATES.connected);
    const title = normalizeManifestTitle(collection.title);
    return {
      ok: true,
      message: `Loaded Google Drive collection${title ? ` "${title}"` : ''}.`,
      capabilities: driveCapabilities(false),
      connectionState,
      sourceMode,
      sourceDisplayLabel: title || 'Google Drive',
      sourceDetailLabel: `Google Drive file ${fileId}`,
      normalizedManifestUrl,
      fileId,
    };
  }

  async function loadAuthenticatedManifest(config = {}) {
    const accessToken = asTrimmedString(config.accessToken);
    const inputFileId = normalizeCandidateId(config.fileId);

    if (!DRIVE_FILE_ID_PATTERN.test(inputFileId)) {
      return disconnectWithError('Enter a valid Google Drive file ID for collection.json.', true);
    }

    if (!accessToken) {
      return disconnectWithError('Re-authentication required. Click Connect Google Drive.', true);
    }

    fileId = inputFileId;
    manifestUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    normalizedManifestUrl = manifestUrl;

    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!metadataResponse.ok) {
      if ([401, 403].includes(metadataResponse.status)) {
        return disconnectWithError('Google Drive authorization failed or permission denied.', true);
      }
      if (metadataResponse.status === 404) {
        return disconnectWithError('Google Drive file not found for the provided file ID.', true);
      }
      return disconnectWithError(
        `Google Drive metadata request failed (${metadataResponse.status}).`,
        true,
      );
    }

    const metadata = await metadataResponse.json();
    const mediaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json,text/plain,*/*',
        },
      },
    );

    if (!mediaResponse.ok) {
      if ([401, 403].includes(mediaResponse.status)) {
        return disconnectWithError(
          'Google Drive file content is not accessible with the current authorization.',
          true,
        );
      }
      return disconnectWithError(`Google Drive file download failed (${mediaResponse.status}).`, true);
    }

    const rawText = await mediaResponse.text();
    const parsed = parseCollectionJson(rawText);
    if (!parsed.ok) {
      return disconnectWithError(parsed.message, true);
    }

    collection = cloneItem(parsed.json);
    connected = true;
    setState(CONNECTION_STATES.connected);
    const title = normalizeManifestTitle(collection.title) || normalizeManifestTitle(metadata?.name);
    return {
      ok: true,
      message: `Loaded Google Drive collection${title ? ` "${title}"` : ''} via authenticated API access.`,
      capabilities: driveCapabilities(true),
      connectionState,
      sourceMode,
      sourceDisplayLabel: title || 'Google Drive',
      sourceDetailLabel: `Google Drive API file ${fileId}`,
      normalizedManifestUrl,
      fileId,
    };
  }

  return {
    ...descriptor,

    getDescriptor() {
      return descriptor;
    },

    async connect(config = {}) {
      connected = false;
      collection = null;
      setState(CONNECTION_STATES.connecting);

      sourceMode = asTrimmedString(config.sourceMode) || 'public-manifest-url';
      try {
        if (sourceMode === 'auth-manifest-file') {
          return await loadAuthenticatedManifest(config);
        }
        return await loadPublicManifest(config);
      } catch (error) {
        return disconnectWithError(`Google Drive connection failed: ${error.message}`, sourceMode === 'auth-manifest-file');
      }
    },

    async listAssets() {
      if (!connected) {
        throw providerNotConnectedError('gdrive');
      }

      return (collection.items || []).map(cloneItem);
    },

    async getAsset(id) {
      if (!connected) {
        throw providerNotConnectedError('gdrive');
      }

      const item = (collection.items || []).find((entry) => entry.id === id);
      return item ? cloneItem(item) : null;
    },

    async saveMetadata() {
      throw new Error('Google Drive provider is read-only in this pass.');
    },

    async exportCollection(collectionMeta) {
      if (!connected) {
        throw providerNotConnectedError('gdrive');
      }

      return {
        id: collectionMeta.id,
        title: collectionMeta.title,
        description: collectionMeta.description,
        items: (collection.items || []).map(cloneItem),
      };
    },

    getCapabilities() {
      return driveCapabilities(sourceMode === 'auth-manifest-file');
    },

    getConnectionMeta() {
      return {
        fileId,
        manifestUrl,
        normalizedManifestUrl,
        sourceMode,
        connectionState,
        lastError,
      };
    },
  };
}

