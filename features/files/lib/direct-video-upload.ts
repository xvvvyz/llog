import { PickedFileAsset } from '@/features/files/lib/picked';
import { api, apiOrThrow } from '@/lib/api';
import { wait } from '@/lib/async';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const TUS_VERSION = '1.0.0';
// Mobile uploads hit transient drops (e.g. NSURLError -1005). Retry the failed
// chunk a few times, resuming from the server's real offset, instead of losing
// the whole upload.
const MAX_CHUNK_RETRIES = 6;
// Cloudflare's tus endpoint rejects a single huge PATCH (HTTP 413), so the file
// is uploaded in chunks. The size is a multiple of 256 KiB and >= 5 MiB (tus
// requirements for non-final chunks) and small enough to stay well under the
// per-request limit while keeping per-chunk memory bounded.
const TUS_CHUNK_SIZE = 5 * 1024 * 1024;
type UploadSource = { blob?: Blob; size: number };

const resolveUploadSource = async (
  asset: PickedFileAsset
): Promise<UploadSource> => {
  if (Platform.OS === 'web') {
    if (asset.file) return { blob: asset.file, size: asset.file.size };
    const blob = await (await fetch(asset.uri)).blob();
    return { blob, size: blob.size };
  }

  // Always read the real size: the tus `Upload-Length` must exactly match the
  // bytes we stream, and `asset.size` (from the picker) can be stale or off.
  const info = await FileSystem.getInfoAsync(asset.uri);

  if (!info.exists || info.isDirectory) {
    throw new Error('Unable to read the video file');
  }

  return { size: info.size };
};

// Streams one chunk off disk via a temp file + BINARY_CONTENT upload
// (`uploadTask(fromFile:)`), so the chunk bytes never sit in JS/RN memory
// during the (slow) network send.
const patchNativeChunk = async ({
  fileUri,
  length,
  offset,
  tempUri,
  uploadURL,
}: {
  fileUri: string;
  length: number;
  offset: number;
  tempUri: string;
  uploadURL: string;
}) => {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
    length,
    position: offset,
  });

  await FileSystem.writeAsStringAsync(tempUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    const result = await FileSystem.uploadAsync(uploadURL, tempUri, {
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Tus-Resumable': TUS_VERSION,
        'Upload-Offset': String(offset),
      },
      httpMethod: 'PATCH',
      // Default is a background URLSession, which iOS defers/throttles and the
      // upload hangs indefinitely. Foreground runs it immediately.
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed: ${result.status}`);
    }
  } finally {
    await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {
      // noop
    });
  }
};

const patchWebChunk = async ({
  blob,
  length,
  offset,
  uploadURL,
}: {
  blob: Blob;
  length: number;
  offset: number;
  uploadURL: string;
}) => {
  const response = await fetch(uploadURL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/offset+octet-stream',
      'Tus-Resumable': TUS_VERSION,
      'Upload-Offset': String(offset),
    },
    body: blob.slice(offset, offset + length),
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
};

// Asks the tus server how many bytes it actually has, so a retry resumes from
// the real offset rather than re-sending (or skipping) bytes.
const getServerOffset = async (uploadURL: string) => {
  try {
    const response = await fetch(uploadURL, {
      method: 'HEAD',
      headers: { 'Tus-Resumable': TUS_VERSION },
    });

    if (!response.ok) return null;
    const value = Number(response.headers.get('Upload-Offset'));
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
};

const uploadToStreamUrl = async ({
  fileUri,
  source,
  tempUri,
  uploadURL,
}: {
  fileUri: string;
  source: UploadSource;
  tempUri: string;
  uploadURL: string;
}) => {
  let offset = 0;
  let retries = 0;

  while (offset < source.size) {
    const length = Math.min(TUS_CHUNK_SIZE, source.size - offset);

    try {
      if (source.blob) {
        await patchWebChunk({ blob: source.blob, length, offset, uploadURL });
      } else {
        await patchNativeChunk({ fileUri, length, offset, tempUri, uploadURL });
      }
    } catch (error) {
      retries += 1;
      if (retries > MAX_CHUNK_RETRIES) throw error;
      await wait(1000 * retries);
      const serverOffset = await getServerOffset(uploadURL);
      if (serverOffset != null) offset = serverOffset;
      continue;
    }

    // A 2xx tus PATCH means the whole chunk was accepted.
    offset += length;
    retries = 0;
  }
};

export const directVideoUpload = async ({
  asset,
  fileId,
  order,
  path,
}: {
  asset: PickedFileAsset;
  fileId?: string;
  order?: number;
  path: string;
}) => {
  const source = await resolveUploadSource(asset);
  let createdFileId: string | undefined;

  try {
    const response = await apiOrThrow(
      `${path}/video-upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, order, size: source.size }),
      },
      'Failed to create video upload'
    );

    const created = (await response.json()) as {
      fileId: string;
      streamUid: string;
      uploadURL: string;
    };

    createdFileId = created.fileId;

    await uploadToStreamUrl({
      fileUri: asset.uri,
      source,
      tempUri: `${FileSystem.cacheDirectory}tus-${created.fileId}.part`,
      uploadURL: created.uploadURL,
    });
  } catch (error) {
    if (createdFileId) {
      await api(`${path}/${createdFileId}`, { method: 'DELETE' }).catch(() => {
        // noop
      });
    }

    throw error;
  }
};
