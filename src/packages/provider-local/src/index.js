import { validateCollectionShape } from '../../../packages/collector-schema/src/schema.js';
import {
  PROVIDER_AVAILABILITY,
  READ_WRITE_CAPABILITIES,
  cloneItem,
  createProviderDescriptor,
  mergeItem,
  providerNotConnectedError,
} from '../../provider-core/src/provider.js';

export function createLocalProvider() {
  let connected = false;
  let sourcePath = '/site/examples/test-collection/collection.json';
  let collection = null;
  let itemsById = new Map();

  const descriptor = createProviderDescriptor({
    id: 'local',
    label: 'Example dataset',
    category: 'builtin',
    availability: PROVIDER_AVAILABILITY.available,
    description: 'Built-in sample collection for local development and quick demos.',
    statusLabel: 'Available',
    capabilities: READ_WRITE_CAPABILITIES,
  });

  function rebuildIndex() {
    itemsById = new Map((collection.items || []).map((item) => [item.id, cloneItem(item)]));
  }

  return {
    ...descriptor,

    getDescriptor() {
      return descriptor;
    },

    async connect(config = {}) {
      sourcePath = config.path || sourcePath;
      const response = await fetch(sourcePath);
      if (!response.ok) {
        connected = false;
        return {
          ok: false,
          message: `Failed to load ${sourcePath} (${response.status}).`,
          capabilities: READ_WRITE_CAPABILITIES,
        };
      }

      const json = await response.json();
      const validationErrors = validateCollectionShape(json);
      if (validationErrors.length > 0) {
        connected = false;
        return {
          ok: false,
          message: `Collection schema invalid: ${validationErrors.join(' ')}`,
          capabilities: READ_WRITE_CAPABILITIES,
        };
      }

      collection = cloneItem(json);
      rebuildIndex();
      connected = true;

      return {
        ok: true,
        message: `Connected to ${sourcePath}`,
        capabilities: READ_WRITE_CAPABILITIES,
      };
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

      const existing = itemsById.get(id);
      if (!existing) {
        return null;
      }

      const updated = mergeItem(existing, patch);
      itemsById.set(id, updated);
      return cloneItem(updated);
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
      return READ_WRITE_CAPABILITIES;
    },
  };
}
