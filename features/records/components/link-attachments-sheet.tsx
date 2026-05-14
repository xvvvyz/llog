import { LinkAttachments } from '@/features/records/components/link-attachments';
import { useConnectivity } from '@/features/offline/connectivity';
import { useOutbox } from '@/features/offline/outbox-hooks';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as sheetPayloads from '@/features/records/lib/sheet-payloads';
import { deleteLink } from '@/features/records/mutations/delete-link';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';

export const LinkAttachmentsSheet = () => {
  const sheetManager = useSheetManager();
  const { isOffline } = useConnectivity();
  const outbox = useOutbox();

  const isOpen = sheetManager.isOpen(
    sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET
  );

  const parent =
    sheetPayloads.getRecordLinkAttachmentsSheetPayload(sheetManager)?.parent;

  const recordComposerContext = sheetManager.getContext('record-create');
  const recordComposerId = sheetManager.getId('record-create');
  const isRecord = parent?.type === 'record';
  const isReply = parent?.type === 'reply';

  const { data: recordData, isLoading: recordLoading } = db.useQuery(
    isOpen && parent && isRecord
      ? { records: { $: { where: { id: parent.id } }, links: {} } }
      : null
  );

  const { data: replyData, isLoading: replyLoading } = db.useQuery(
    isOpen && parent && isReply
      ? { replies: { $: { where: { id: parent.id } }, links: {} } }
      : null
  );

  const recordQueryKey = isOpen && parent && isRecord ? parent.id : undefined;
  const replyQueryKey = isOpen && parent && isReply ? parent.id : undefined;

  const hasCurrentRecordResult = useCurrentQueryResult(
    recordQueryKey,
    recordData
  );

  const hasCurrentReplyResult = useCurrentQueryResult(replyQueryKey, replyData);

  const pendingParent = React.useMemo(
    () =>
      parent
        ? outbox.submissions.find((submission) => {
            if (!pendingEntries.isActiveQueuedSubmission(submission)) {
              return false;
            }

            return parent.type === 'record'
              ? submission.type === 'record' &&
                  submission.contentId === parent.id
              : submission.type === 'reply' &&
                  submission.contentId === parent.id;
          })
        : undefined,
    [outbox.submissions, parent]
  );

  const queuedDraft = React.useMemo(
    () =>
      parent
        ? outbox.drafts.find(
            (draft) =>
              draft.type === parent.type && draft.contentId === parent.id
          )
        : undefined,
    [outbox.drafts, parent]
  );

  const links = React.useMemo(
    () =>
      pendingParent
        ? pendingParent.links
        : queuedDraft?.linksUpdated
          ? queuedDraft.links
          : isRecord
            ? hasCurrentRecordResult
              ? (recordData?.records?.find((record) => record.id === parent?.id)
                  ?.links ?? [])
              : (parent?.links ?? [])
            : isReply && hasCurrentReplyResult
              ? (replyData?.replies?.find((reply) => reply.id === parent?.id)
                  ?.links ?? [])
              : (parent?.links ?? []),
    [
      hasCurrentRecordResult,
      hasCurrentReplyResult,
      isRecord,
      isReply,
      parent,
      pendingParent,
      queuedDraft,
      recordData?.records,
      replyData?.replies,
    ]
  );

  const hasLoadedParent = isRecord
    ? !!pendingParent ||
      !!queuedDraft ||
      !!parent?.teamId ||
      (hasCurrentRecordResult &&
        !!recordData?.records?.find((record) => record.id === parent?.id))
    : isReply
      ? !!pendingParent ||
        !!queuedDraft ||
        !!parent?.teamId ||
        (hasCurrentReplyResult &&
          !!replyData?.replies?.find((reply) => reply.id === parent?.id))
      : false;

  const isSheetLoading = isRecord
    ? !pendingParent &&
      !isOffline &&
      !!recordQueryKey &&
      (recordLoading || !hasCurrentRecordResult)
    : isReply
      ? !pendingParent &&
        !isOffline &&
        !!replyQueryKey &&
        (replyLoading || !hasCurrentReplyResult)
      : false;

  const areActionsDisabled =
    isOffline &&
    isRecord &&
    recordComposerContext === 'edit' &&
    recordComposerId === parent?.id &&
    !pendingParent;

  const close = React.useCallback(() => {
    sheetManager.close(sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET);
  }, [sheetManager]);

  React.useEffect(() => {
    if (isOpen && hasLoadedParent && !links.length) close();
  }, [close, hasLoadedParent, isOpen, links.length]);

  const handleDeleteLink = React.useCallback(
    (linkId: string) => {
      const isQueuedSubmissionLink = outbox.submissions.some((submission) =>
        submission.links.some((link) => link.id === linkId)
      );

      const isQueuedDraftLink = outbox.drafts.some((draft) =>
        draft.links.some((link) => link.id === linkId)
      );

      outboxStore.removeQueuedLink(linkId);
      outboxStore.removeQueuedDraftLink(linkId);
      if (isQueuedSubmissionLink || (isQueuedDraftLink && isOffline)) return;
      void deleteLink({ id: linkId });
    },
    [isOffline, outbox.drafts, outbox.submissions]
  );

  const handleReorderLinks = React.useCallback((links: { id: string }[]) => {
    const orderedIds = links.map((link) => link.id);
    void reorderLinks(links);
    outboxStore.reorderQueuedLinks(orderedIds);
    outboxStore.reorderQueuedDraftLinks(orderedIds);
  }, []);

  return (
    <LinkAttachments
      actionsDisabled={areActionsDisabled}
      hideTrigger
      links={links}
      onDeleteLink={handleDeleteLink}
      onReorderLinks={handleReorderLinks}
      parent={parent ? { ...parent, links } : undefined}
      portalName={sheetPayloads.RECORD_LINK_ATTACHMENTS_SHEET}
      sheetLoading={isSheetLoading}
      sheetOpen={isOpen}
      onSheetOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
};
