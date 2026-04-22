import { useLogColor } from '@/features/logs/hooks/use-log-color';
import { useMediaComposer } from '@/features/media/hooks/use-media-composer';
import { PickedMediaAsset } from '@/features/media/lib/picked-media';
import { ReplyCreateSheetForm } from '@/features/records/components/reply-create-sheet-form';
import { requestPostSubmitScroll } from '@/features/records/lib/post-submit-scroll';
import { deleteReplyMedia } from '@/features/records/mutations/delete-reply-media';
import { publishReply } from '@/features/records/mutations/publish-reply';
import { updateReply } from '@/features/records/mutations/update-reply';
import { uploadReplyMedia } from '@/features/records/mutations/upload-reply-media';
import { useRecord } from '@/features/records/queries/use-record';
import { useReplyDraft } from '@/features/records/queries/use-reply-draft';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useWindowDimensions } from '@/hooks/use-window-dimensions';
import { db } from '@/lib/db';
import { Sheet } from '@/ui/sheet';
import * as React from 'react';
import { Platform } from 'react-native';

export const ReplyCreateSheet = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [text, setText] = React.useState('');
  const sheetManager = useSheetManager();
  const windowDimensions = useWindowDimensions();

  const editRecordId = sheetManager.getContext('reply-create');
  const isEdit = !!editRecordId;
  const sheetId = sheetManager.getId('reply-create');

  const recordId = isEdit ? editRecordId : sheetId;
  const editReplyId = isEdit ? sheetId : undefined;

  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const draft = useReplyDraft({ recordId: isEdit ? undefined : recordId });

  const { data: editData } = db.useQuery(
    editReplyId
      ? {
          replies: {
            $: { where: { id: editReplyId } },
            media: {},
          },
        }
      : null
  );

  const editReply = editData?.replies?.[0];
  const reply = isEdit ? editReply : draft;
  const replyId = reply?.id;

  const isOpen = sheetManager.isOpen('reply-create');

  React.useEffect(() => {
    if (isEdit && editReply?.text && isOpen) {
      setText(editReply.text);
    }
  }, [isEdit, editReply?.text, isOpen]);

  const handleUploadMedia = React.useCallback(
    async (asset: PickedMediaAsset, mediaId: string, order: number) => {
      await uploadReplyMedia({
        asset,
        replyId,
        mediaId,
        order,
        recordId,
      });
    },
    [replyId, recordId]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteReplyMedia({ replyId, mediaId, recordId });
    },
    [replyId, recordId]
  );

  const { isBusy, mediaCount, mediaPreview, toolbar } = useMediaComposer({
    replyId,
    isOpen,
    media: reply?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () =>
      sheetManager.open('record-audio', replyId, `reply:${recordId}`),
    onUploadMedia: handleUploadMedia,
    recordId,
  });

  const hasContent = !!text.trim() || mediaCount > 0;

  const nativeComposerMaxHeight =
    Platform.OS === 'web'
      ? undefined
      : Math.round(windowDimensions.height * 0.4);

  const nativeTextareaStyle =
    Platform.OS === 'web'
      ? undefined
      : {
          maxHeight: 180,
          minHeight: 120,
        };

  const handleSubmit = React.useCallback(async () => {
    if (!hasContent || !replyId) return;
    setIsSubmitting(true);

    try {
      if (isEdit) {
        await updateReply({ id: replyId, text: text.trim() });
      } else {
        await publishReply({
          id: replyId,
          text: text.trim(),
          recordId,
        });
        requestPostSubmitScroll({
          id: recordId,
          scope: 'record',
          target: 'end',
        });
      }

      sheetManager.close('reply-create');
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [replyId, hasContent, isEdit, recordId, sheetManager, text]);

  return (
    <Sheet
      className="xs:rounded-t-4xl rounded-t-2xl"
      loading={isEdit ? !editReply : !!recordId && !draft.id}
      onDismiss={() => {
        sheetManager.close('reply-create');
        setText('');
      }}
      open={sheetManager.isOpen('reply-create')}
      portalName="reply-create"
    >
      <ReplyCreateSheetForm
        hasContent={hasContent}
        isBusy={isBusy}
        isSubmitting={isSubmitting}
        logColor={logColor?.default}
        mediaPreview={mediaPreview}
        nativeComposerMaxHeight={nativeComposerMaxHeight}
        nativeTextareaStyle={nativeTextareaStyle}
        onChangeText={setText}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? 'Done' : 'Reply'}
        text={text}
        toolbar={toolbar}
      />
    </Sheet>
  );
};
