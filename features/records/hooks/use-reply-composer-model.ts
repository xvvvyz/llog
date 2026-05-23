import { visibleFileQuery } from '@/domain/files/query';
import { useFileComposer } from '@/features/files/hooks/use-composer';
import * as localEntry from '@/features/offline/local-entry';
import { useLogColor } from '@/features/logs/hooks/use-color';
import * as outboxStore from '@/features/offline/outbox-store';
import * as pendingEntries from '@/features/offline/pending-entries';
import * as queuedLinks from '@/features/offline/queued-links';
import { useProfile } from '@/features/account/queries/use-profile';
import { useComposerFileCallbacks } from '@/features/records/hooks/use-composer-file-callbacks';
import { useComposerLinkReorder } from '@/features/records/hooks/use-composer-link-reorder';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { updateReplyDraft } from '@/features/records/mutations/update-reply-draft';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { useRecord } from '@/features/records/queries/use-record';
import { useReplyDraft } from '@/features/records/queries/use-reply-draft';
import { useMyRole } from '@/features/teams/queries/use-my-role';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useSheetSubmitState } from '@/hooks/use-sheet-submit-state';
import { db } from '@/lib/db';
import * as React from 'react';
import * as outboxHooks from '@/features/offline/outbox-hooks';
import { useOutboxNetworkReachability } from '@/features/offline/outbox-network';
import * as outboxSyncCore from '@/features/offline/outbox-sync-core';
import * as composerTextSession from '@/features/records/hooks/use-composer-text-session';

