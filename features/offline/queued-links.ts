import type { Link } from '@/instant.entities';
import type * as types from '@/features/offline/types';

export type QueuedLinkSnapshotInput = Pick<
  Link,
  'id' | 'label' | 'order' | 'teamId' | 'url'
> & { localStatus?: unknown };

export const isQueuedLinkLocalStatus = (
  value: unknown
): value is NonNullable<types.QueuedLinkSnapshot['localStatus']> =>
  value === 'error' || value === 'pending';

export const toQueuedLinkSnapshot = (
  link: QueuedLinkSnapshotInput
): types.QueuedLinkSnapshot => {
  const localStatus = isQueuedLinkLocalStatus(link.localStatus)
    ? link.localStatus
    : undefined;

  return {
    id: link.id,
    label: link.label,
    ...(localStatus ? { localStatus } : {}),
    order: link.order,
    teamId: link.teamId,
    url: link.url,
  };
};

export const getReplayableQueuedLinks = (
  links: types.QueuedLinkSnapshot[] = []
) => links.filter((link) => isQueuedLinkLocalStatus(link.localStatus));
