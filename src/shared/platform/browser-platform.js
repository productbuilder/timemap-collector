import { PLATFORM_TYPES, createPlatformApi } from './platform-api.js';

const WORKSPACE_KEY = 'open-collections:workspace-state:v1';

async function pickSingleFile(accept = '.json,application/json,text/plain') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files?.[0] || null);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });
    input.addEventListener('error', () => {
      reject(new Error('Failed to pick file.'));
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

async function openFileWithPicker(types) {
  if (typeof window.showOpenFilePicker === 'function') {
    const [handle] = await window.showOpenFilePicker({ multiple: false, types });
    if (!handle) {
      return null;
    }
    const file = await handle.getFile();
    return {
      name: file.name,
      path: '',
      text: await file.text(),
      handle,
    };
  }

  const file = await pickSingleFile('.json,application/json,text/plain');
  if (!file) {
    return null;
  }
  return {
    name: file.name,
    path: '',
    text: await file.text(),
    handle: null,
  };
}

async function triggerDownload(text, suggestedName) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

export const browserPlatform = createPlatformApi({
  getPlatformType() {
    return PLATFORM_TYPES.BROWSER;
  },

  async openTextFile() {
    return openFileWithPicker([{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md', '.json'] } }]);
  },

  async openJsonFile() {
    return openFileWithPicker([{ description: 'JSON files', accept: { 'application/json': ['.json'] } }]);
  },

  async saveTextFile(text, { suggestedName = 'file.txt', handle = null } = {}) {
    if (handle && typeof handle.createWritable === 'function') {
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { handle, path: '', name: handle.name || suggestedName };
    }

    if (typeof window.showSaveFilePicker === 'function') {
      const nextHandle = await window.showSaveFilePicker({ suggestedName });
      if (!nextHandle) {
        return null;
      }
      const writable = await nextHandle.createWritable();
      await writable.write(text);
      await writable.close();
      return { handle: nextHandle, path: '', name: nextHandle.name || suggestedName };
    }

    await triggerDownload(text, suggestedName);
    return { handle: null, path: '', name: suggestedName };
  },

  async saveJsonFile(data, options = {}) {
    const text = `${JSON.stringify(data, null, 2)}\n`;
    return this.saveTextFile(text, { suggestedName: options.suggestedName || 'data.json', handle: options.handle || null });
  },

  async openDirectory() {
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('Directory selection is not supported in this browser.');
    }
    return window.showDirectoryPicker({ mode: 'readwrite' });
  },

  async readTextFile(pathOrHandle) {
    if (pathOrHandle && typeof pathOrHandle.getFile === 'function') {
      const file = await pathOrHandle.getFile();
      return file.text();
    }
    throw new Error('Browser platform requires a file handle to read text.');
  },

  async writeTextFile(pathOrHandle, text) {
    if (pathOrHandle && typeof pathOrHandle.createWritable === 'function') {
      const writable = await pathOrHandle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    }
    throw new Error('Browser platform requires a file handle to write text.');
  },

  async rememberWorkspaceState(snapshot) {
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
  },

  async loadWorkspaceState() {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  },

  reviveHandle(raw) {
    return raw || null;
  },
});
