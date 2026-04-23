import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { useMediaComposer } from '@/features/media/hooks/use-media-composer';
import type { PickedMediaAsset } from '@/features/media/lib/picked-media';
import { useComposerLatestText } from '@/features/records/hooks/use-composer-latest-text';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
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
  const isSubmittingRef = React.useRef(false);
  const sheetManager = useSheetManager();
  const isEdit = sheetManager.getContext('record-create') === 'edit';
  const isOpen = sheetManager.isOpen('record-create');
  const sheetId = sheetManager.getId('record-create');

  const logId = isEdit ? undefined : sheetId;
  const editRecordId = isEdit ? sheetId : undefined;
  const draft = useRecordDraft({ logId });

  const { data: editData } = db.useQuery(
    editRecordId
      ? {
          records: {
            $: { where: { id: editRecordId } },
            media: {},
            log: { $: { fields: ['id'] } },
          },
        }
      : null
  );

  const editRecord = editData?.records?.[0];
  const record = isEdit ? editRecord : draft;
  const recordId = record?.id;
  const recordLogId = isEdit ? editRecord?.log?.id : logId;
  const logColor = useLogColor({ id: recordLogId });
  const currentText = record?.text ?? '';

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
      await uploadRecordMedia({
        asset,
        mediaId,
        order,
        recordId,
      });
    },
    [recordId]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteRecordMedia({ mediaId, recordId });
    },
    [recordId]
  );

  const { isBusy, mediaCount, mediaPreview, toolbar } = useMediaComposer({
    isOpen,
    media: record?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () => sheetManager.open('record-audio', recordId, 'record'),
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

      requestPostSubmitScroll({
        id: recordLogId,
        scope: 'log',
        target: 'top',
      });

      close();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [close, isEdit, latestTextRef, mediaCount, recordId, recordLogId]);

  return {
    currentText,
    hasContent,
    isBusy,
    isOpen,
    isSubmitting,
    isTextareaFocused,
    loading: isEdit ? !editRecord : !!logId && draft.log?.id !== logId,
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
