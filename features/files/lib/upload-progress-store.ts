import * as React from 'react';

// Ephemeral, per-device upload progress keyed by file id. This ticks many times
// a second during an upload and is purely presentational, so it deliberately
// lives outside the outbox/InstantDB and is never persisted.
const progressByFileId = new Map<string, number>();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getProgress = (fileId: string) => progressByFileId.get(fileId);

export const setUploadProgress = (fileId: string, fraction: number) => {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const current = progressByFileId.get(fileId);
  // Monotonic until cleared: a chunk retry resumes from the server's real
  // offset, which can be behind what we already reported. Ignore those backward
  // jumps so the bar only ever advances.
  if (current != null && clamped <= current) return;
  progressByFileId.set(fileId, clamped);
  emit();
};

export const clearUploadProgress = (fileId: string) => {
  if (!progressByFileId.delete(fileId)) return;
  emit();
};

export const useUploadProgress = (fileId: string) =>
  React.useSyncExternalStore(
    subscribe,
    () => getProgress(fileId),
    () => getProgress(fileId)
  );
