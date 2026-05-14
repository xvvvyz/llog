import type { EntryRecord } from '@/features/records/types/entry';
import * as React from 'react';

const recordsById = new Map<string, EntryRecord>();
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const cacheRecords = (records: EntryRecord[]) => {
  let changed = false;

  for (const record of records) {
    if (!record.id) continue;
    recordsById.set(record.id, record);
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
