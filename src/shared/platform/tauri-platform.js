import { PLATFORM_TYPES, createPlatformApi } from './platform-api.js';

function getInvoke() {
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke;
  }
  if (window.__TAURI_INTERNALS__?.invoke) {
    return window.__TAURI_INTERNALS__.invoke;
  }
  throw new Error('Tauri invoke API is unavailable.');
}

async function invoke(command, args = {}) {
  const fn = getInvoke();
  return fn(command, args);
}

class TauriFileHandle {
  constructor(path) {
    this.kind = 'file';
    this.path = String(path || '');
    this.name = this.path.split(/[/\\]/).pop() || '';
  }

  async getFile() {
    const text = await invoke('platform_read_text_file', { path: this.path });
    return {
      name: this.name,
      async text() {
        return text;
      },
    };
  }

  async createWritable() {
    const path = this.path;
    return {
      async write(text) {
        await invoke('platform_write_text_file', { path, text: String(text ?? '') });
      },
      async close() {},
    };
  }
}

class TauriDirectoryHandle {
  constructor(path) {
    this.kind = 'directory';
    this.path = String(path || '');
    this.name = this.path.split(/[/\\]/).pop() || this.path;
  }

  async getDirectoryHandle(name) {
    const nextPath = await invoke('platform_join_path', { base: this.path, name });
    const exists = await invoke('platform_directory_exists', { path: nextPath });
    if (!exists) {
      throw new Error(`Directory not found: ${name}`);
    }
    return new TauriDirectoryHandle(nextPath);
  }

  async getFileHandle(name) {
    const nextPath = await invoke('platform_join_path', { base: this.path, name });
    const exists = await invoke('platform_file_exists', { path: nextPath });
    if (!exists) {
      throw new Error(`File not found: ${name}`);
    }
    return new TauriFileHandle(nextPath);
  }

  async *entries() {
    const entries = await invoke('platform_read_directory', { path: this.path });
    for (const entry of entries) {
      if (entry.kind === 'directory') {
        yield [entry.name, new TauriDirectoryHandle(entry.path)];
      } else {
        yield [entry.name, new TauriFileHandle(entry.path)];
      }
    }
  }
}

function reviveHandle(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  if (raw.kind === 'file' && raw.path) {
    return new TauriFileHandle(raw.path);
  }
  if (raw.kind === 'directory' && raw.path) {
    return new TauriDirectoryHandle(raw.path);
  }
  return null;
}

export const tauriPlatform = createPlatformApi({
  getPlatformType() {
    return PLATFORM_TYPES.TAURI;
  },

  async openTextFile() {
    const result = await invoke('platform_open_text_file');
    if (!result) {
      return null;
    }
    return { ...result, handle: new TauriFileHandle(result.path) };
  },

  async openJsonFile() {
    const result = await invoke('platform_open_json_file');
    if (!result) {
      return null;
    }
    return { ...result, handle: new TauriFileHandle(result.path) };
  },

  async saveTextFile(text, { suggestedName = 'file.txt', handle = null } = {}) {
    if (handle?.path) {
      await invoke('platform_write_text_file', { path: handle.path, text: String(text ?? '') });
      return { path: handle.path, name: handle.name || suggestedName, handle };
    }
    const result = await invoke('platform_save_text_file', { text: String(text ?? ''), suggestedName });
    if (!result) {
      return null;
    }
    return { ...result, handle: new TauriFileHandle(result.path) };
  },

  async saveJsonFile(data, options = {}) {
    const text = `${JSON.stringify(data, null, 2)}\n`;
    return this.saveTextFile(text, { suggestedName: options.suggestedName || 'data.json', handle: options.handle || null });
  },

  async openDirectory() {
    const path = await invoke('platform_open_directory');
    if (!path) {
      return null;
    }
    return new TauriDirectoryHandle(path);
  },

  async readTextFile(pathOrHandle) {
    const path = typeof pathOrHandle === 'string' ? pathOrHandle : pathOrHandle?.path;
    if (!path) {
      throw new Error('File path is required.');
    }
    return invoke('platform_read_text_file', { path });
  },

  async writeTextFile(pathOrHandle, text) {
    const path = typeof pathOrHandle === 'string' ? pathOrHandle : pathOrHandle?.path;
    if (!path) {
      throw new Error('File path is required.');
    }
    await invoke('platform_write_text_file', { path, text: String(text ?? '') });
  },

  async rememberWorkspaceState(snapshot) {
    await invoke('platform_remember_workspace_state', { snapshot });
  },

  async loadWorkspaceState() {
    return invoke('platform_load_workspace_state');
  },

  reviveHandle,
});
