import { replyDraftQuery } from '@/domain/records/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import { createReplyDraft } from '@/features/records/mutations/create-reply-draft';
import { useRecord } from '@/features/records/queries/use-record';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useReplyDraft = ({
  ignoredDraftIds,
  recordId,
  teamId,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  recordId?: string;
  teamId?: string;
}) => {
  const profile = useProfile();
  const connectivity = useConnectivity();
  const outbox = useOutbox();
  const record = useRecord({ id: recordId });
  const replyIdRef = React.useRef(id());
  const creatingDraftKeyRef = React.useRef<string | undefined>(undefined);

  const [createdDraft, setCreatedDraft] = React.useState<{
    date: string;
    id: string;
    key: string;
    needsIdentityReplay: boolean;
    recordId: string;
    teamId: string;
  } | null>(null);

  const { data, isLoading } = db.useQuery(
    recordId && profile.id
      ? {
          replies: {
            $: {
              where: { author: profile.id, record: recordId, isDraft: true },
            },
            ...replyDraftQuery,
          },
        }
      : null
  );

  const queryKey =
    recordId && profile.id ? `${profile.id}:${recordId}` : undefined;

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const replies = queryKey && hasCurrentResult ? (data?.replies ?? []) : [];

  const outboxDraftIds = React.useMemo(
    () =>
      new Set(
        outbox.submissions
          .filter(
            (submission) =>
              submission.type === 'reply' && submission.recordId === recordId
          )
          .map((submission) => submission.contentId)
      ),
    [outbox.submissions, recordId]
  );

  const reusableReplies = replies.filter(
    (item) =>
      item.id && !ignoredDraftIds?.has(item.id) && !outboxDraftIds.has(item.id)
  );

  const queriedReply = reusableReplies.find(
    (item) => item.record?.id === recordId
  );

  const recordTeamId = record.teamId ?? teamId;

  const draftCreationKey =
    recordId && profile.id && recordTeamId
      ? `${profile.id}:${recordId}:${recordTeamId}`
      : undefined;

  const fallbackReply = React.useMemo(():
    | (typeof replies)[number]
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
      needsIdentityReplay: createdDraft.needsIdentityReplay,
      record: { id: createdDraft.recordId },
      teamId: createdDraft.teamId,
      text: '',
    } as (typeof replies)[number];
  }, [createdDraft, draftCreationKey, ignoredDraftIds, outboxDraftIds]);

  const reply = queriedReply ?? fallbackReply;
  const hasReply = !!reply;
  const isLocalParentRecord = !!record.localStatus;

  const hasStaleResult =
    !!recordId && hasCurrentResult && reusableReplies.length > 0 && !hasReply;

  const draftIsLoading =
    !!queryKey &&
    !isLocalParentRecord &&
    !connectivity.isOffline &&
    (isLoading || !hasCurrentResult || hasStaleResult);

  React.useEffect(() => {
    if (!queriedReply) return;
    creatingDraftKeyRef.current = undefined;
    setCreatedDraft(null);
  }, [queriedReply]);

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
    const teamId = recordTeamId;
    const targetRecordId = recordId;

    if (
      draftIsLoading ||
      isLocalParentRecord ||
      record.isLoading ||
      hasReply ||
      !teamId ||
      !targetRecordId ||
      !draftCreationKey ||
      creatingDraftKeyRef.current === draftCreationKey
    ) {
      return;
    }

    creatingDraftKeyRef.current = draftCreationKey;
    replyIdRef.current = id();

    const createLocalDraft = () => {
      setCreatedDraft({
        date: new Date().toISOString(),
        id: replyIdRef.current,
        key: draftCreationKey,
        needsIdentityReplay: true,
        recordId: targetRecordId,
        teamId,
      });
    };

    if (!connectivity.canRunNetworkActions) {
      createLocalDraft();
      return;
    }

    const createDraft = async () => {
      try {
        const replyId = replyIdRef.current;

        await createReplyDraft({
          replyId,
          recordId: targetRecordId,
          profileId: profile.id,
          teamId,
        });

        setCreatedDraft({
          date: new Date().toISOString(),
          id: replyId,
          key: draftCreationKey,
          needsIdentityReplay: !connectivity.canRunNetworkActions,
          recordId: targetRecordId,
          teamId,
        });
      } catch {
        createLocalDraft();
      }
    };

    void createDraft();
  }, [
    draftIsLoading,
    draftCreationKey,
    hasReply,
    connectivity.canRunNetworkActions,
    connectivity.isOffline,
    isLocalParentRecord,
    record.isLoading,
    recordTeamId,
    recordId,
    profile.id,
  ]);

  const files = reply?.files ?? [];
  const links = reply?.links ?? [];
  return { ...reply, links, files, isLoading: draftIsLoading };
};
