export function collectionIdExists(manager, collectionId) {
  if (!collectionId) {
    return false;
  }
  const id = collectionId.trim();
  if (!id) {
    return false;
  }
  for (const source of manager.state.sources) {
    if ((source.collections || []).some((entry) => entry.id === id)) {
      return true;
    }
  }
  if (manager.state.localDraftCollections.some((entry) => entry.id === id)) {
    return true;
  }
  return manager.state.assets.some((item) => item.collectionId === id);
}

export function ensureUniqueCollectionId(manager, baseId) {
  if (!collectionIdExists(manager, baseId)) {
    return baseId;
  }
  let index = 2;
  while (collectionIdExists(manager, `${baseId}-${index}`)) {
    index += 1;
  }
  return `${baseId}-${index}`;
}

export function buildInitialCollectionManifest(manager, meta) {
  const rootPath = manager.normalizeCollectionRootPath(meta.rootPath || `${meta.id}/`, meta.id);
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

export async function createNewCollectionDraft(manager) {
  const title = manager.dom.newCollectionTitle.value.trim();
  if (!title) {
    manager.setStatus('Enter a collection title to create a draft.', 'warn');
    return;
  }

  let slug = (manager.dom.newCollectionSlug.value || '').trim();
  if (!slug) {
    slug = manager.slugifySegment(title, 'new-collection');
  } else {
    slug = manager.slugifySegment(slug, 'new-collection');
  }

  slug = ensureUniqueCollectionId(manager, slug);
  const meta = {
    id: slug,
    title,
    description: manager.dom.newCollectionDescription.value.trim(),
    license: manager.dom.newCollectionLicense.value.trim(),
    publisher: manager.dom.newCollectionPublisher.value.trim(),
    language: manager.dom.newCollectionLanguage.value.trim(),
    rootPath: manager.normalizeCollectionRootPath(`${slug}/`, slug),
  };

  const activeSource =
    manager.state.activeSourceFilter !== 'all'
      ? manager.getSourceById(manager.state.activeSourceFilter)
      : null;

  if (activeSource?.providerId === 'local' && (!activeSource.provider || !activeSource.capabilities?.canSaveMetadata)) {
    manager.setStatus('Reconnect the selected local host with write access before creating a collection.', 'warn');
    return;
  }

  if (
    activeSource?.providerId === 'local' &&
    activeSource.provider &&
    typeof activeSource.provider.createCollection === 'function' &&
    activeSource.capabilities?.canSaveMetadata
  ) {
    try {
      const created = await activeSource.provider.createCollection(meta);
      const createdCollection = created?.collection || null;
      const nextCollectionId = createdCollection?.id || meta.id;
      const nextMeta = {
        ...meta,
        id: nextCollectionId,
        title: createdCollection?.title || meta.title,
        description: createdCollection?.description || meta.description,
        license: createdCollection?.license || meta.license,
        publisher: createdCollection?.publisher || meta.publisher,
        language: createdCollection?.language || meta.language,
        rootPath: manager.normalizeCollectionRootPath(createdCollection?.rootPath || meta.rootPath, nextCollectionId),
      };

      manager.setCollectionMetaFields(nextMeta);
      manager.state.manifest = buildInitialCollectionManifest(manager, nextMeta);
      manager.dom.manifestPreview.textContent = JSON.stringify(manager.state.manifest, null, 2);
      manager.state.selectedItemId = null;

      const nextCollectionEntry = {
        id: nextCollectionId,
        title: nextMeta.title,
        description: nextMeta.description,
        license: nextMeta.license,
        publisher: nextMeta.publisher,
        language: nextMeta.language,
        rootPath: nextMeta.rootPath,
      };
      const exists = (activeSource.collections || []).some((entry) => entry.id === nextCollectionId);
      activeSource.collections = exists
        ? (activeSource.collections || []).map((entry) => (entry.id === nextCollectionId ? { ...entry, ...nextCollectionEntry } : entry))
        : [...(activeSource.collections || []), nextCollectionEntry];
      activeSource.selectedCollectionId = nextCollectionId;

      if (!manager.state.localDraftCollections.some((entry) => entry.id === nextCollectionId)) {
        manager.state.localDraftCollections = [
          ...manager.state.localDraftCollections,
          { id: nextCollectionId, title: nextMeta.title, rootPath: nextMeta.rootPath },
        ];
      }

      manager.state.selectedCollectionId = nextCollectionId;
      manager.state.currentLevel = 'collections';
      manager.state.openedCollectionId = null;
      manager.syncMetadataModeFromState();
      manager.closeDialog(manager.dom.newCollectionDialog);
      manager.renderSourcesList();
      manager.renderSourceFilter();
      manager.renderCollectionFilter();
      manager.renderAssets();
      manager.renderEditor();
      if (manager.isMobileViewport()) {
        manager.openMobileEditor();
      }

      if (manager.state.opfsAvailable) {
        await manager.saveLocalDraft();
      }
      manager.setStatus(`Created collection ${nextCollectionId} in local host ${activeSource.displayLabel || activeSource.label}.`, 'ok');
      return;
    } catch (error) {
      manager.setStatus(`Local collection creation failed: ${error.message}`, 'warn');
      return;
    }
  }

  manager.setCollectionMetaFields(meta);
  manager.state.manifest = buildInitialCollectionManifest(manager, meta);
  manager.dom.manifestPreview.textContent = JSON.stringify(manager.state.manifest, null, 2);
  manager.state.selectedItemId = null;
  if (!manager.state.localDraftCollections.some((entry) => entry.id === slug)) {
    manager.state.localDraftCollections = [...manager.state.localDraftCollections, { id: slug, title, rootPath: meta.rootPath }];
  }

  if (manager.state.activeSourceFilter !== 'all') {
    const source = manager.getSourceById(manager.state.activeSourceFilter);
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

  manager.state.selectedCollectionId = slug;
  manager.syncMetadataModeFromState();
  manager.closeDialog(manager.dom.newCollectionDialog);
  manager.renderSourcesList();
  manager.renderSourceFilter();
  manager.renderCollectionFilter();
  manager.renderAssets();
  manager.renderEditor();
  if (manager.isMobileViewport()) {
    manager.openMobileEditor();
  }

  if (manager.state.opfsAvailable) {
    await manager.saveLocalDraft();
  }
  manager.setStatus(`Created local draft collection ${slug}.`, 'ok');
}

export function openCollectionView(manager, collectionId) {
  if (!collectionId || collectionId === 'all') return;
  manager.state.selectedCollectionId = collectionId;
  manager.state.openedCollectionId = collectionId;
  manager.state.currentLevel = 'items';
  manager.state.selectedItemId = null;
  manager.syncMetadataModeFromState();
  manager.closeMobileEditor();
  manager.renderAssets();
  manager.renderEditor();
}

export function leaveCollectionView(manager) {
  manager.state.currentLevel = 'collections';
  manager.state.openedCollectionId = null;
  manager.state.selectedItemId = null;
  manager.syncMetadataModeFromState();
  manager.closeMobileEditor();
  manager.renderAssets();
  manager.renderEditor();
}

export async function saveSelectedCollectionMetadata(manager, patch = null) {
  const selected = manager.findSelectedCollectionMeta();
  if (!selected) {
    manager.setStatus('Select a collection to edit metadata.', 'warn');
    return;
  }
  const nextPatch = patch || manager.dom.metadataEditor.getCollectionPatch();
  const activeSource =
    manager.state.activeSourceFilter !== 'all'
      ? manager.getSourceById(manager.state.activeSourceFilter)
      : null;

  if (activeSource?.providerId === 'local' && (!activeSource.provider || !activeSource.capabilities?.canSaveMetadata)) {
    manager.setStatus('Reconnect the selected local host with write access before saving collection metadata.', 'warn');
    return;
  }

  if (
    activeSource?.providerId === 'local' &&
    activeSource.provider &&
    typeof activeSource.provider.saveCollectionMetadata === 'function' &&
    activeSource.capabilities?.canSaveMetadata
  ) {
    try {
      const result = await activeSource.provider.saveCollectionMetadata(selected.id, nextPatch);
      const updatedCollection = result?.collection || {};
      const normalizedRootPath = manager.normalizeCollectionRootPath(
        updatedCollection.rootPath || selected.rootPath || `${selected.id}/`,
        selected.id,
      );

      activeSource.collections = (activeSource.collections || []).map((entry) =>
        entry.id === selected.id
          ? {
              ...entry,
              ...nextPatch,
              ...updatedCollection,
              rootPath: normalizedRootPath,
            }
          : entry,
      );
      manager.state.localDraftCollections = manager.state.localDraftCollections.map((entry) =>
        entry.id === selected.id
          ? {
              ...entry,
              ...nextPatch,
              ...updatedCollection,
              rootPath: normalizedRootPath,
            }
          : entry,
      );
      manager.state.assets = manager.state.assets.map((item) =>
        item.sourceId === activeSource.id && item.collectionId === selected.id
          ? {
              ...item,
              collectionLabel: updatedCollection.title || nextPatch.title || item.collectionLabel || selected.id,
              collectionRootPath: normalizedRootPath,
            }
          : item,
      );

      manager.renderSourcesList();
      manager.renderSourceFilter();
      manager.renderCollectionFilter();
      manager.renderAssets();
      manager.renderEditor();
      manager.setStatus(`Saved collection metadata for ${selected.id}.`, 'ok');
      return;
    } catch (error) {
      manager.setStatus(`Saving collection metadata failed: ${error.message}`, 'warn');
      return;
    }
  }

  if (manager.state.activeSourceFilter !== 'all') {
    const source = manager.getSourceById(manager.state.activeSourceFilter);
    if (source?.collections) {
      source.collections = source.collections.map((entry) => entry.id === selected.id ? { ...entry, ...nextPatch } : entry);
    }
  }
  manager.state.localDraftCollections = manager.state.localDraftCollections.map((entry) => entry.id === selected.id ? { ...entry, ...nextPatch } : entry);
  manager.renderAssets();
  manager.renderEditor();
  manager.setStatus(`Saved collection metadata for ${selected.id}.`, 'ok');
}
