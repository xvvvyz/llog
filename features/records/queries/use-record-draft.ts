import * as recordIdentity from '@/domain/records/identity-fields';
import { recordDraftQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { createRecordDraft } from '@/features/records/mutations/create-record-draft';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

export const useRecordDraft = ({
  ignoredDraftIds,
  logId,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  logId?: string;
}) => {
  const profile = useProfile();
  const creatingDraftKeyRef = React.useRef<string | undefined>(undefined);

  const { data: logData, isLoading: logIsLoading } = db.useQuery(
    logId
      ? {
          logs: {
            $: {
              fields: ['id' as const, 'teamId' as const],
              where: { id: logId },
            },
          },
        }
      : null
  );

  const { data, isLoading } = db.useQuery(
    logId && profile.id
      ? {
          records: {
            $: {
              where: recordIdentity.getDraftRecordLookupWhere({
                authorId: profile.id,
                logId,
              }),
            },
            ...recordDraftQuery,
          },
        }
      : null
  );

  const hasCurrentLogResult = useCurrentQueryResult(logId, logData);
  const logs = logId && hasCurrentLogResult ? (logData?.logs ?? []) : [];
  const log = logs.find((item) => item.id === logId);

  const hasStaleLogResult =
    !!logId && hasCurrentLogResult && logs.length > 0 && !log;

  const logTeamId = log?.teamId;
  const queryKey = logId && profile.id ? `${profile.id}:${logId}` : undefined;
  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const records = queryKey && hasCurrentResult ? (data?.records ?? []) : [];

  const record = records.find(
    (item) =>
      item.id && item.log?.id === logId && !ignoredDraftIds?.has(item.id)
  );

  const hasStaleResult =
    !!logId && hasCurrentResult && records.length > 0 && !record;

  const draftIsLoading =
    !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult);

  const draftCreationKey =
    logId && profile.id && logTeamId
      ? `${profile.id}:${logId}:${logTeamId}`
      : undefined;

  React.useEffect(() => {
    if (record) creatingDraftKeyRef.current = undefined;
  }, [record]);

  React.useEffect(() => {
    if (
      draftIsLoading ||
      logIsLoading ||
      !hasCurrentLogResult ||
      hasStaleLogResult ||
      record ||
      !draftCreationKey ||
      !logTeamId ||
      !logId ||
      !profile.id ||
      creatingDraftKeyRef.current === draftCreationKey
    ) {
      return;
    }

    creatingDraftKeyRef.current = draftCreationKey;

    void createRecordDraft({ logId, profileId: profile.id, teamId: logTeamId })
      .then(() => undefined)
      .catch((error) => {
        if (creatingDraftKeyRef.current === draftCreationKey) {
          creatingDraftKeyRef.current = undefined;
        }

        console.error('Failed to create record draft', error);
      });
  }, [
    draftCreationKey,
    draftIsLoading,
    hasCurrentLogResult,
    hasStaleLogResult,
    logIsLoading,
    logTeamId,
    logId,
    record,
    profile.id,
  ]);

  const files = record?.files ?? [];
  const links = record?.links ?? [];
  return { ...record, links, files, isLoading: draftIsLoading };
};
