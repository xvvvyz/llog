import { type Media } from '@/features/media/types/media';
import { db } from '@/lib/db';
import * as React from 'react';

const byOrder = (a: Media, b: Media) => (a.order ?? 0) - (b.order ?? 0);

const getVisualMedia = (media: Media[]) =>
  media
    .filter((item) => item.type === 'image' || item.type === 'video')
    .sort(byOrder);

export const useLightboxMedia = ({
  mediaId,
  recordId,
}: {
  mediaId?: string;
  recordId?: string;
}) => {
  const { data, isLoading } = db.useQuery(
    recordId
      ? {
          records: {
            $: { where: { id: recordId } },
            media: {},
            replies: { media: {} },
          },
        }
      : null
  );

  const record = data?.records?.[0];

  const media = React.useMemo(() => {
    if (!mediaId || !record) return [];
    const recordMedia = getVisualMedia(record.media ?? []);
    if (recordMedia.some((item) => item.id === mediaId)) return recordMedia;

    for (const reply of record.replies ?? []) {
      const replyMedia = getVisualMedia(reply.media ?? []);
      if (replyMedia.some((item) => item.id === mediaId)) return replyMedia;
    }

    return [];
  }, [mediaId, record]);

  return { isLoading: !!recordId && isLoading, media };
};
