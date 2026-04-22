import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ImagePickerAsset } from 'expo-image-picker';

export type PickedMediaType = 'audio' | 'image' | 'video';

export type PickedMediaAsset = {
  file?: File;
  fileName?: string | null;
  height?: number;
  mimeType?: string | null;
  type: PickedMediaType;
  uri: string;
  width?: number;
};

export const FILE_PICKER_MIME_TYPES = ['image/*', 'video/*', 'audio/*'];

const IMAGE_FILE_EXTENSIONS = new Set([
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

const VIDEO_FILE_EXTENSIONS = new Set([
  'avi',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'webm',
]);

const AUDIO_FILE_EXTENSIONS = new Set([
  'aac',
  'flac',
  'm4a',
  'mp3',
  'oga',
  'ogg',
  'wav',
  'weba',
]);

const getFileExtension = (value?: string | null) => {
  if (!value) return null;

  const match = value.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/);
  return match?.[1] ?? null;
};

export const inferPickedMediaType = ({
  fileName,
  mimeType,
  type,
  uri,
}: {
  fileName?: string | null;
  mimeType?: string | null;
  type?: string | null;
  uri?: string | null;
}): PickedMediaType | null => {
  if (type === 'audio') return 'audio';
  if (type === 'image' || type === 'livePhoto') return 'image';
  if (type === 'pairedVideo' || type === 'video') return 'video';

  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';

  const extension = getFileExtension(fileName) ?? getFileExtension(uri);

  if (!extension) return null;
  if (AUDIO_FILE_EXTENSIONS.has(extension)) return 'audio';
  if (IMAGE_FILE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_FILE_EXTENSIONS.has(extension)) return 'video';

  return null;
};

export const normalizeImagePickerAsset = (
  asset: ImagePickerAsset
): PickedMediaAsset | null => {
  const type = inferPickedMediaType({
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    type: asset.type,
    uri: asset.uri,
  });

  if (!type) return null;

  return {
    fileName: asset.fileName,
    height: asset.height,
    mimeType: asset.mimeType,
    type,
    uri: asset.uri,
    width: asset.width,
  };
};

export const normalizeDocumentPickerAsset = (
  asset: DocumentPickerAsset
): PickedMediaAsset | null => {
  const type = inferPickedMediaType({
    fileName: asset.name,
    mimeType: asset.mimeType,
    uri: asset.uri,
  });

  if (!type) return null;

  return {
    file: asset.file,
    fileName: asset.name,
    mimeType: asset.mimeType,
    type,
    uri: asset.uri,
  };
};

export const isVisualPickedMedia = (asset: PickedMediaAsset) =>
  asset.type === 'image' || asset.type === 'video';
