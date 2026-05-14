import type * as pickedFiles from '@/features/files/lib/picked';
import * as persistence from '@/features/offline/persistence';
import { Platform } from 'react-native';
import type * as types from '@/features/offline/types';

const OUTBOX_DB_NAME = 'llog-offline-outbox';
const OUTBOX_DB_VERSION = 1;
const METADATA_STORE = 'metadata';
const BLOB_STORE = 'blobs';
const NATIVE_OUTBOX_DIR = 'llog-outbox';
type LegacyFileSystem = typeof import('expo-file-system/legacy');

type AsyncStorageModule =
  typeof import('@react-native-async-storage/async-storage').default;

type BinaryInput =
  | { asset: pickedFiles.PickedFileAsset; audioUri?: never; duration?: never }
  | { asset?: never; audioUri: string; duration?: number };

let asyncStoragePromise: Promise<AsyncStorageModule> | undefined;
let fileSystemPromise: Promise<LegacyFileSystem> | undefined;
let indexedDbPromise: Promise<IDBDatabase | null> | undefined;
let memoryPersistedOutbox: types.PersistedOutbox | null = null;
const runtimeObjectUrls = new Map<string, string>();

const loadAsyncStorage = async () => {
  const module = await import('@react-native-async-storage/async-storage');
  return module.default;
};

const getAsyncStorage = () => {
  asyncStoragePromise ??= loadAsyncStorage();
  return asyncStoragePromise;
};

const getFileSystem = () => {
  fileSystemPromise ??= import('expo-file-system/legacy');
  return fileSystemPromise;
};

const canUseIndexedDb = () =>
  Platform.OS === 'web' && typeof indexedDB !== 'undefined';

const openIndexedDb = () => {
  if (!canUseIndexedDb()) return Promise.resolve(null);

  indexedDbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
    const request = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }

      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };

    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });

  return indexedDbPromise;
};

