import { visibleFileQuery } from '@/domain/files/query';
import { useProfile } from '@/features/account/queries/use-profile';
import { createReplyDraft } from '@/features/records/mutations/create-reply-draft';
import { useRecord } from '@/features/records/queries/use-record';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import { id } from '@instantdb/react-native';
import * as React from 'react';

export const useReplyDraft = ({
  ignoredDraftIds,
  recordId,
}: {
  ignoredDraftIds?: ReadonlySet<string>;
  recordId?: string;
}) => {
  const profile = useProfile();
  const record = useRecord({ id: recordId });
  const replyIdRef = React.useRef(id());

  const { data, isLoading } = db.useQuery(
    recordId && profile.id
      ? {
          replies: {
            $: {
              where: { author: profile.id, record: recordId, isDraft: true },
            },
            files: visibleFileQuery,
            links: {},
            record: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const queryKey =
    recordId && profile.id ? `${profile.id}:${recordId}` : undefined;

  const hasCurrentResult = useCurrentQueryResult(queryKey, data);
  const replies = queryKey && hasCurrentResult ? (data?.replies ?? []) : [];

  const reply = replies.find(
    (item) =>
      item.id && item.record?.id === recordId && !ignoredDraftIds?.has(item.id)
  );

  const hasStaleResult =
    !!recordId && hasCurrentResult && replies.length > 0 && !reply;

  const draftIsLoading =
    !!queryKey && (isLoading || !hasCurrentResult || hasStaleResult);

  React.useEffect(() => {
    if (draftIsLoading || record.isLoading || reply || !record.teamId) return;
    replyIdRef.current = id();

    createReplyDraft({
      replyId: replyIdRef.current,
      recordId,
      profileId: profile.id,
      teamId: record.teamId,
    });
  }, [
    draftIsLoading,
    record.isLoading,
    record.teamId,
    recordId,
    reply,
    profile.id,
  ]);

  const files = reply?.files ?? [];
  const links = reply?.links ?? [];
  return { ...reply, links, files, isLoading: draftIsLoading };
};
