export async function generateThumbnailBlob(manager, file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 300;
  const ratio = bitmap.width > 0 ? Math.min(1, maxWidth / bitmap.width) : 1;
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === 'function') {
    bitmap.close();
  }
  const blob = await new Promise((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.86);
  });
  return blob || null;
}

export async function rememberLocalAssetFiles(manager, item, originalBlob, thumbnailBlob) {
  manager.localAssetBlobs.set(item.workspaceId, {
    original: originalBlob || null,
    thumbnail: thumbnailBlob || null,
  });

  if (!manager.state.opfsAvailable) {
    return;
  }

  if (originalBlob && item.localFileRef) {
    await manager.opfsStorage.writeBlobFile(item.localFileRef, originalBlob);
  }
  if (thumbnailBlob && item.localThumbnailRef) {
    await manager.opfsStorage.writeBlobFile(item.localThumbnailRef, thumbnailBlob);
  }
}

export async function loadLocalAssetBlob(manager, item, kind = 'original') {
  const cached = manager.localAssetBlobs.get(item.workspaceId);
  if (kind === 'thumbnail' && cached?.thumbnail) {
    return cached.thumbnail;
  }
  if (kind === 'original' && cached?.original) {
    return cached.original;
  }

  if (!manager.state.opfsAvailable) {
    return null;
  }

  const path = kind === 'thumbnail' ? item.localThumbnailRef : item.localFileRef;
  if (!path) {
    return null;
  }
  const blob = await manager.opfsStorage.readBlobFile(path);
  if (!blob) {
    return null;
  }
  manager.localAssetBlobs.set(item.workspaceId, {
    original: kind === 'original' ? blob : cached?.original || null,
    thumbnail: kind === 'thumbnail' ? blob : cached?.thumbnail || null,
  });
  return blob;
}

export async function rehydrateLocalDraftAssetUrls(manager) {
  for (const item of manager.state.assets) {
    if (!item.isLocalDraftAsset) {
      continue;
    }
    if (!item.previewUrl) {
      const originalBlob = await loadLocalAssetBlob(manager, item, 'original');
      if (originalBlob) {
        item.previewUrl = URL.createObjectURL(originalBlob);
        manager.registerObjectUrl(item.previewUrl);
      }
    }
    if (!item.thumbnailPreviewUrl) {
      const thumbBlob = await loadLocalAssetBlob(manager, item, 'thumbnail');
      if (thumbBlob) {
        item.thumbnailPreviewUrl = URL.createObjectURL(thumbBlob);
        manager.registerObjectUrl(item.thumbnailPreviewUrl);
      }
    }
    if (!item.media?.thumbnailUrl && item.thumbnailRepoPath) {
      item.media = {
        ...(item.media || {}),
        thumbnailUrl: item.thumbnailRepoPath,
      };
    }
  }
}

function fileNameFromPath(path = '') {
  const clean = String(path || '').trim().replace(/\\/g, '/');
  if (!clean) {
    return '';
  }
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || clean;
}

export async function hydrateLocalSourceAssetPreviews(manager, sourceId) {
  const source = manager.getSourceById(sourceId);
  if (!source || source.providerId !== 'local') {
    return;
  }
  const provider = source.provider;
  if (!provider || typeof provider.readCollectionFileBlob !== 'function') {
    return;
  }

  for (const item of manager.state.assets) {
    if (item.sourceId !== sourceId) {
      continue;
    }
    const mediaPath = String(item.media?.url || '').trim();
    const thumbPath = String(item.media?.thumbnailUrl || '').trim();
    if (!item.fileName && mediaPath) {
      item.fileName = fileNameFromPath(mediaPath);
    }

    if (!item.thumbnailPreviewUrl && thumbPath) {
      try {
        const thumbBlob = await provider.readCollectionFileBlob(item.collectionId, thumbPath);
        if (thumbBlob) {
          item.thumbnailPreviewUrl = URL.createObjectURL(thumbBlob);
          manager.registerObjectUrl(item.thumbnailPreviewUrl);
        }
      } catch (error) {
        // Keep rendering resilient when local files are missing or inaccessible.
      }
    }

    if (!item.previewUrl && mediaPath) {
      try {
        const mediaBlob = await provider.readCollectionFileBlob(item.collectionId, mediaPath);
        if (mediaBlob) {
          item.previewUrl = URL.createObjectURL(mediaBlob);
          manager.registerObjectUrl(item.previewUrl);
        }
      } catch (error) {
        // Keep rendering resilient when local files are missing or inaccessible.
      }
    }
  }
}

