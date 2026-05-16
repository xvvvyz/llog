import type { EntryRecord } from '@/features/records/types/entry';
import * as React from 'react';

const recordsById = new Map<string, EntryRecord>();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const mergeRecords = (
  current: EntryRecord | undefined,
  next: EntryRecord
): EntryRecord => {
  if (!current) return next;
  const merged = { ...current };

  for (const [key, value] of Object.entries(next) as [
    keyof EntryRecord,
    EntryRecord[keyof EntryRecord],
  ][]) {
    if (value !== undefined) merged[key] = value as never;
  }

  return {
    ...merged,
    files: next.files ?? current.files,
    links: next.links ?? current.links,
    reactions: next.reactions ?? current.reactions,
    replies: next.replies?.length ? next.replies : current.replies,
    tags: next.tags ?? current.tags,
  };
};

export const cacheRecords = (records: EntryRecord[]) => {
  let changed = false;

  for (const record of records) {
    if (!record.id) continue;

    recordsById.set(
      record.id,
      mergeRecords(recordsById.get(record.id), record)
    );

    changed = true;
  }

  if (changed) emit();
};

export const useCachedRecord = (id?: string) =>
  React.useSyncExternalStore(
    React.useCallback((listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }, []),
    () => (id ? recordsById.get(id) : undefined),
    () => (id ? recordsById.get(id) : undefined)
  );
