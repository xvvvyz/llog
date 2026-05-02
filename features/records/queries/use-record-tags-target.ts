import { db } from '@/lib/db';
import * as React from 'react';

const getPayloadLogId = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('logId' in payload)) return;
  const logId = (payload as { logId?: unknown }).logId;
  return typeof logId === 'string' && logId.trim() ? logId : undefined;
};

export const useRecordTagsTarget = ({
  payload,
  recordId,
}: {
  payload: unknown;
  recordId?: string;
}) => {
  const payloadLogId = getPayloadLogId(payload);

  const { data, isLoading } = db.useQuery(
    recordId
      ? {
          records: {
            $: { where: { id: recordId } },
            author: { $: { fields: ['id'] } },
            log: { $: { fields: ['id'] } },
            tags: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const records = data?.records ?? [];
  const record = records.find((item) => item.id === recordId);
  const hasStaleResult = !!recordId && records.length > 0 && !record;

  const selectedTagIds = React.useMemo(
    () => new Set(record?.tags?.map((tag) => tag.id) ?? []),
    [record?.tags]
  );

  return {
    isLoading: isLoading || hasStaleResult,
    logId: record?.log?.id ?? payloadLogId,
    record,
    selectedTagIds,
    teamId: record?.teamId,
  };
};
