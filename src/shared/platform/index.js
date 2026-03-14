import { browserPlatform } from './browser-platform.js';
import { tauriPlatform } from './tauri-platform.js';

function isTauriRuntime() {
  return Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__?.core?.invoke);
}

const platform = isTauriRuntime() ? tauriPlatform : browserPlatform;

export function getPlatform() {
  return platform;
}

export function getPlatformType() {
  return platform.getPlatformType();
}

export function revivePlatformHandle(raw) {
  return platform.reviveHandle(raw);
}

export * from './platform-api.js';
