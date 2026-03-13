const DB_NAME = 'open-collections-configurator';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_state';
const WORKSPACE_KEY = 'workspace_v1';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}

export async function loadWorkspaceSnapshot() {
  let db = null;
  try {
    db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(WORKSPACE_KEY);
    const result = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Failed to read workspace snapshot.'));
    });
    await txDone(tx);
    return result;
  } finally {
    db?.close?.();
  }
}

export async function saveWorkspaceSnapshot(snapshot) {
  let db = null;
  try {
    db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(snapshot, WORKSPACE_KEY);
    await txDone(tx);
  } finally {
    db?.close?.();
  }
}

