function splitPath(path = '') {
  return String(path)
    .split('/')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function createOpfsStorage() {
  let rootPromise = null;

  async function isOpfsAvailable() {
    return Boolean(
      typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.getDirectory === 'function',
    );
  }

  async function getRootDirectory() {
    if (!(await isOpfsAvailable())) {
      throw new Error('OPFS not supported in this browser.');
    }

    if (!rootPromise) {
      rootPromise = navigator.storage.getDirectory();
    }
    return rootPromise;
  }

  async function getDirectoryHandle(path = '', create = false) {
    const parts = splitPath(path);
    let current = await getRootDirectory();

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create });
    }

    return current;
  }

  async function getFileHandle(path, create = false) {
    const parts = splitPath(path);
    if (parts.length === 0) {
      throw new Error('File path is required.');
    }

    const fileName = parts.pop();
    const parentPath = parts.join('/');
    const parent = await getDirectoryHandle(parentPath, create);
    return parent.getFileHandle(fileName, { create });
  }

  async function readJsonFile(path) {
    try {
      const fileHandle = await getFileHandle(path, false);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  async function writeJsonFile(path, data) {
    const fileHandle = await getFileHandle(path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(`${JSON.stringify(data, null, 2)}\n`);
    await writable.close();
  }

  async function readBlobFile(path) {
    try {
      const fileHandle = await getFileHandle(path, false);
      const file = await fileHandle.getFile();
      return file;
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  async function writeBlobFile(path, blob) {
    const fileHandle = await getFileHandle(path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async function deleteFile(path) {
    const parts = splitPath(path);
    if (parts.length === 0) {
      return;
    }

    const fileName = parts.pop();
    const parentPath = parts.join('/');
    try {
      const parent = await getDirectoryHandle(parentPath, false);
      await parent.removeEntry(fileName);
    } catch (error) {
      if (error?.name !== 'NotFoundError') {
        throw error;
      }
    }
  }

  async function listFiles(path = '') {
    try {
      const directory = await getDirectoryHandle(path, false);
      const files = [];
      // eslint-disable-next-line no-restricted-syntax
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === 'file') {
          files.push(name);
        }
      }
      return files;
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        return [];
      }
      throw error;
    }
  }

  return {
    isOpfsAvailable,
    readJsonFile,
    writeJsonFile,
    readBlobFile,
    writeBlobFile,
    deleteFile,
    listFiles,
  };
}
