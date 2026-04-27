import { useFileComposer } from '@/features/files/hooks/use-composer';
import type { PickedFileAsset } from '@/features/files/lib/picked';
import { updateDocumentName } from '@/features/files/mutations/update-document-name';
import { useLogColor } from '@/features/logs/hooks/use-color';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteReplyFile } from '@/features/records/mutations/delete-reply-file';
import { publishReply } from '@/features/records/mutations/publish-reply';
import { uploadReplyFile } from '@/features/records/mutations/upload-reply-file';
import { useRecord } from '@/features/records/queries/use-record';
import { useReplyDraft } from '@/features/records/queries/use-reply-draft';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';

export const useReplyComposerModel = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const editRecordId = sheetManager.getContext('reply-create');
  const isEdit = !!editRecordId;
  const sheetId = sheetManager.getId('reply-create');
  const recordId = isEdit ? editRecordId : sheetId;
  const editReplyId = isEdit ? sheetId : undefined;
  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });

  const draft = useReplyDraft({
    ignoredDraftIds,
    recordId: isEdit ? undefined : recordId,
  });

  const { data: editData } = db.useQuery(
    editReplyId
      ? { replies: { $: { where: { id: editReplyId } }, files: {}, links: {} } }
      : null
  );

  const queriedEditReply = editData?.replies?.[0];

  const editReply =
    queriedEditReply?.id === editReplyId ? queriedEditReply : undefined;

  const reply = isEdit ? editReply : draft;
  const replyId = reply?.id;
  const isOpen = sheetManager.isOpen('reply-create');
  const currentText = reply?.text ?? '';
  const links = reply?.links ?? [];

  const { latestTextRef, setLatestText } = useComposerLatestText({
    isTextareaFocused,
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

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () =>
      replyId && recordId
        ? { id: replyId, recordId, type: 'reply' }
        : undefined,
    [recordId, replyId]
  );

  const { linkAttachmentCount, linkPreview, linkToolbarItems } =
    useComposerLinkAttachments({ links, parent: attachmentParent });

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
    onUploadFile: handleUploadFile,
    recordId,
    replyId,
  });

  const hasContent = !!currentText.trim() || fileCount > 0;

  const handleChangeText = React.useCallback(
    (nextText: string) => {
      setLatestText(nextText);
      if (!replyId) return;
      void db.transact(db.tx.replies[replyId].update({ text: nextText }));
    },
    [replyId, setLatestText]
  );

  const close = React.useCallback(() => {
    sheetManager.close('reply-create');
    setIsTextareaFocused(false);
  }, [sheetManager]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();
    if (isBusy || (!text && fileCount === 0) || !replyId) return;

    if (isEdit) {
      await db.transact(db.tx.replies[replyId].update({ text }));
      close();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await publishReply({ id: replyId, recordId, text });
      ignoreDraftId(replyId);
      requestPostSubmitScroll({ id: recordId, scope: 'record', target: 'end' });
      close();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    close,
    ignoreDraftId,
    isEdit,
    isBusy,
    latestTextRef,
    fileCount,
    recordId,
    replyId,
  ]);

  return {
    currentText,
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
