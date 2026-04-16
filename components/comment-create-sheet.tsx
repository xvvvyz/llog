import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useLogColor } from '@/hooks/use-log-color';
import { useMediaComposer } from '@/hooks/use-media-composer';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { deleteCommentMedia } from '@/mutations/delete-comment-media';
import { publishComment } from '@/mutations/publish-comment';
import { updateComment } from '@/mutations/update-comment';
import { uploadCommentMedia } from '@/mutations/upload-comment-media';
import { useCommentDraft } from '@/queries/use-comment-draft';
import { useRecord } from '@/queries/use-record';
import { db } from '@/utilities/db';
import * as React from 'react';
import { View } from 'react-native';

export const CommentCreateSheet = () => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [text, setText] = React.useState('');
  const sheetManager = useSheetManager();

  const editRecordId = sheetManager.getContext('comment-create');
  const isEdit = !!editRecordId;
  const sheetId = sheetManager.getId('comment-create');

  const recordId = isEdit ? editRecordId : sheetId;
  const editCommentId = isEdit ? sheetId : undefined;

  const record = useRecord({ id: recordId });
  const logColor = useLogColor({ id: record.log?.id });
  const draft = useCommentDraft({ recordId: isEdit ? undefined : recordId });

  const { data: editData } = db.useQuery(
    editCommentId
      ? {
          comments: {
            $: { where: { id: editCommentId } },
            media: {},
          },
        }
      : null
  );

  const editComment = editData?.comments?.[0];
  const comment = isEdit ? editComment : draft;
  const commentId = comment?.id;

  const isOpen = sheetManager.isOpen('comment-create');
  const hasContent = !!text.trim() || !!(comment?.media ?? []).length;

  React.useEffect(() => {
    if (isEdit && editComment?.text && isOpen) {
      setText(editComment.text);
    }
  }, [isEdit, editComment?.text, isOpen]);

  const handleUploadMedia = React.useCallback(
    async (
      asset: import('expo-image-picker').ImagePickerAsset,
      onProgress: (progress: number) => void,
      mediaId: string,
      order: number
    ) => {
      await uploadCommentMedia({
        asset,
        commentId,
        mediaId,
        onProgress,
        order,
        recordId,
      });
    },
    [commentId, recordId]
  );

  const handleDeleteMedia = React.useCallback(
    async (mediaId: string) => {
      await deleteCommentMedia({ commentId, mediaId, recordId });
    },
    [commentId, recordId]
  );

  const { isBusy, mediaPreview, toolbar } = useMediaComposer({
    commentId,
    isOpen,
    media: comment?.media ?? [],
    onDeleteMedia: handleDeleteMedia,
    onOpenAudio: () =>
      sheetManager.open('record-audio', commentId, `comment:${recordId}`),
    onUploadMedia: handleUploadMedia,
    recordId,
  });

  const handleSubmit = React.useCallback(async () => {
    if (!hasContent || !commentId) return;

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await updateComment({ id: commentId, text: text.trim() });
      } else {
        await publishComment({
          id: commentId,
          text: text.trim(),
          recordId,
        });
      }

      sheetManager.close('comment-create');
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [commentId, hasContent, isEdit, recordId, sheetManager, text]);

  return (
    <Sheet
      className="rounded-t-2xl xs:rounded-t-4xl"
      loading={isEdit ? !editComment : !!recordId && !draft.id}
      onDismiss={() => {
        sheetManager.close('comment-create');
        setText('');
      }}
      open={sheetManager.isOpen('comment-create')}
      portalName="comment-create"
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
