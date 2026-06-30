import * as React from 'react';

type LocallyDeletedLog = { id: string; teamId?: string };
const logsById = new Map<string, LocallyDeletedLog>();
const listeners = new Set<() => void>();
let snapshot: readonly LocallyDeletedLog[] = [];

const emit = () => {
  snapshot = [...logsById.values()];
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getLocallyDeletedLogs = () => snapshot;

export const hideLocallyDeletedLog = ({ id, teamId }: LocallyDeletedLog) => {
  if (!id) return;
  const current = logsById.get(id);
  if (current?.teamId === teamId) return;
  logsById.set(id, { id, teamId });
  emit();
};

export const restoreLocallyDeletedLog = (id?: string) => {
  if (!id || !logsById.delete(id)) return;
  emit();
};

export const clearObservedLocallyDeletedLogs = ({
  logIds,
  teamIds,
}: {
  logIds: Set<string>;
  teamIds: Set<string>;
}) => {
  let changed = false;

  for (const log of logsById.values()) {
    if (log.teamId && !teamIds.has(log.teamId)) continue;
    if (logIds.has(log.id)) continue;
    logsById.delete(log.id);
    changed = true;
  }

  if (changed) emit();
};

export const useLocallyDeletedLogIds = () => {
  const logs = React.useSyncExternalStore(
    subscribe,
    getLocallyDeletedLogs,
    getLocallyDeletedLogs
  );

  return React.useMemo(() => logs.map((log) => log.id), [logs]);
};
