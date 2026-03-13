export async function persistSourcesToOpfs(manager, payload) {
  if (!manager.state.opfsAvailable) {
    return;
  }

  const existingFiles = await manager.opfsStorage.listFiles('sources');
  const keep = new Set(payload.map((entry) => `${entry.id}.json`));
  for (const fileName of existingFiles) {
    if (!keep.has(fileName)) {
      await manager.opfsStorage.deleteFile(`sources/${fileName}`);
    }
  }

  for (const source of payload) {
    await manager.opfsStorage.writeJsonFile(manager.sourceFilePath(source.id), source);
  }
}

export async function persistWorkspaceToOpfs(manager, extra = {}) {
  if (!manager.state.opfsAvailable) {
    return;
  }

  const workspace = {
    ...manager.currentWorkspaceSnapshot(),
    ...extra,
  };
  await manager.opfsStorage.writeJsonFile('workspace.json', workspace);
}

export async function loadRememberedSourcesFromOpfs(manager) {
  if (!manager.state.opfsAvailable) {
    return [];
  }

  const files = await manager.opfsStorage.listFiles('sources');
  if (files.length === 0) {
    return [];
  }

  const remembered = [];
  for (const file of files) {
    const data = await manager.opfsStorage.readJsonFile(`sources/${file}`);
    if (data && typeof data === 'object') {
      remembered.push(data);
    }
  }
  return remembered;
}

export async function initializeLocalDraftState(manager) {
  try {
    manager.state.opfsAvailable = await manager.opfsStorage.isOpfsAvailable();
  } catch (error) {
    manager.state.opfsAvailable = false;
  }

  if (!manager.state.opfsAvailable) {
    manager.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
    manager.setLocalDraftControlsEnabled(false);
    await manager.restoreRememberedSources();
    return;
  }

  manager.setLocalDraftStatus('Local draft storage available.', 'ok');
  manager.setLocalDraftControlsEnabled(true);
  await manager.restoreRememberedSources();

  const workspace = await manager.opfsStorage.readJsonFile('workspace.json');
  if (workspace) {
    manager.state.lastLocalSaveAt = workspace.lastLocalSaveAt || '';
    manager.applyWorkspaceSnapshot(workspace);
    await manager.restoreLocalDraft({ silent: true, preferredCollectionId: workspace.draftCollectionId || '' });
    if (manager.state.lastLocalSaveAt) {
      manager.setLocalDraftStatus(`Local draft ready (last saved ${manager.state.lastLocalSaveAt}).`, 'ok');
    }
  }

  manager.renderAssets();
  manager.renderEditor();
}

export async function saveLocalDraft(manager) {
  if (!manager.state.opfsAvailable) {
    manager.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
    return;
  }

  try {
    const collectionId = manager.draftCollectionId();
    const payload = manager.buildLocalDraftPayload();
    await manager.opfsStorage.writeJsonFile(manager.draftFilePath(collectionId), payload);
    manager.state.lastLocalSaveAt = payload.savedAt;
    await persistWorkspaceToOpfs(manager, {
      draftCollectionId: collectionId,
      lastLocalSaveAt: payload.savedAt,
    });
    await persistSourcesToOpfs(manager, manager.state.sources.map((source) => manager.toPersistedSource(source)));
    manager.setLocalDraftStatus(`Saved local draft at ${payload.savedAt}.`, 'ok');
    manager.setStatus('Local draft saved to OPFS.', 'ok');
  } catch (error) {
    manager.setLocalDraftStatus(`Local draft save failed: ${error.message}`, 'warn');
    manager.setStatus(`Local draft save failed: ${error.message}`, 'warn');
  }
}

export async function restoreLocalDraft(manager, options = {}) {
  if (!manager.state.opfsAvailable) {
    manager.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
    return;
  }

  const preferredCollectionId = (options.preferredCollectionId || '').trim();
  const collectionId = preferredCollectionId || manager.draftCollectionId();
  try {
    const payload = await manager.opfsStorage.readJsonFile(manager.draftFilePath(collectionId));
    if (!payload) {
      if (!options.silent) {
        manager.setLocalDraftStatus(`No local draft found for ${collectionId}.`, 'warn');
      }
      return;
    }

    manager.applyLocalDraftPayload(payload);
    await manager.rehydrateLocalDraftAssetUrls();
    for (const source of manager.state.sources) {
      if (source?.providerId === 'local' && source.provider) {
        await manager.hydrateLocalSourceAssetPreviews(source.id);
      }
    }
    manager.renderAssets();
    manager.renderEditor();
    manager.state.lastLocalSaveAt = payload.savedAt || '';
    if (!options.silent) {
      const restoredSuffix = payload.savedAt ? ` from ${payload.savedAt}` : '';
      manager.setLocalDraftStatus(
        `Restored local draft${restoredSuffix}.`,
        'ok',
      );
      manager.setStatus('Local draft restored from OPFS.', 'ok');
    }
  } catch (error) {
    manager.setLocalDraftStatus(`Local draft restore failed: ${error.message}`, 'warn');
    if (!options.silent) {
      manager.setStatus(`Local draft restore failed: ${error.message}`, 'warn');
    }
  }
}

export async function discardLocalDraft(manager) {
  if (!manager.state.opfsAvailable) {
    manager.setLocalDraftStatus('Local draft storage not available in this browser.', 'warn');
    return;
  }

  const collectionId = manager.draftCollectionId();
  try {
    await manager.opfsStorage.deleteFile(manager.draftFilePath(collectionId));
    const workspace = (await manager.opfsStorage.readJsonFile('workspace.json')) || {};
    if (workspace.draftCollectionId === collectionId) {
      delete workspace.draftCollectionId;
      workspace.lastLocalSaveAt = '';
      await manager.opfsStorage.writeJsonFile('workspace.json', workspace);
    }
    manager.state.lastLocalSaveAt = '';
    manager.setLocalDraftStatus(`Discarded local draft ${collectionId}.`, 'ok');
    manager.setStatus(`Discarded local draft ${collectionId}.`, 'ok');
  } catch (error) {
    manager.setLocalDraftStatus(`Discard draft failed: ${error.message}`, 'warn');
    manager.setStatus(`Discard draft failed: ${error.message}`, 'warn');
  }
}
