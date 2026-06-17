import { PickedFileAsset } from '@/features/files/lib/picked';
import { api, apiOrThrow } from '@/lib/api';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as tusUpload from '@/features/files/lib/tus-upload';

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
        'Tus-Resumable': tusUpload.TUS_VERSION,
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

export const directVideoUpload = async ({
  asset,
  fileId,
  onProgress,
  order,
  path,
}: {
  asset: PickedFileAsset;
  fileId?: string;
  onProgress?: (fraction: number) => void;
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
    const { blob } = source;

    const patchChunk = blob
      ? ({ length, offset }: { length: number; offset: number }) =>
          tusUpload.patchWebChunk({
            blob,
            length,
            offset,
            uploadURL: created.uploadURL,
          })
      : ({ length, offset }: { length: number; offset: number }) =>
          patchNativeChunk({
            fileUri: asset.uri,
            length,
            offset,
            tempUri: `${FileSystem.cacheDirectory}tus-${created.fileId}.part`,
            uploadURL: created.uploadURL,
          });

    await tusUpload.uploadToStreamUrl({
      onProgress,
      patchChunk,
      size: source.size,
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