export async function ingestImageFiles(manager, files) {
  const source = manager.getActiveIngestionSource();
  if (!source) {
    return;
  }

  const accepted = files.filter((file) => manager.isSupportedImageFile(file));
  if (accepted.length === 0) {
    manager.setStatus('No supported image files found. Use JPG, PNG, WEBP, or GIF.', 'warn');
    return;
  }

  const rejected = files.length - accepted.length;
  if (rejected > 0) {
    manager.setStatus(`Skipped ${rejected} unsupported file(s).`, 'warn');
  }

  const collectionId = manager.ensureCollectionForSource(source);
  if (!collectionId) {
    manager.setStatus('Create or select a collection before adding images.', 'warn');
    return;
  }
  const collectionLabel = manager.collectionLabelFor(source, collectionId);
  const collectionRootPath = manager.activeCollectionRootPath() || manager.normalizeCollectionRootPath(`${collectionId}/`, collectionId);
  const created = [];

  if (source.providerId === 'local' && source.provider && typeof source.provider.addAssetToCollection === 'function') {
    for (const file of accepted) {
      const ext = manager.extensionFromName(file.name, '.jpg');
      const baseId = manager.slugifySegment(file.name.replace(/\.[^.]+$/, ''), 'image');
      const itemId = manager.uniqueDraftItemId(baseId, source.id, collectionId);
      const title = manager.readableTitleFromFilename(file.name, itemId);
      const mediaRepoPath = `${itemId}${ext}`;
      const thumbRepoPath = `${itemId}.thumb.jpg`;

      let thumbnailBlob = null;
      let thumbnailPreviewUrl = '';
      try {
        thumbnailBlob = await generateThumbnailBlob(manager, file);
      } catch (error) {
        thumbnailBlob = null;
      }

      if (thumbnailBlob) {
        thumbnailPreviewUrl = URL.createObjectURL(thumbnailBlob);
        manager.registerObjectUrl(thumbnailPreviewUrl);
      }

      let savedItem = null;
      try {
        savedItem = await source.provider.addAssetToCollection(collectionId, {
          itemId,
          title,
          file,
          thumbnailBlob,
          mediaType: 'image',
          mediaPath: mediaRepoPath,
          thumbnailPath: thumbnailBlob ? thumbRepoPath : '',
          include: true,
          source: `${collectionId}/collection.json`,
        });
      } catch (error) {
        manager.setStatus(`Failed to save ${file.name} to local host: ${error.message}`, 'warn');
        continue;
      }

      if (!savedItem) {
        continue;
      }

      const workspaceId = manager.toWorkspaceItemId(source.id, savedItem.id);
      const previewUrl = URL.createObjectURL(file);
      manager.registerObjectUrl(previewUrl);
      created.push({
        ...savedItem,
        fileName: file.name || mediaRepoPath,
        previewUrl,
        thumbnailPreviewUrl,
        thumbnailRepoPath: savedItem.media?.thumbnailUrl || (thumbnailBlob ? thumbRepoPath : ''),
        isLocalDraftAsset: false,
        draftUploadStatus: 'uploaded',
        uploadError: '',
        sourceAssetId: savedItem.id,
        workspaceId,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceDisplayLabel: source.displayLabel || source.label,
        providerId: source.providerId,
        collectionId: savedItem.collectionId || collectionId,
        collectionLabel: savedItem.collectionLabel || collectionLabel,
        collectionRootPath: savedItem.collectionRootPath || collectionRootPath,
        localFileRef: '',
        localThumbnailRef: '',
      });
    }

    if (created.length === 0) {
      return;
    }

    manager.state.assets = [...manager.state.assets, ...created];
    manager.refreshSourceCollectionsAndCounts(source.id);
    manager.state.selectedCollectionId = collectionId;
    manager.state.selectedItemId = created[0]?.workspaceId || null;
    manager.renderSourcesList();
    manager.renderSourceFilter();
    manager.renderCollectionFilter();
    manager.renderAssets();
    manager.renderEditor();
    if (manager.state.opfsAvailable) {
      await manager.saveLocalDraft();
    }

    manager.setStatus(
      `${created.length} file${created.length === 1 ? '' : 's'} saved to local host collection ${collectionId}.`,
      'ok',
    );
    return;
  }

  for (const file of accepted) {
    const ext = manager.extensionFromName(file.name, '.jpg');
    const baseId = manager.slugifySegment(file.name.replace(/\.[^.]+$/, ''), 'image');
    const itemId = manager.uniqueDraftItemId(baseId, source.id, collectionId);
    const workspaceId = manager.toWorkspaceItemId(source.id, itemId);
    const title = manager.readableTitleFromFilename(file.name, itemId);
    const mediaRepoPath = `media/${itemId}${ext}`;
    const thumbRepoPath = `thumbs/${itemId}.thumb.jpg`;
    const localFileRef = manager.collectionAssetPath(workspaceId, 'original', ext);
    const localThumbnailRef = manager.collectionAssetPath(workspaceId, 'thumbnail', '.jpg');

    const previewUrl = URL.createObjectURL(file);
    manager.registerObjectUrl(previewUrl);
    let thumbnailBlob = null;
    let thumbnailPreviewUrl = '';
    try {
      thumbnailBlob = await generateThumbnailBlob(manager, file);
    } catch (error) {
      thumbnailBlob = null;
    }

    if (thumbnailBlob) {
      thumbnailPreviewUrl = URL.createObjectURL(thumbnailBlob);
      manager.registerObjectUrl(thumbnailPreviewUrl);
    }

    const item = {
      id: itemId,
      title,
      description: '',
      creator: '',
      date: '',
      location: '',
      license: '',
      attribution: '',
      source: '',
      tags: [],
      include: true,
      media: {
        type: 'image',
        url: mediaRepoPath,
        thumbnailUrl: thumbRepoPath,
      },
      previewUrl,
      thumbnailPreviewUrl,
      thumbnailRepoPath: thumbRepoPath,
      isLocalDraftAsset: true,
      draftUploadStatus: 'pending-upload',
      uploadError: '',
      sourceAssetId: itemId,
      workspaceId,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceDisplayLabel: source.displayLabel || source.label,
      providerId: source.providerId,
      collectionId,
      collectionLabel,
      collectionRootPath,
      localFileRef,
      localThumbnailRef: thumbnailBlob ? localThumbnailRef : '',
    };

    await rememberLocalAssetFiles(manager, item, file, thumbnailBlob);
    created.push(item);
  }

  if (created.length === 0) {
    return;
  }

  manager.state.assets = [...manager.state.assets, ...created];
  manager.refreshSourceCollectionsAndCounts(source.id);
  manager.state.selectedCollectionId = collectionId;
  manager.state.selectedItemId = created[0].workspaceId;
  manager.renderSourcesList();
  manager.renderSourceFilter();
  manager.renderCollectionFilter();
  manager.renderAssets();
  manager.renderEditor();

  if (manager.state.opfsAvailable) {
    await manager.saveLocalDraft();
  }

  manager.setStatus(
    `${created.length} file${created.length === 1 ? '' : 's'} added to local draft. Ready to publish.`,
    'ok',
  );
}