const idbRequest = <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> =>
  (async () => {
    const db = await openIndexedDb();

    return new Promise<T | undefined>((resolve, reject) => {
      if (!db) {
        resolve(undefined);
        return;
      }

      const transaction = db.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  })();

const idbGet = async <T>(storeName: string, key: IDBValidKey) =>
  idbRequest<T>(storeName, 'readonly', (store) => store.get(key));

const idbSet = async <T>(storeName: string, key: IDBValidKey, value: T) => {
  await idbRequest<IDBValidKey>(storeName, 'readwrite', (store) =>
    store.put(value, key)
  );
};

const idbDelete = async (storeName: string, key: IDBValidKey) => {
  await idbRequest<undefined>(storeName, 'readwrite', (store) =>
    store.delete(key)
  );
};

const normalizeForOwner = (
  value: types.PersistedOutbox | null | undefined,
  ownerUserId?: string
) => {
  const outbox = persistence.normalizePersistedOutbox(value);
  if (!ownerUserId) return outbox;

  if (outbox.ownerUserId && outbox.ownerUserId !== ownerUserId) {
    return { ...persistence.emptyPersistedOutbox(), ownerUserId };
  }

  return { ...outbox, ownerUserId };
};

export const readPersistedOutbox = async (
  ownerUserId?: string
): Promise<types.PersistedOutbox> => {
  const scopedKey = persistence.getPersistedOutboxStorageKey(ownerUserId);

  if (Platform.OS === 'web') {
    const metadata = await idbGet<types.PersistedOutbox>(
      METADATA_STORE,
      scopedKey
    );

    if (metadata) return normalizeForOwner(metadata, ownerUserId);

    if (ownerUserId) {
      const legacyMetadata = await idbGet<types.PersistedOutbox>(
        METADATA_STORE,
        persistence.getPersistedOutboxStorageKey()
      );

      if (legacyMetadata) return normalizeForOwner(legacyMetadata, ownerUserId);
    }

    return normalizeForOwner(memoryPersistedOutbox, ownerUserId);
  }

  const storage = await getAsyncStorage();
  const value = await storage.getItem(scopedKey);

  if (value) {
    return normalizeForOwner(
      persistence.parsePersistedOutbox(value),
      ownerUserId
    );
  }

  if (ownerUserId) {
    return normalizeForOwner(
      persistence.parsePersistedOutbox(
        await storage.getItem(persistence.getPersistedOutboxStorageKey())
      ),
      ownerUserId
    );
  }

  return normalizeForOwner(undefined, ownerUserId);
};

export const writePersistedOutbox = async (outbox: types.PersistedOutbox) => {
  const storageKey = persistence.getPersistedOutboxStorageKey(
    outbox.ownerUserId
  );

  if (Platform.OS === 'web') {
    const db = await openIndexedDb();

    if (db) {
      await idbSet(METADATA_STORE, storageKey, outbox);
      return;
    }

    memoryPersistedOutbox = outbox;
    return;
  }

  const storage = await getAsyncStorage();
  await storage.setItem(storageKey, JSON.stringify(outbox));
};

const getFileExtension = ({
  mimeType,
  name,
  uri,
}: {
  mimeType?: string | null;
  name?: string | null;
  uri?: string | null;
}) => {
  const value = name ?? uri;
  const match = value?.match(/\.([a-z0-9]+)(?:$|[?#])/i);
  if (match?.[1]) return `.${match[1].toLowerCase()}`;
  if (mimeType?.startsWith('image/')) return `.${mimeType.slice(6)}`;
  if (mimeType?.startsWith('video/')) return `.${mimeType.slice(6)}`;
  if (mimeType?.startsWith('audio/')) return `.${mimeType.slice(6)}`;
  return '';
};

const hasAssetInput = (
  input: BinaryInput
): input is { asset: pickedFiles.PickedFileAsset } => !!input.asset;

const getInputUri = (input: BinaryInput) =>
  hasAssetInput(input) ? input.asset.uri : input.audioUri;

const getInputName = (input: BinaryInput) =>
  hasAssetInput(input) ? input.asset.fileName : 'recording';

const getInputMimeType = (input: BinaryInput) =>
  hasAssetInput(input) ? input.asset.mimeType : undefined;

const saveWebBinary = async (fileId: string, input: BinaryInput) => {
  const blob =
    hasAssetInput(input) && input.asset.file
      ? input.asset.file
      : await (await fetch(getInputUri(input))).blob();

  const db = await openIndexedDb();
  if (db) await idbSet(BLOB_STORE, fileId, blob);
  const objectUrl = URL.createObjectURL(blob);
  const existingUrl = runtimeObjectUrls.get(fileId);
  if (existingUrl) URL.revokeObjectURL(existingUrl);
  runtimeObjectUrls.set(fileId, objectUrl);

  return {
    localUri: objectUrl,
    mimeType: blob.type || getInputMimeType(input) || undefined,
    size: blob.size,
  };
};

const saveNativeBinary = async (fileId: string, input: BinaryInput) => {
  const FileSystem = await getFileSystem();
  const baseDirectory = FileSystem.documentDirectory;
  if (!baseDirectory) throw new Error('File storage is unavailable.');
  const directory = `${baseDirectory}${NATIVE_OUTBOX_DIR}/`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  } catch {
    // The directory may already exist on some native file-system versions.
  }

  const extension = getFileExtension({
    mimeType: getInputMimeType(input),
    name: getInputName(input),
    uri: getInputUri(input),
  });

  const localUri = `${directory}${fileId}${extension}`;
  await FileSystem.copyAsync({ from: getInputUri(input), to: localUri });
  const info = await FileSystem.getInfoAsync(localUri);

  return {
    localUri,
    mimeType: getInputMimeType(input) ?? undefined,
    size: info.exists && !info.isDirectory ? info.size : undefined,
  };
};

export const saveAttachmentBinary = async (
  fileId: string,
  input: BinaryInput
) => {
  if (Platform.OS === 'web') return saveWebBinary(fileId, input);
  return saveNativeBinary(fileId, input);
};

export const getAttachmentRuntimeUri = async (
  attachment: types.QueuedAttachment
) => {
  if (Platform.OS !== 'web') return attachment.localUri;
  const existingUrl = runtimeObjectUrls.get(attachment.id);
  if (existingUrl) return existingUrl;
  const blob = await idbGet<Blob>(BLOB_STORE, attachment.id);
  if (!blob) return attachment.localUri;
  const objectUrl = URL.createObjectURL(blob);
  runtimeObjectUrls.set(attachment.id, objectUrl);
  return objectUrl;
};

export const deleteAttachmentBinary = async (
  fileId: string,
  localUri?: string
) => {
  if (Platform.OS === 'web') {
    const objectUrl = runtimeObjectUrls.get(fileId);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    runtimeObjectUrls.delete(fileId);
    await idbDelete(BLOB_STORE, fileId);
    return;
  }

  if (!localUri) return;
  const FileSystem = await getFileSystem();

  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch {
    // Best-effort cleanup: stale local previews should not block outbox sync.
  }
};
