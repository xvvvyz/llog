import * as recordIdentity from '@/domain/records/identity-fields';
import { recordDraftQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import { createRecordDraft } from '@/features/records/mutations/create-record-draft';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useRecordDraft = ({
  ignoredDraftIds,
  logId,
  teamId,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  logId?: string;
  teamId?: string;
}) => {
  const profile = useProfile();
  const connectivity = useConnectivity();
  const outbox = useOutbox();
  const creatingDraftKeyRef = React.useRef<string | undefined>(undefined);

  const [createdDraft, setCreatedDraft] = React.useState<{
    date: string;
    id: string;
    key: string;
    logId: string;
    needsIdentityReplay: boolean;
    teamId: string;
  } | null>(null);

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

  const logTeamId = log?.teamId ?? teamId;
  const needsLogTeamLookup = !teamId;
  const needsDraftLookupBeforeCreate = !teamId;
  const queryKey = logId && profile.id ? `${profile.id}:${logId}` : undefined;
  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const records = queryKey && hasCurrentResult ? (data?.records ?? []) : [];

  const outboxDraftIds = React.useMemo(
    () =>
      new Set(
        outbox.submissions
          .filter(
            (submission) =>
              submission.type === 'record' && submission.logId === logId
          )
          .map((submission) => submission.contentId)
      ),
    [logId, outbox.submissions]
  );

  const reusableRecords = records.filter(
    (item) =>
      item.id && !ignoredDraftIds?.has(item.id) && !outboxDraftIds.has(item.id)
  );

  const queriedRecord = reusableRecords.find((item) => item.log?.id === logId);

  const draftCreationKey =
    logId && profile.id && logTeamId
      ? `${profile.id}:${logId}:${logTeamId}`
      : undefined;

  const fallbackRecord = React.useMemo(():
    | (typeof records)[number]
    | undefined => {
    if (!createdDraft || createdDraft.key !== draftCreationKey) return;

    if (
      ignoredDraftIds?.has(createdDraft.id) ||
      outboxDraftIds.has(createdDraft.id)
    ) {
      return;
    }

    return {
      date: createdDraft.date,
      files: [],
      id: createdDraft.id,
      isDraft: true,
      links: [],
      log: { id: createdDraft.logId },
      needsIdentityReplay: createdDraft.needsIdentityReplay,
      tags: [],
      teamId: createdDraft.teamId,
      text: '',
    } as (typeof records)[number];
  }, [createdDraft, draftCreationKey, ignoredDraftIds, outboxDraftIds]);

  const record = !connectivity.canRunNetworkActions
    ? fallbackRecord
    : (queriedRecord ?? fallbackRecord);

  const hasRecord = !!record;

  const hasStaleResult =
    !!logId && hasCurrentResult && reusableRecords.length > 0 && !hasRecord;

  const draftIsLoading =
    !!queryKey &&
    connectivity.canRunNetworkActions &&
    (isLoading || !hasCurrentResult || hasStaleResult);

  React.useEffect(() => {
    if (!queriedRecord) return;
    creatingDraftKeyRef.current = undefined;
    setCreatedDraft(null);
  }, [queriedRecord]);

  React.useEffect(() => {
    if (!createdDraft) return;

    if (
      !ignoredDraftIds?.has(createdDraft.id) &&
      !outboxDraftIds.has(createdDraft.id)
    ) {
      return;
    }

    if (creatingDraftKeyRef.current === createdDraft.key) {
      creatingDraftKeyRef.current = undefined;
    }

    setCreatedDraft(null);
  }, [createdDraft, ignoredDraftIds, outboxDraftIds]);

  React.useEffect(() => {
    if (
      (needsDraftLookupBeforeCreate && draftIsLoading) ||
      (needsLogTeamLookup &&
        (logIsLoading || !hasCurrentLogResult || hasStaleLogResult)) ||
      hasRecord ||
      !draftCreationKey ||
      !logTeamId ||
      !logId ||
      !profile.id ||
      creatingDraftKeyRef.current === draftCreationKey
    ) {
      return;
    }

    const createLocalDraft = () => {
      setCreatedDraft({
        date: new Date().toISOString(),
        id: id(),
        key: draftCreationKey,
        logId,
        needsIdentityReplay: true,
        teamId: logTeamId,
      });
    };

    creatingDraftKeyRef.current = draftCreationKey;

    if (!connectivity.canRunNetworkActions) {
      createLocalDraft();
      return;
    }

    const createDraft = async () => {
      try {
        const recordId = await createRecordDraft({
          logId,
          profileId: profile.id,
          teamId: logTeamId,
        });

        if (!recordId) return;

        setCreatedDraft({
          date: new Date().toISOString(),
          id: recordId,
          key: draftCreationKey,
          logId,
          needsIdentityReplay: !connectivity.canRunNetworkActions,
          teamId: logTeamId,
        });
      } catch {
        createLocalDraft();
      }
    };

    void createDraft();
  }, [
    draftCreationKey,
    draftIsLoading,
    hasCurrentLogResult,
    hasStaleLogResult,
    logIsLoading,
    logTeamId,
    logId,
    needsDraftLookupBeforeCreate,
    needsLogTeamLookup,
    hasRecord,
    connectivity.canRunNetworkActions,
    profile.id,
  ]);

  const files = record?.files ?? [];
  const links = record?.links ?? [];
  return { ...record, links, files, isLoading: draftIsLoading };
};
