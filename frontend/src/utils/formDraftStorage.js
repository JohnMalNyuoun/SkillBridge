const DATABASE_NAME = 'fursahub-form-drafts';
const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';

let databasePromise;
const pendingOperations = new Map();

const openDatabase = () => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local form drafts.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local form drafts.'));
      request.onblocked = () => reject(new Error('Local form drafts are blocked by another browser tab.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};

const enqueueOperation = (key, operation) => {
  const previous = pendingOperations.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  pendingOperations.set(key, current);
  return current.finally(() => {
    if (pendingOperations.get(key) === current) {
      pendingOperations.delete(key);
    }
  });
};

const runTransaction = async (key, mode, operation) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error || new Error('Could not access the local form draft.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error('The local form draft operation was aborted.'));
    transaction.onerror = () => reject(transaction.error || new Error('Could not access the local form draft.'));
  });
};

const serializeFile = async (file) => {
  if (!file) return null;

  return {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    contents: await file.arrayBuffer()
  };
};

const restoreFile = (file) => {
  if (!file) return null;

  return new File([file.contents], file.name, {
    type: file.type,
    lastModified: file.lastModified
  });
};

export const loadFormDraft = async (key) => {
  const draft = await runTransaction(key, 'readonly', (store) => store.get(key));
  if (!draft) return null;

  return {
    data: draft.data,
    file: restoreFile(draft.file)
  };
};

export const saveFormDraft = (key, data, file = null) => enqueueOperation(key, async () => {
  const savedFile = await serializeFile(file);
  await runTransaction(key, 'readwrite', (store) => store.put({
    key,
    data,
    file: savedFile,
    updatedAt: Date.now()
  }));
});

export const clearFormDraft = (key) => enqueueOperation(key, () => (
  runTransaction(key, 'readwrite', (store) => store.delete(key))
));
