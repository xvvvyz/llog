import { R2_MULTIPART_PART_SIZE } from '@/domain/files/r2-multipart';
import { getAudioAssetDuration } from '@/features/files/lib/audio-duration';
import { PickedFileAsset } from '@/features/files/lib/picked';
import { apiOrThrow } from '@/lib/api';
import { Platform } from 'react-native';

type R2MultipartFileType = 'audio' | 'document';
type UploadedPart = { etag: string; partNumber: number };

type UploadSource = {
  blob?: Blob;
  duration?: number;
  fileName?: string;
  mimeType?: string;
  size: number;
  type: R2MultipartFileType;
  uri?: string;
};

type CreatedMultipartUpload = {
  duration?: number;
  fileId: string;
  fileName?: string;
  mimeType?: string;
  order?: number;
  partSize?: number;
  size?: number;
  type: R2MultipartFileType;
  uploadId: string;
};

type MultipartUploadMetadata = {
  duration?: number;
  fileName?: string;
  fileId: string;
  mimeType?: string;
  order?: number;
  size?: number;
  type: R2MultipartFileType;
};

type LegacyFileSystem = typeof import('expo-file-system/legacy');
let fileSystemPromise: Promise<LegacyFileSystem> | undefined;

const getFileSystem = () => {
  fileSystemPromise ??= import('expo-file-system/legacy');
  return fileSystemPromise;
};

const isKnownSize = (size?: number | null): size is number =>
  Number.isFinite(size) && size != null && size >= 0;

const getBlob = async (uri: string) => {
  const response = await fetch(uri);
  return response.blob();
};

const getNativeFileSize = async (uri: string, fallback?: number | null) => {
  if (isKnownSize(fallback)) return fallback;
  const FileSystem = await getFileSystem();
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error('Unable to read file');
  return info.size;
};

const getPickedAudioDuration = async (
  asset: PickedFileAsset,
  duration?: number
) =>
  asset.type === 'audio'
    ? (duration ?? (await getAudioAssetDuration(asset)))
    : undefined;

const getUploadSource = async ({
  asset,
  audioUri,
  duration,
}: {
  asset?: PickedFileAsset;
  audioUri?: string;
  duration?: number;
}): Promise<UploadSource | null> => {
  if (audioUri) {
    if (Platform.OS === 'web') {
      const blob = await getBlob(audioUri);

      return {
        blob,
        duration,
        fileName: 'recording',
        mimeType: blob.type || 'audio/webm',
        size: blob.size,
        type: 'audio',
      };
    }

    return {
      duration,
      fileName: 'recording.m4a',
      mimeType: 'audio/mp4',
      size: await getNativeFileSize(audioUri),
      type: 'audio',
      uri: audioUri,
    };
  }

  if (!asset || (asset.type !== 'audio' && asset.type !== 'document')) {
    return null;
  }

  if (Platform.OS === 'web') {
    const blob = asset.file ?? (await getBlob(asset.uri));

    return {
      blob,
      duration: await getPickedAudioDuration(asset, duration),
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType || blob.type || undefined,
      size: blob.size,
      type: asset.type,
    };
  }

  return {
    duration: await getPickedAudioDuration(asset, duration),
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
    size: await getNativeFileSize(asset.uri, asset.size),
    type: asset.type,
    uri: asset.uri,
  };
};