export const useReplyComposerModel = () => {
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const sheetManager = useSheetManager();
  const profile = useProfile();
  const outbox = outboxHooks.useOutbox();
  const networkReachability = useOutboxNetworkReachability();
  const isOpen = sheetManager.isOpen('reply-create');
  const { isSubmitting, runSubmit } = useSheetSubmitState({ isOpen });

  const editRecordId = isOpen
    ? sheetManager.getContext('reply-create')
    : undefined;

  const isEdit = !!editRecordId;
  const sheetId = isOpen ? sheetManager.getId('reply-create') : undefined;
  const recordId = isEdit ? editRecordId : sheetId;
  const editReplyId = isEdit ? sheetId : undefined;

  const createPayload = isOpen
    ? sheetManager.getPayload('reply-create')
    : undefined;

  const record = useRecord({ id: isOpen ? recordId : undefined });
  const logColor = useLogColor({ id: record.log?.id });

  const myRole = useMyRole({
    teamId: record.teamId ?? createPayload?.teamId ?? null,
  });

  const draft = useReplyDraft({
    ignoredDraftIds,
    recordId: isOpen && !isEdit ? recordId : undefined,
    teamId: createPayload?.teamId,
  });

  const { data: editData } = db.useQuery(
    isOpen && editReplyId
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

  const canUpdateServerDraft =
    !shouldReplayReplyDraftIdentity && networkReachability === true;

  const updateServerReplyDraft = React.useCallback(
    (input: Parameters<typeof updateReplyDraft>[0]) => {
      if (!canUpdateServerDraft) return;
      void updateReplyDraft(input).catch(() => undefined);
    },
    [canUpdateServerDraft]
  );

  const draftParent = React.useMemo(
    () =>
      replyId ? { parentId: replyId, parentType: 'reply' as const } : undefined,
    [replyId]
  );

  const queuedDraft = outboxHooks.useQueuedDraft(draftParent);

  const queuedReplyDraft =
    queuedDraft?.type === 'reply' ? queuedDraft : undefined;

  const queuedReplyAttachments = React.useMemo(
    () =>
      replyId && recordId
        ? outboxStore.getQueuedAttachmentsForParent(outbox, {
            parentId: replyId,
            parentType: 'reply',
            recordId,
          })
        : [],
    [outbox, recordId, replyId]
  );

  const links = React.useMemo(
    () =>
      queuedReplyDraft?.linksUpdated
        ? queuedReplyDraft.links
        : (reply?.links ?? []),
    [queuedReplyDraft?.links, queuedReplyDraft?.linksUpdated, reply?.links]
  );

  const { displayText, latestTextRef, setLatestText } =
    composerTextSession.useComposerTextSession({
      getOpenResetKey: (openSessionKey) =>
        isEdit
          ? `edit:${editReplyId ?? ''}:${openSessionKey}`
          : `create:${recordId ?? ''}:${replyId ?? ''}:${openSessionKey}`,
      isOpen,
      text: currentText,
    });

  const {
    handleDeleteFile,
    handleRenameFile,
    handleReorderFiles,
    handleUploadFile,
  } = useComposerFileCallbacks({
    onDeleteFile: React.useCallback(
      async (fileId: string) => {
        await deleteReplyFile({ fileId, recordId, replyId });
      },
      [recordId, replyId]
    ),
    onUploadFile: React.useCallback(
      async (asset, fileId, order) => {
        await uploadReplyFile({ asset, fileId, order, recordId, replyId });
      },
      [recordId, replyId]
    ),
  });

  const handleReorderLinks = useComposerLinkReorder({
    shouldReorderQueuedDraftLinks: true,
    shouldReorderQueuedLinks: true,
  });

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
    deferQueuedUploads: !isEdit || shouldReplayReplyDraftIdentity,
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
  const canSubmitForm = isEdit || hasContent;

  const handleChangeText = composerTextSession.useComposerDraftTextChange({
    contentId: replyId,
    isEdit,
    isEditingLocalEntry: isEditingLocalReply,
    setLatestText,
    skipMissingContentId: true,
    updateLocalSubmissionText: (contentId, nextText) => {
      outboxStore.updateQueuedSubmission(`reply:${contentId}`, (submission) =>
        submission.type === 'reply' ? { text: nextText } : {}
      );
    },
    updateServerDraftText: (nextText) => {
      updateServerReplyDraft({
        ...replyDraftUpdateFields,
        id: replyId,
        text: nextText,
      });
    },
    updateServerEditText: (contentId, nextText) => {
      void db
        .transact(db.tx.replies[contentId].update({ text: nextText }))
        .catch(() => undefined);
    },
  });

  const close = React.useCallback(() => {
    sheetManager.close('reply-create');
    setIsTextareaFocused(false);
  }, [sheetManager]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();

    if (
      isBusy ||
      (!isEdit && !text && fileCount === 0) ||
      !replyId ||
      !recordId
    ) {
      return;
    }

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

        close();
        return;
      }

      try {
        await db.transact(db.tx.replies[replyId].update({ text }));
      } catch {
        patchQueuedReply();
        close();
        return;
      }

      if (queuedReplyAttachments.length > 0) {
        outboxHooks.queueSubmission({
          authorId: profile.id,
          contentId: replyId,
          files: reply?.files ?? [],
          links: links.map(queuedLinks.toQueuedLinkSnapshot),
          needsDraftReplay: false,
          recordId,
          teamId: replyTeamId,
          text,
          type: 'reply',
        });

        outboxStore.clearQueuedDraft({
          parentId: replyId,
          parentType: 'reply',
        });

        void outboxSyncCore.runOutboxSync();
      } else {
        patchQueuedReply();
      }

      close();
      return;
    }

    await runSubmit(async ({ keepPendingUntilClose }) => {
      outboxHooks.queueSubmission({
        authorId: profile.id,
        contentId: replyId,
        files: reply?.files ?? [],
        links: links.map(queuedLinks.toQueuedLinkSnapshot),
        needsDraftReplay: true,
        recordId,
        teamId: replyTeamId,
        text,
        type: 'reply',
      });

      outboxStore.clearQueuedDraft({ parentId: replyId, parentType: 'reply' });
      void outboxSyncCore.runOutboxSync();
      setLatestText('');
      ignoreDraftId(replyId);

      requestPostSubmitScroll({
        id: recordId,
        scope: 'record',
        target: { replyId, type: 'reply' },
      });

      close();
      keepPendingUntilClose();
    });
  }, [
    close,
    ignoreDraftId,
    isEdit,
    isEditingLocalReply,
    isBusy,
    latestTextRef,
    fileCount,
    profile.id,
    queuedReplyAttachments.length,
    recordId,
    reply?.files,
    replyTeamId,
    replyId,
    runSubmit,
    setLatestText,
    links,
  ]);

  return {
    currentText: displayText,
    hasContent: canSubmitForm,
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
    showFormattingControls: myRole.canManage,
    submitLabel: isEdit ? 'Done' : 'Reply',
    toolbar,
  };
};
