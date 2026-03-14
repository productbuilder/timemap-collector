import { getPlatform } from '../../../../shared/platform/index.js';

const platform = getPlatform();

export async function loadWorkspaceSnapshot() {
  return platform.loadWorkspaceState();
}

export async function saveWorkspaceSnapshot(snapshot) {
  await platform.rememberWorkspaceState(snapshot);
}
