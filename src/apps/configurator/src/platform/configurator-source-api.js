import { getPlatform } from '../../../../shared/platform/index.js';

const platform = getPlatform();

export async function openJsonSourceFile() {
  return platform.openJsonFile();
}

export async function openSourceDirectory() {
  return platform.openDirectory();
}

export async function saveSourceText(text, suggestedName) {
  return platform.saveTextFile(text, { suggestedName });
}

export async function writeSourceText(handle, text) {
  return platform.writeTextFile(handle, text);
}
