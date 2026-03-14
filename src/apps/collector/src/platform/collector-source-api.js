import { getPlatform } from '../../../../shared/platform/index.js';

const platform = getPlatform();

export async function pickLocalHostDirectory() {
  return platform.openDirectory();
}
