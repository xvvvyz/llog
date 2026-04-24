import type { Media } from '@/features/media/types/media';
import type { UseMediaComposerOptions } from '@/features/media/types/media-composer.types';
import * as React from 'react';

type PendingDeletion = { requestId: number };

export const useMediaPendingDeletions = ({
  media,
  onDeleteMedia,
  scopeKey,
}: Pick<UseMediaComposerOptions, 'media' | 'onDeleteMedia'> & {
  scopeKey: string;
}) => {
  const [isDeleteTransitioning, startDeleteTransition] = React.useTransition();
  const nextDeleteRequestIdRef = React.useRef(0);

  const [pendingDeletions, setPendingDeletions] = React.useState<
    Record<string, PendingDeletion>
  >({});

  React.useEffect(() => {
    setPendingDeletions({});
  }, [scopeKey]);

  const handleDeleteMedia = React.useCallback(
    (mediaId: string) => {
      const requestId = ++nextDeleteRequestIdRef.current;

      setPendingDeletions((current) => ({
        ...current,
        [mediaId]: { requestId },
      }));

      startDeleteTransition(() => {
        void onDeleteMedia(mediaId).catch(() => {
          setPendingDeletions((current) => {
            const entry = current[mediaId];
            if (!entry || entry.requestId !== requestId) return current;
            const next = { ...current };
            delete next[mediaId];
            return next;
          });
        });
      });
    },
    [onDeleteMedia, startDeleteTransition]
  );

  React.useEffect(() => {
    setPendingDeletions((current) => {
      let didChange = false;
      const mediaIds = new Set(media.map((item: Media) => item.id));
      const next = { ...current };

      for (const mediaId of Object.keys(current)) {
        if (!mediaIds.has(mediaId)) {
          delete next[mediaId];
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [media]);

  return { handleDeleteMedia, isDeleteTransitioning, pendingDeletions };
};
