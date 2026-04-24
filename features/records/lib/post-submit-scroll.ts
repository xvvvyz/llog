import * as React from 'react';

type ScrollScope = 'log' | 'record';
type ScrollTarget = 'top' | 'end';
const listeners = new Set<() => void>();
const pendingScrolls = new Map<string, ScrollTarget>();
const getKey = (scope: ScrollScope, id?: string) => `${scope}:${id ?? ''}`;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitChange = () => {
  for (const listener of listeners) listener();
};

export const requestPostSubmitScroll = ({
  id,
  scope,
  target,
}: {
  id?: string;
  scope: ScrollScope;
  target: ScrollTarget;
}) => {
  if (!id) return;
  pendingScrolls.set(getKey(scope, id), target);
  emitChange();
};

export const clearPostSubmitScroll = ({
  id,
  scope,
}: {
  id?: string;
  scope: ScrollScope;
}) => {
  if (!id) return;
  if (pendingScrolls.delete(getKey(scope, id))) emitChange();
};

export const usePostSubmitScroll = ({
  id,
  scope,
}: {
  id?: string;
  scope: ScrollScope;
}) =>
  React.useSyncExternalStore(subscribe, () =>
    id ? (pendingScrolls.get(getKey(scope, id)) ?? null) : null
  );
