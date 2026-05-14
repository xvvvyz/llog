import type * as types from '@/features/offline/types';

export const normalizeOptionalString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export const normalizeOptionalNumber = (value?: number | null) =>
  value != null && Number.isFinite(value) ? value : undefined;

export const normalizeQueuedFileSnapshots = (
  files: types.QueuedFileSnapshot[] = []
) =>
  files
    .filter((file) => file.id && file.type)
    .map(
      ({
        assetKey,
        duration,
        id,
        isIdentifying,
        isTranscribing,
        mimeType,
        name,
        order,
        size,
        thumbnailUri,
        tracks,
        transcript,
        type,
        uri,
      }) =>
        ({
          ...(assetKey != null ? { assetKey } : {}),
          ...(duration != null ? { duration } : {}),
          id,
          ...(isIdentifying != null ? { isIdentifying } : {}),
          ...(isTranscribing != null ? { isTranscribing } : {}),
          ...(mimeType != null ? { mimeType } : {}),
          ...(name != null ? { name } : {}),
          order: normalizeOptionalNumber(order) ?? 0,
          ...(size != null ? { size } : {}),
          ...(thumbnailUri != null ? { thumbnailUri } : {}),
          ...(tracks != null ? { tracks } : {}),
          ...(transcript != null ? { transcript } : {}),
          type,
          ...(uri != null ? { uri } : {}),
        }) as types.QueuedFileSnapshot
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const upsertQueuedFileSnapshot = (
  files: types.QueuedFileSnapshot[],
  file?: types.QueuedFileSnapshot
) => {
  const [normalizedFile] = normalizeQueuedFileSnapshots(
    file ? [file] : undefined
  );

  if (!normalizedFile) return files;

  return normalizeQueuedFileSnapshots([
    ...files.filter((item) => item.id !== normalizedFile.id),
    normalizedFile,
  ]);
};
