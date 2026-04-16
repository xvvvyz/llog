import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteReplyMedia } from '@/mutations/delete-reply-media';
import { publishReply } from '@/mutations/publish-reply';
import { updateReply } from '@/mutations/update-reply';
import { uploadReplyMedia } from '@/mutations/upload-reply-media';
import { useRecord } from '@/queries/use-record';
import { useReplyDraft } from '@/queries/use-reply-draft';
import { db } from '@/utilities/db';
import * as React from 'react';
import { View } from 'react-native';

export const ReplyCreateSheet = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [text, setText] = React.useState('');
  const sheetManager = useSheetManager();

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
  const hasContent = !!text.trim() || !!(reply?.media ?? []).length;

  React.useEffect(() => {
    if (isEdit && editReply?.text && isOpen) {
      setText(editReply.text);
    }
  }, [isEdit, editReply?.text, isOpen]);

  const handleUploadMedia = React.useCallback(
    async (
      asset: import('expo-image-picker').ImagePickerAsset,
      onProgress: (progress: number) => void,
      mediaId: string,
      order: number
    ) => {
      await uploadReplyMedia({
        asset,
        replyId,
        mediaId,
        onProgress,
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

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    replyId,
    isOpen,
    media: reply?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () =>
      sheetManager.open('record-audio', replyId, `reply:${recordId}`),
    onUploadMedia: handleUploadMedia,
    recordId,
  });

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
      }

      sheetManager.close('reply-create');
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [replyId, hasContent, isEdit, recordId, sheetManager, text]);

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={isEdit ? !editReply : !!recordId && !draft.id}
      onDismiss={() => {
        sheetManager.close('reply-create');
        setText('');
      }}
      open={sheetManager.isOpen('reply-create')}
      portalName="reply-create"
    >
      <View className="mx-auto w-full max-w-lg gap-3 p-4 pb-8 sm:pt-8">
        <View className="max-h-[40dvh] rounded-xl border border-border-secondary bg-input md:max-h-[60dvh]">
          <Textarea
            autoFocus
            className="border-0 bg-transparent"
            maxLength={10240}
            numberOfLines={16}
            onChangeText={setText}
            placeholder="Add a reply"
            value={text}
          />
          {mediaPreview}
        </View>
        <View className="flex-row justify-end gap-3">
          {toolbar}
          <Button
            disabled={isBusy || isSubmitting || !hasContent}
            onPress={handleSubmit}
            size="xs"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
          >
            <Text className="text-white">
              {isSubmitting ? 'Saving…' : isEdit ? 'Done' : 'Reply'}
            </Text>
          </Button>
        </View>
      </View>
    </Sheet>
  );
};
