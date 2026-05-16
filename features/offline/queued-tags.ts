import type * as types from '@/features/offline/types';

export type QueuedTagSnapshotInput = types.QueuedTagSnapshot;

export const toQueuedTagSnapshot = ({
  color,
  id,
  name,
  order,
  teamId,
  type,
}: QueuedTagSnapshotInput): types.QueuedTagSnapshot => ({
  color,
  id,
  name,
  order,
  teamId,
  type,
});

export const toQueuedTagSnapshots = (tags: QueuedTagSnapshotInput[] = []) =>
  tags.map(toQueuedTagSnapshot);

export const isQueuedTagSnapshot = (
  tag: Partial<types.QueuedTagSnapshot>
): tag is types.QueuedTagSnapshot =>
  typeof tag.color === 'number' &&
  typeof tag.id === 'string' &&
  typeof tag.name === 'string' &&
  typeof tag.order === 'number' &&
  typeof tag.teamId === 'string' &&
  typeof tag.type === 'string';
