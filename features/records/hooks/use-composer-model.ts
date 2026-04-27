import { useLogColor } from '@/features/logs/hooks/use-color';
import { useMediaComposer } from '@/features/media/hooks/use-composer';
import type { PickedMediaAsset } from '@/features/media/lib/picked';
import { updateDocumentName } from '@/features/media/mutations/update-document-name';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { useComposerLinkAttachments } from '@/features/records/hooks/use-composer-link-attachments';
import { useIgnoredDraftIds } from '@/features/records/hooks/use-ignored-draft-ids';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import type { RecordSheetParent } from '@/features/records/lib/sheet-payloads';
import { deleteRecordMedia } from '@/features/records/mutations/delete-record-media';
import { publishRecord } from '@/features/records/mutations/publish-record';
import { updateRecordDraft } from '@/features/records/mutations/update-record-draft';
import { uploadRecordMedia } from '@/features/records/mutations/upload-record-media';
import { useRecordDraft } from '@/features/records/queries/use-record-draft';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { db } from '@/lib/db';
import * as React from 'react';

export const useRecordComposerModel = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = React.useState(false);
  const { ignoreDraftId, ignoredDraftIds } = useIgnoredDraftIds();
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const isEdit = sheetManager.getContext('record-create') === 'edit';
  const isOpen = sheetManager.isOpen('record-create');
  const sheetId = sheetManager.getId('record-create');
  const logId = isEdit ? undefined : sheetId;
  const editRecordId = isEdit ? sheetId : undefined;
  const draft = useRecordDraft({ ignoredDraftIds, logId });

  const { data: editData } = db.useQuery(
    editRecordId
      ? {
          records: {
            $: { where: { id: editRecordId } },
            media: {},
            links: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const queriedEditRecord = editData?.records?.[0];

  const editRecord =
    queriedEditRecord?.id === editRecordId ? queriedEditRecord : undefined;

  const record = isEdit ? editRecord : draft;
  const recordId = record?.id;
  const recordLogId = isEdit ? editRecord?.log?.id : logId;
  const logColor = useLogColor({ id: recordLogId });
  const currentText = record?.text ?? '';
  const links = record?.links ?? [];

  const { latestTextRef, setLatestText } = useComposerLatestText({
    isTextareaFocused,
    text: currentText,
  });

  const handleChangeText = React.useCallback(
    (nextText: string) => {
      setLatestText(nextText);

      if (isEdit) {
        if (recordId) {
          void db.transact(db.tx.records[recordId].update({ text: nextText }));
        }

        return;
      }

      void updateRecordDraft({ id: recordId, text: nextText });
    },
    [isEdit, recordId, setLatestText]
  );

  const handleUploadMedia = React.useCallback(
    async (asset: PickedMediaAsset, mediaId: string, order: number) => {
      await uploadRecordMedia({ asset, mediaId, order, recordId });
    },
    [recordId]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId });
    },
    [recordId]
  );

  const handleRenameMedia = React.useCallback(
    async (mediaId: string, name: string) => {
      await updateDocumentName({ id: mediaId, name });
    },
    []
  );

  const attachmentParent = React.useMemo<RecordSheetParent | undefined>(
    () => (recordId ? { id: recordId, type: 'record' } : undefined),
    [recordId]
  );

  const { linkAttachmentCount, linkPreview, linkToolbarItems } =
    useComposerLinkAttachments({ links, parent: attachmentParent });

  const { isBusy, mediaCount, mediaPreview, toolbar } = useMediaComposer({
    extraAttachmentCount: linkAttachmentCount,
    extraPreview: linkPreview,
    extraToolbarItems: linkToolbarItems,
    isOpen,
    media: record?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
    onRenameMedia: handleRenameMedia,
    onUploadMedia: handleUploadMedia,
    recordId,
  });

  const hasContent = !!currentText.trim() || mediaCount > 0;

  const close = React.useCallback(() => {
    sheetManager.close('record-create');
    setIsTextareaFocused(false);
  }, [sheetManager]);

  const handleSubmit = React.useCallback(async () => {
    const text = latestTextRef.current.trim();
    if ((!text && mediaCount === 0) || !recordId) return;

    if (isEdit) {
      await db.transact(db.tx.records[recordId].update({ text }));
      close();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await updateRecordDraft({ id: recordId, text });
      await publishRecord({ id: recordId });
      ignoreDraftId(recordId);
      requestPostSubmitScroll({ id: recordLogId, scope: 'log', target: 'top' });
      close();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    close,
    ignoreDraftId,
    isEdit,
    latestTextRef,
    mediaCount,
    recordId,
    recordLogId,
  ]);

  return {
    currentText,
    hasContent,
    isBusy,
    isOpen,
    isSubmitting,
    isTextareaFocused,
    loading: isEdit ? !editRecord : !!logId && !draft.id,
    logColor: logColor.default,
    mediaCount,
    mediaPreview,
    onChangeText: handleChangeText,
    onDismiss: close,
    onSubmit: handleSubmit,
    onTextareaFocusChange: setIsTextareaFocused,
    submitLabel: isEdit ? 'Done' : 'Record',
    toolbar,
  };
};
