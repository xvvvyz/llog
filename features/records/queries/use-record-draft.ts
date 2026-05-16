import * as recordIdentity from '@/domain/records/identity-fields';
import { recordDraftQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
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
  const outbox = useOutbox();
  const creatingDraftKeyRef = React.useRef<string | undefined>(undefined);

  const [createdDraft, setCreatedDraft] = React.useState<{
    date: string;
    id: string;
    key: string;
    logId: string;
    needsIdentityReplay: boolean;
    teamId?: string;
  } | null>(null);

  const { data: logData } = db.useQuery(
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

  const { data } = db.useQuery(
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
  const logTeamId = log?.teamId ?? teamId;
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
  const draftCreationKey = logId ? `record:${logId}` : undefined;

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

  const record = queriedRecord ?? fallbackRecord;
  const hasRecord = !!record;

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
    const targetLogId = logId;
    const targetTeamId = logTeamId;

    if (
      hasRecord ||
      !draftCreationKey ||
      !targetLogId ||
      creatingDraftKeyRef.current === draftCreationKey
    ) {
      return;
    }

    const createLocalDraft = () => {
      setCreatedDraft({
        date: new Date().toISOString(),
        id: id(),
        key: draftCreationKey,
        logId: targetLogId,
        needsIdentityReplay: true,
        teamId: targetTeamId,
      });
    };

    creatingDraftKeyRef.current = draftCreationKey;

    if (!targetTeamId || !profile.id) {
      createLocalDraft();
      return;
    }

    const createDraft = async () => {
      try {
        const recordId = await createRecordDraft({
          logId: targetLogId,
          profileId: profile.id,
          teamId: targetTeamId,
        });

        if (!recordId) {
          createLocalDraft();
          return;
        }

        setCreatedDraft({
          date: new Date().toISOString(),
          id: recordId,
          key: draftCreationKey,
          logId: targetLogId,
          needsIdentityReplay: false,
          teamId: targetTeamId,
        });
      } catch {
        createLocalDraft();
      }
    };

    void createDraft();
  }, [draftCreationKey, hasRecord, logTeamId, logId, profile.id]);

  const files = record?.files ?? [];
  const links = record?.links ?? [];
  return { ...record, links, files, isLoading: false };
};
