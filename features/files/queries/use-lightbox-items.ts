import { visibleFileQuery } from '@/domain/files/query';
import { type FileItem } from '@/features/files/types/file';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

const byOrder = (a: FileItem, b: FileItem) => (a.order ?? 0) - (b.order ?? 0);

const getVisualMedia = (files: FileItem[]) =>
  files
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
            $: { fields: ['id', 'teamId'], where: { id: recordId } },
            files: visibleFileQuery,
            log: { team: { $: { fields: ['id'] } } },
            replies: { files: visibleFileQuery },
          },
        }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(recordId, data);

  const record =
    recordId && hasCurrentResult
      ? data?.records?.find((item) => item.id === recordId)
      : undefined;

  const media = React.useMemo(() => {
    if (!mediaId || !record) return [];
    const recordMedia = getVisualMedia(record.files ?? []);
    if (recordMedia.some((item) => item.id === mediaId)) return recordMedia;

    for (const reply of record.replies ?? []) {
      const replyMedia = getVisualMedia(reply.files ?? []);
      if (replyMedia.some((item) => item.id === mediaId)) return replyMedia;
    }

    return [];
  }, [mediaId, record]);

  return {
    isLoading: !!recordId && (isLoading || !hasCurrentResult),
    media,
    teamId: record?.log?.team?.id ?? record?.teamId,
  };
};
