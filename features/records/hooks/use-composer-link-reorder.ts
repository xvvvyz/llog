import * as outboxStore from '@/features/offline/outbox-store';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import * as React from 'react';

type ComposerLinkReorderOptions = {
  shouldReorderQueuedDraftLinks: boolean;
  shouldReorderQueuedLinks: boolean;
};

export const useComposerLinkReorder = ({
  shouldReorderQueuedDraftLinks,
  shouldReorderQueuedLinks,
}: ComposerLinkReorderOptions) =>
  React.useCallback(
    (links: { id: string }[]) => {
      const orderedIds = links.map((link) => link.id);

      if (shouldReorderQueuedDraftLinks) {
        outboxStore.reorderQueuedDraftLinks(orderedIds);
      }

      if (shouldReorderQueuedLinks) outboxStore.reorderQueuedLinks(orderedIds);
      void reorderLinks(links);
    },
    [shouldReorderQueuedDraftLinks, shouldReorderQueuedLinks]
  );
