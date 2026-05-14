import { visibleFileQuery } from '@/domain/files/query';
import { useFileComposer } from '@/features/files/hooks/use-composer';
import type { PickedFileAsset } from '@/features/files/lib/picked';
import { useConnectivity } from '@/features/offline/connectivity';
import * as localEntry from '@/features/offline/local-entry';
import { reorderFiles } from '@/features/files/mutations/reorder-files';
import { updateDocumentName } from '@/features/files/mutations/update-document-name';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedLinks from '@/features/offline/queued-links';
import { useProfile } from '@/features/account/queries/use-profile';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { reorderLinks } from '@/features/records/mutations/reorder-links';
import { updateReplyDraft } from '@/features/records/mutations/update-reply-draft';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { useRecord } from '@/features/records/queries/use-record';
import { useReplyDraft } from '@/features/records/queries/use-reply-draft';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';
import * as outboxHooks from '@/features/offline/outbox-hooks';

const getReplyCreatePayload = (
  value: unknown
): { teamId?: string } | undefined =>
  value && typeof value === 'object'
    ? (value as { teamId?: string })
    : undefined;

export const useReplyComposerModel = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const profile = useProfile();
  const outbox = outboxHooks.useOutbox();
  const connectivity = useConnectivity();
  const editRecordId = sheetManager.getContext('reply-create');
  const isEdit = !!editRecordId;
  const sheetId = sheetManager.getId('reply-create');
  const recordId = isEdit ? editRecordId : sheetId;
  const editReplyId = isEdit ? sheetId : undefined;

  const createPayload = getReplyCreatePayload(
    sheetManager.getPayload('reply-create')
  );

  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });

  const draft = useReplyDraft({
    ignoredDraftIds,
    recordId: isEdit ? undefined : recordId,
    teamId: createPayload?.teamId,
  });

  const { data: editData } = db.useQuery(
    editReplyId
      ? {
          replies: {
            $: { where: { id: editReplyId } },
            files: visibleFileQuery,
            links: {},
          },
        }
      : null
  );

  const queriedEditReply = editData?.replies?.[0];

  const localEditReply = record.replies.find(
    (reply) => reply.id === editReplyId
  );

  const pendingEditReply = React.useMemo(
    () =>
      editReplyId
        ? outbox.submissions
            .filter(
              (
                submission
              ): submission is Extract<
                (typeof outbox.submissions)[number],
                { type: 'reply' }
              > =>
                submission.type === 'reply' &&
                submission.contentId === editReplyId &&
                pendingEntries.isActiveQueuedSubmission(submission)
            )
            .map((submission) =>
              pendingEntries.queuedReplyToEntry({
                attachments: outbox.attachments,
                profile,
                submission,
              })
            )[0]
        : undefined,
    [editReplyId, outbox.attachments, outbox.submissions, profile]
  );

  const editReply =
    pendingEditReply?.id === editReplyId
      ? pendingEditReply
      : queriedEditReply?.id === editReplyId
        ? queriedEditReply
        : localEditReply;

  const reply = isEdit ? editReply : draft;
  const replyId = reply?.id;
  const isEditingLocalReply = isEdit && localEntry.hasLocalStatus(editReply);
  const isOpen = sheetManager.isOpen('reply-create');
  const currentText = reply?.text ?? '';
  const replyTeamId = reply?.teamId ?? record.teamId;

  const shouldReplayReplyDraftIdentity =
    isEditingLocalReply || (!isEdit && localEntry.needsIdentityReplay(reply));

  const replyDraftUpdateFields = React.useMemo(
    () =>
      shouldReplayReplyDraftIdentity
        ? {
            authorId: profile.id,
            date: reply?.date,
            recordId,
            teamId: replyTeamId,
          }
        : {},
    [
      profile.id,
      recordId,
      reply?.date,
      replyTeamId,
      shouldReplayReplyDraftIdentity,
    ]
  );

  const draftParent = React.useMemo(
    () =>
      replyId ? { parentId: replyId, parentType: 'reply' as const } : undefined,
    [replyId]
  );

  const queuedDraft = outboxHooks.useQueuedDraft(draftParent);

  const queuedReplyDraft =
    queuedDraft?.type === 'reply' ? queuedDraft : undefined;

  const links = React.useMemo(
    () =>
      queuedReplyDraft?.linksUpdated
        ? queuedReplyDraft.links
        : (reply?.links ?? []),
    [queuedReplyDraft?.links, queuedReplyDraft?.linksUpdated, reply?.links]
  );

  const { displayText, latestTextRef, setLatestText } = useComposerLatestText({
    resetKey: replyId,
    text: currentText,
  });

  const handleUploadFile = React.useCallback(
    async (asset: PickedFileAsset, fileId: string, order: number) => {
      await uploadReplyFile({ asset, fileId, order, recordId, replyId });
    },
    [recordId, replyId]
  );

  const handleDeleteFile = React.useCallback(
    async (fileId: string) => {
      await deleteReplyFile({ fileId, recordId, replyId });
    },
    [recordId, replyId]
  );

  const handleRenameFile = React.useCallback(
    async (fileId: string, name: string) => {
      await updateDocumentName({ id: fileId, name });
    },
    []
  );

  const handleReorderFiles = React.useCallback((files: { id: string }[]) => {
    void reorderFiles(files);
  }, []);

  const handleReorderLinks = React.useCallback((links: { id: string }[]) => {
    const orderedIds = links.map((link) => link.id);
    outboxStore.reorderQueuedDraftLinks(orderedIds);
    outboxStore.reorderQueuedLinks(orderedIds);
    void reorderLinks(links);
  }, []);

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () =>
      replyId && recordId
        ? { id: replyId, recordId, teamId: reply?.teamId, type: 'reply' }
        : undefined,
    [recordId, reply?.teamId, replyId]
  );

  const { linkAttachmentCount, linkPreview, linkToolbarItems } =
    useComposerLinkAttachments({
      links,
      onReorderLinks: handleReorderLinks,
      parent: attachmentParent,
    });

  const { isBusy, fileCount, filePreview, toolbar } = useFileComposer({
    extraAttachmentCount: linkAttachmentCount,
    extraPreview: linkPreview,
    extraToolbarItems: linkToolbarItems,
    isOpen,
    files: reply?.files ?? [],
    onDeleteFile: handleDeleteFile,
    onOpenAudio: () =>
      sheetManager.open('record-audio', replyId, `reply:${recordId}`),
    onRenameFile: handleRenameFile,
    onReorderFiles: handleReorderFiles,
    onUploadFile: handleUploadFile,
    recordId,
    replyId,
  });

  const hasContent = !!displayText.trim() || fileCount > 0;

  const handleChangeText = React.useCallback(
    (nextText: string) => {
      setLatestText(nextText);
      if (!replyId) return;

      if (isEdit && !isEditingLocalReply) {
        void db.transact(db.tx.replies[replyId].update({ text: nextText }));
        return;
      }

      if (!connectivity.canRunNetworkActions) return;

      void updateReplyDraft({
        ...replyDraftUpdateFields,
        id: replyId,
        text: nextText,
      }).catch((error) => {
        if (connectivity.canRunNetworkActions) {
          console.error('Failed to update reply draft', error);
        }
      });
    },
    [
      connectivity.canRunNetworkActions,
      isEdit,
      isEditingLocalReply,
      replyDraftUpdateFields,
      replyId,
      setLatestText,
    ]
  );

  const close = React.useCallback(() => {
    sheetManager.close('reply-create');
    setIsTextareaFocused(false);
  }, [sheetManager]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();
    if (isBusy || (!text && fileCount === 0) || !replyId || !recordId) return;

    if (isEdit) {
      const patchQueuedReply = () => {
        outboxStore.updateQueuedSubmission(`reply:${replyId}`, (submission) =>
          submission.type === 'reply'
            ? { links: links.map(queuedLinks.toQueuedLinkSnapshot), text }
            : {}
        );
      };

      if (isEditingLocalReply) {
        patchQueuedReply();

        outboxStore.clearQueuedDraft({
          parentId: replyId,
          parentType: 'reply',
        });

        if (connectivity.canRunNetworkActions) {
          const updateLocalReplyDraft = async () => {
            try {
              await updateReplyDraft({
                ...replyDraftUpdateFields,
                id: replyId,
                text,
              });
            } catch (error) {
              console.error('Failed to update local reply draft', error);
            }
          };

          void updateLocalReplyDraft();
        }

        close();
        return;
      }

      await db.transact(db.tx.replies[replyId].update({ text }));
      patchQueuedReply();
      close();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (connectivity.canRunNetworkActions) {
        await updateReplyDraft({
          ...replyDraftUpdateFields,
          id: replyId,
          text,
        });
      }

      outboxHooks.queueSubmission({
        authorId: profile.id,
        contentId: replyId,
        files: reply?.files ?? [],
        links: links.map(queuedLinks.toQueuedLinkSnapshot),
        needsDraftReplay: !connectivity.canRunNetworkActions,
        recordId,
        teamId: replyTeamId,
        text,
        type: 'reply',
      });

      outboxStore.clearQueuedDraft({ parentId: replyId, parentType: 'reply' });
      ignoreDraftId(replyId);

      requestPostSubmitScroll({
        id: recordId,
        scope: 'record',
        target: { replyId, type: 'reply' },
      });

      close();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    close,
    ignoreDraftId,
    isEdit,
    isEditingLocalReply,
    isBusy,
    connectivity.canRunNetworkActions,
    latestTextRef,
    fileCount,
    profile.id,
    recordId,
    reply?.files,
    replyDraftUpdateFields,
    replyTeamId,
    replyId,
    links,
  ]);

  return {
    currentText: displayText,
    hasContent,
    isBusy,
    isOpen,
    isSubmitting,
    isTextareaFocused,
    loading: isEdit ? !editReply : !!recordId && !draft.id,
    logColor: logColor?.default,
    fileCount,
    filePreview,
    onChangeText: handleChangeText,
    onDismiss: close,
    onSubmit: handleSubmit,
    onTextareaFocusChange: setIsTextareaFocused,
    submitLabel: isEdit ? 'Done' : 'Reply',
    toolbar,
  };
};
