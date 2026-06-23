import * as React from 'react';

type LocallyDeletedRecord = { id: string; logId: string };
const recordsById = new Map<string, LocallyDeletedRecord>();
const listeners = new Set<() => void>();
let snapshot: readonly LocallyDeletedRecord[] = [];

const emit = () => {
  snapshot = [...recordsById.values()];
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getLocallyDeletedRecords = () => snapshot;

export const hideLocallyDeletedRecord = ({
  id,
  logId,
}: LocallyDeletedRecord) => {
  if (!id || !logId) return;
  const current = recordsById.get(id);
  if (current?.logId === logId) return;
  recordsById.set(id, { id, logId });
  emit();
};

export const restoreLocallyDeletedRecord = (id?: string) => {
  if (!id || !recordsById.delete(id)) return;
  emit();
};

export const clearObservedLocallyDeletedRecords = ({
  logId,
  recordIds,
}: {
  logId?: string;
  recordIds: Set<string>;
}) => {
  if (!logId) return;
  let changed = false;

  for (const record of recordsById.values()) {
    if (record.logId !== logId) continue;
    if (recordIds.has(record.id)) continue;
    recordsById.delete(record.id);
    changed = true;
  }

  if (changed) emit();
};

export const useLocallyDeletedRecordIds = ({ logId }: { logId?: string }) => {
  const records = React.useSyncExternalStore(
    subscribe,
    getLocallyDeletedRecords,
    getLocallyDeletedRecords
  );

  return React.useMemo(
    () =>
      records
        .filter((record) => record.logId === logId)
        .map((record) => record.id),
    [logId, records]
  );
};
