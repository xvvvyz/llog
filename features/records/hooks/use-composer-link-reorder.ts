import * as outboxStore from '@/features/offline/outbox-store';
import * as queuedLinks from '@/features/offline/queued-links';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import * as React from 'react';

type OrderedComposerLink = {
  id: string;
  localStatus?: unknown;
  order?: number | null;
};

type ComposerLinkReorderOptions = {
  shouldReorderQueuedDraftLinks: boolean;
  shouldReorderQueuedLinks: boolean;
};

export const useComposerLinkReorder = ({
  shouldReorderQueuedDraftLinks,
  shouldReorderQueuedLinks,
}: ComposerLinkReorderOptions) =>
  React.useCallback(
    (links: OrderedComposerLink[]) => {
      const orderedIds = links.map((link) => link.id);

      const persistedLinks = links.filter(
        (link) => !queuedLinks.isQueuedLinkLocalStatus(link.localStatus)
      );

      if (shouldReorderQueuedDraftLinks) {
        outboxStore.reorderQueuedDraftLinks(orderedIds);
      }

      if (shouldReorderQueuedLinks) outboxStore.reorderQueuedLinks(orderedIds);
      if (persistedLinks.length) void reorderLinks(persistedLinks);
    },
    [shouldReorderQueuedDraftLinks, shouldReorderQueuedLinks]
  );
