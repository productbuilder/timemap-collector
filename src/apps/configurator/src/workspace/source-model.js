function normalizeIdPart(value, fallback = 'source') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

export function createSourceId(role, seed = '') {
  const rolePart = normalizeIdPart(role, 'source');
  const seedPart = normalizeIdPart(seed, rolePart);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${rolePart}-${seedPart}-${rand}`;
}

export function createSourceDescriptor(input = {}) {
  const role = String(input.role || 'unknown');
  const collectionId = String(input.collectionId || '').trim();
  const fileName = String(input.fileName || '').trim();
  const sourceId = String(input.sourceId || '').trim()
    || createSourceId(role, collectionId || fileName || role);

  return {
    role,
    sourceId,
    label: String(input.label || '').trim() || fileName || sourceId,
    ownerOrgId: String(input.ownerOrgId || '').trim(),
    ownerOrgName: String(input.ownerOrgName || '').trim(),
    collectionId,
    connectionType: String(input.connectionType || 'unknown').trim() || 'unknown',
    fileHandle: input.fileHandle || null,
    folderHandle: input.folderHandle || null,
    fileName,
    sourcePath: String(input.sourcePath || '').trim(),
    selectedOrganizationId: String(input.selectedOrganizationId || '').trim(),
    discoveredOrganizations: Array.isArray(input.discoveredOrganizations) ? input.discoveredOrganizations : [],
    discoveredCollections: Array.isArray(input.discoveredCollections) ? input.discoveredCollections : [],
    resolvedOrgDirectoryName: String(input.resolvedOrgDirectoryName || '').trim(),
    isConnected: input.isConnected !== false,
    needsReconnect: Boolean(input.needsReconnect),
    restoreError: String(input.restoreError || '').trim(),
    repo: input.repo && typeof input.repo === 'object' ? { ...input.repo } : null,
    isLinkedExternal: Boolean(input.isLinkedExternal),
    isLoaded: input.isLoaded !== false,
    isDirty: Boolean(input.isDirty),
    data: input.data && typeof input.data === 'object' ? input.data : null,
    validation: input.validation && typeof input.validation === 'object'
      ? input.validation
      : { overviewWarnings: [], sections: {} },
  };
}

export function createWorkspaceState(currentOrganizationId) {
  return {
    currentOrganizationId,
    sources: {
      manufacturer: null,
      products: null,
      materials: [],
      materialsRoot: null,
      packages: null,
    },
    activeProductSourceId: null,
    activeMaterialSourceId: null,
    generatedPackageData: null,
    exportWarnings: [],
  };
}

export function sourceDescriptorLabel(source) {
  if (!source || typeof source !== 'object') {
    return 'No source';
  }
  const link = source.isLinkedExternal ? 'linked' : 'local';
  const owner = source.ownerOrgName || source.ownerOrgId || '';
  const file = source.fileName || source.label || source.sourceId;
  return owner ? `${file} · ${link} · ${owner}` : `${file} · ${link}`;
}