const createMultipartUpload = async ({
  fileId,
  order,
  path,
  source,
}: {
  fileId?: string;
  order?: number;
  path: string;
  source: UploadSource;
}) => {
  const response = await apiOrThrow(
    `${path}/multipart-upload`,
    {
      body: JSON.stringify({
        duration: source.duration,
        fileName: source.fileName,
        fileId,
        mimeType: source.mimeType,
        order,
        size: source.size,
        type: source.type,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to create file upload'
  );

  return (await response.json()) as CreatedMultipartUpload;
};

const uploadPart = async ({
  body,
  encoding,
  fileId,
  partNumber,
  path,
  uploadId,
}: {
  body: BodyInit;
  encoding?: 'base64';
  fileId: string;
  partNumber: number;
  path: string;
  uploadId: string;
}) => {
  const params = new URLSearchParams({
    fileId,
    partNumber: String(partNumber),
    uploadId,
  });

  if (encoding) params.set('encoding', encoding);

  const response = await apiOrThrow(
    `${path}/multipart-upload/part?${params.toString()}`,
    {
      body,
      headers: {
        'Content-Type':
          encoding === 'base64' ? 'text/plain' : 'application/octet-stream',
      },
      method: 'PUT',
    },
    'Failed to upload file part'
  );

  return (await response.json()) as UploadedPart;
};

const uploadWebParts = async ({
  fileId,
  partSize,
  path,
  source,
  uploadId,
}: {
  fileId: string;
  partSize: number;
  path: string;
  source: UploadSource & { blob: Blob };
  uploadId: string;
}) => {
  const parts: UploadedPart[] = [];
  const partCount = Math.max(1, Math.ceil(source.size / partSize));

  for (let index = 0; index < partCount; index += 1) {
    const offset = index * partSize;
    const partNumber = index + 1;

    const chunk = source.blob.slice(
      offset,
      Math.min(offset + partSize, source.size),
      source.mimeType
    );

    parts.push(
      await uploadPart({ body: chunk, fileId, partNumber, path, uploadId })
    );
  }

  return parts;
};

const uploadNativeParts = async ({
  fileId,
  partSize,
  path,
  source,
  uploadId,
}: {
  fileId: string;
  partSize: number;
  path: string;
  source: UploadSource & { uri: string };
  uploadId: string;
}) => {
  const FileSystem = await getFileSystem();
  const parts: UploadedPart[] = [];
  const partCount = Math.max(1, Math.ceil(source.size / partSize));

  for (let index = 0; index < partCount; index += 1) {
    const offset = index * partSize;
    const partNumber = index + 1;
    const length = Math.min(partSize, Math.max(source.size - offset, 0));

    const body = await FileSystem.readAsStringAsync(source.uri, {
      encoding: FileSystem.EncodingType.Base64,
      length,
      position: offset,
    });

    parts.push(
      await uploadPart({
        body,
        encoding: 'base64',
        fileId,
        partNumber,
        path,
        uploadId,
      })
    );
  }

  return parts;
};

const completeMultipartUpload = async ({
  metadata,
  parts,
  path,
  uploadId,
}: {
  metadata: MultipartUploadMetadata;
  parts: UploadedPart[];
  path: string;
  uploadId: string;
}) => {
  await apiOrThrow(
    `${path}/multipart-upload/complete`,
    {
      body: JSON.stringify({ ...metadata, parts, uploadId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    'Failed to complete file upload'
  );
};

const abortMultipartUpload = async ({
  fileId,
  path,
  uploadId,
}: {
  fileId: string;
  path: string;
  uploadId: string;
}) => {
  await apiOrThrow(`${path}/multipart-upload/abort`, {
    body: JSON.stringify({ fileId, uploadId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch(() => {
    // Best-effort cleanup only; the original upload error should surface.
  });
};

export const uploadR2MultipartFile = async ({
  asset,
  audioUri,
  duration,
  fileId,
  order,
  path,
}: {
  asset?: PickedFileAsset;
  audioUri?: string;
  duration?: number;
  fileId?: string;
  order?: number;
  path: string;
}) => {
  const source = await getUploadSource({ asset, audioUri, duration });
  if (!source) return;
  const created = await createMultipartUpload({ fileId, order, path, source });
  const createdFileId = created.fileId;

  const partSize = Math.max(
    R2_MULTIPART_PART_SIZE,
    Math.round(created.partSize || R2_MULTIPART_PART_SIZE)
  );

  const metadata: MultipartUploadMetadata = {
    duration: created.duration ?? source.duration,
    fileName: created.fileName ?? source.fileName,
    fileId: createdFileId,
    mimeType: created.mimeType ?? source.mimeType,
    order: created.order ?? order,
    size: created.size ?? source.size,
    type: created.type,
  };

  try {
    const parts =
      Platform.OS === 'web'
        ? await uploadWebParts({
            fileId: createdFileId,
            partSize,
            path,
            source: source as UploadSource & { blob: Blob },
            uploadId: created.uploadId,
          })
        : await uploadNativeParts({
            fileId: createdFileId,
            partSize,
            path,
            source: source as UploadSource & { uri: string },
            uploadId: created.uploadId,
          });

    await completeMultipartUpload({
      metadata,
      parts,
      path,
      uploadId: created.uploadId,
    });
  } catch (error) {
    await abortMultipartUpload({
      fileId: createdFileId,
      path,
      uploadId: created.uploadId,
    });

    throw error;
  }
};
