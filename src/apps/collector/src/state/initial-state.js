export function createInitialState() {
  return {
    sources: [],
    assets: [],
    selectedItemId: null,
    viewerItemId: null,
    selectedProviderId: 'github',
    activeSourceFilter: 'all',
    selectedCollectionId: 'all',
    currentLevel: 'collections',
    metadataMode: 'collection',
    mobileEditorOpen: false,
    openedCollectionId: null,
    publishDestination: null,
    manifest: null,
    opfsAvailable: false,
    opfsStatus: 'Checking local draft storage...',
    lastLocalSaveAt: '',
    isDropTargetActive: false,
    localDraftCollections: [],
    browserViewModes: {
      collections: 'cards',
      items: 'cards',
    },
    inspectorMode: 'side',
  };
}
