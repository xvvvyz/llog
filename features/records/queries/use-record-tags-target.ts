import { recordTagTargetQuery } from '@/domain/records/query';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
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
      ? { records: { $: { where: { id: recordId } }, ...recordTagTargetQuery } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(recordId, data);
  const records = recordId && hasCurrentResult ? (data?.records ?? []) : [];
  const record = records.find((item) => item.id === recordId);

  const hasStaleResult =
    !!recordId && hasCurrentResult && records.length > 0 && !record;

  const selectedTagIds = React.useMemo(
    () => new Set(record?.tags?.map((tag) => tag.id) ?? []),
    [record?.tags]
  );

  return {
    isLoading: !!recordId && (isLoading || !hasCurrentResult || hasStaleResult),
    logColor: record?.log?.color,
    logId: record?.log?.id ?? payloadLogId,
    record,
    selectedTagIds,
    teamId: record?.teamId,
  };
};
